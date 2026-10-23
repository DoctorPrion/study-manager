import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { fail, readJson, serverError, zodFail } from "@/lib/http";
import { TASK_SELECT, toTask, type TaskRow } from "@/lib/tasks";
import { joinCodeSchema, taskSchema } from "@/lib/validation";

async function findStudyId(rawCode: string) {
  const code = joinCodeSchema.safeParse(rawCode);
  if (!code.success) return null;
  const rows = await query<{ id: number }>(`SELECT id FROM studies WHERE join_code = $1`, [
    code.data,
  ]);
  return rows[0]?.id ?? null;
}

export async function GET(req: Request, ctx: { params: Promise<{ joinCode: string }> }) {
  try {
    const studyId = await findStudyId((await ctx.params).joinCode);
    if (studyId === null) return fail(404, "스터디를 찾을 수 없습니다.");

    const memberId = Number(new URL(req.url).searchParams.get("memberId"));
    const [tasks, members, completions] = await Promise.all([
      query<TaskRow>(
        `SELECT ${TASK_SELECT} FROM tasks t WHERE t.study_id = $1 ORDER BY t.due_date, t.id`,
        [studyId, Number.isInteger(memberId) && memberId > 0 ? memberId : 0],
      ),
      query<{ total: number }>(`SELECT count(*)::int AS total FROM members WHERE study_id = $1`, [
        studyId,
      ]),
      query<{ task_id: number; member_id: number; date: string }>(
        `SELECT c.task_id, c.member_id,
                to_char(c.completed_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS date
           FROM completions c JOIN tasks t ON t.id = c.task_id
          WHERE t.study_id = $1
          ORDER BY c.completed_at`,
        [studyId],
      ),
    ]);

    return NextResponse.json({
      tasks: tasks.map(toTask),
      totalMembers: members[0].total,
      completions: completions.map((c) => ({
        taskId: c.task_id,
        memberId: c.member_id,
        date: c.date,
      })),
    });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ joinCode: string }> }) {
  const body = await readJson(req);
  if (body === undefined) return fail(400, "요청 형식이 올바르지 않습니다.");
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);

  try {
    const studyId = await findStudyId((await ctx.params).joinCode);
    if (studyId === null) return fail(404, "스터디를 찾을 수 없습니다.");

    const rows = await query<{ id: number }>(
      `INSERT INTO tasks (study_id, title, description, due_date)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [studyId, parsed.data.title, parsed.data.description, parsed.data.dueDate],
    );
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
