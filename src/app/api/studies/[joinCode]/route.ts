import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { fail, serverError } from "@/lib/http";
import { joinCodeSchema } from "@/lib/validation";

export async function GET(req: Request, ctx: { params: Promise<{ joinCode: string }> }) {
  const code = joinCodeSchema.safeParse((await ctx.params).joinCode);
  if (!code.success) return fail(404, "스터디를 찾을 수 없습니다.");

  try {
    const studies = await query<{ id: number; name: string; description: string }>(
      `SELECT id, name, description FROM studies WHERE join_code = $1`,
      [code.data],
    );
    if (studies.length === 0) return fail(404, "스터디를 찾을 수 없습니다.");
    const study = studies[0];

    const [members, totals] = await Promise.all([
      query<{ id: number; nickname: string; completed_count: number }>(
        `SELECT m.id, m.nickname, count(c.task_id)::int AS completed_count
           FROM members m
           LEFT JOIN completions c ON c.member_id = m.id
          WHERE m.study_id = $1
          GROUP BY m.id
          ORDER BY m.id`,
        [study.id],
      ),
      query<{ total: number }>(`SELECT count(*)::int AS total FROM tasks WHERE study_id = $1`, [
        study.id,
      ]),
    ]);

    const memberIdParam = Number(new URL(req.url).searchParams.get("memberId"));
    const me = members.find((m) => m.id === memberIdParam);

    return NextResponse.json({
      study: { name: study.name, description: study.description, joinCode: code.data },
      members: members.map((m) => ({
        id: m.id,
        nickname: m.nickname,
        completedCount: m.completed_count,
      })),
      totalTasks: totals[0].total,
      me: me ? { id: me.id, nickname: me.nickname } : null,
    });
  } catch (e) {
    return serverError(e);
  }
}
