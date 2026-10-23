import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { fail, readJson, serverError } from "@/lib/http";
import { idSchema, memberIdSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ taskId: string }> };

/** 멤버와 과제가 같은 스터디에 속하는지 확인 */
async function validate(ctx: Ctx, rawMemberId: unknown) {
  const taskId = idSchema.safeParse((await ctx.params).taskId);
  if (!taskId.success) return { error: fail(404, "과제를 찾을 수 없습니다.") };
  const memberId = memberIdSchema.safeParse(rawMemberId);
  if (!memberId.success) return { error: fail(400, "memberId가 올바르지 않습니다.") };

  const rows = await query(
    `SELECT 1 FROM tasks t JOIN members m ON m.study_id = t.study_id
      WHERE t.id = $1 AND m.id = $2`,
    [taskId.data, memberId.data],
  );
  if (rows.length === 0) {
    return { error: fail(404, "과제 또는 멤버를 찾을 수 없습니다. 다시 입장해 주세요.") };
  }
  return { taskId: taskId.data, memberId: memberId.data };
}

// 완료 체크 (멱등)
export async function PUT(req: Request, ctx: Ctx) {
  const body = await readJson(req);
  const raw = body && typeof body === "object" ? (body as { memberId?: unknown }).memberId : undefined;
  try {
    const v = await validate(ctx, raw);
    if ("error" in v) return v.error;
    await query(
      `INSERT INTO completions (member_id, task_id) VALUES ($1, $2)
       ON CONFLICT (member_id, task_id) DO NOTHING`,
      [v.memberId, v.taskId],
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}

// 완료 취소: memberId는 쿼리 파라미터로 받는다 (?memberId=)
export async function DELETE(req: Request, ctx: Ctx) {
  const raw = new URL(req.url).searchParams.get("memberId");
  try {
    const v = await validate(ctx, raw);
    if ("error" in v) return v.error;
    await query(`DELETE FROM completions WHERE member_id = $1 AND task_id = $2`, [
      v.memberId,
      v.taskId,
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
