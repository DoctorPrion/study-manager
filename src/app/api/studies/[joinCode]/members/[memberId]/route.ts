import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { fail, serverError } from "@/lib/http";
import { joinCodeSchema, memberIdSchema } from "@/lib/validation";

/** 멤버 나가기: 일반 멤버만 가능. 완료 기록은 completions 의 ON DELETE CASCADE 로 함께 삭제된다. */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ joinCode: string; memberId: string }> },
) {
  const params = await ctx.params;
  const code = joinCodeSchema.safeParse(params.joinCode);
  if (!code.success) return fail(404, "스터디를 찾을 수 없습니다.");
  const memberId = memberIdSchema.safeParse(params.memberId);
  if (!memberId.success) return fail(400, "memberId가 올바르지 않습니다.");

  try {
    const studies = await query<{ id: number; owner_member_id: number | null }>(
      `SELECT id, owner_member_id FROM studies WHERE join_code = $1`,
      [code.data],
    );
    if (studies.length === 0) return fail(404, "스터디를 찾을 수 없습니다.");
    const study = studies[0];

    if (study.owner_member_id === memberId.data) {
      return fail(403, "스터디장은 나갈 수 없습니다. 스터디를 삭제해 주세요.");
    }

    const rows = await query(
      `DELETE FROM members WHERE id = $1 AND study_id = $2 RETURNING id`,
      [memberId.data, study.id],
    );
    if (rows.length === 0) return fail(404, "이미 나간 멤버입니다.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
