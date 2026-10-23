import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { fail, readJson, serverError, zodFail } from "@/lib/http";
import { TASK_SELECT, toTask, type TaskRow } from "@/lib/tasks";
import { idSchema, taskSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ taskId: string }> };

async function parseId(ctx: Ctx) {
  const id = idSchema.safeParse((await ctx.params).taskId);
  return id.success ? id.data : null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const id = await parseId(ctx);
  if (id === null) return fail(404, "과제를 찾을 수 없습니다.");
  try {
    const rows = await query<TaskRow>(`SELECT ${TASK_SELECT} FROM tasks t WHERE t.id = $1`, [
      id,
      0,
    ]);
    if (rows.length === 0) return fail(404, "과제를 찾을 수 없습니다.");
    return NextResponse.json({ task: toTask(rows[0]) });
  } catch (e) {
    return serverError(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  const id = await parseId(ctx);
  if (id === null) return fail(404, "과제를 찾을 수 없습니다.");
  const body = await readJson(req);
  if (body === undefined) return fail(400, "요청 형식이 올바르지 않습니다.");
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);

  try {
    const rows = await query(
      `UPDATE tasks SET title = $2, description = $3, due_date = $4 WHERE id = $1 RETURNING id`,
      [id, parsed.data.title, parsed.data.description, parsed.data.dueDate],
    );
    if (rows.length === 0) return fail(404, "과제를 찾을 수 없습니다.");
    return NextResponse.json({ id });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const id = await parseId(ctx);
  if (id === null) return fail(404, "과제를 찾을 수 없습니다.");
  try {
    const rows = await query(`DELETE FROM tasks WHERE id = $1 RETURNING id`, [id]);
    if (rows.length === 0) return fail(404, "과제를 찾을 수 없습니다.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
