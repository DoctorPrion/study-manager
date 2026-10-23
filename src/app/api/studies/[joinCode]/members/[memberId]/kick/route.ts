import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { fail, readJson, serverError } from "@/lib/http";
import { joinCodeSchema, memberIdSchema } from "@/lib/validation";

const bodySchema = z.object({ memberId: memberIdSchema });

/** 추방: 스터디장만 가능. 멤버·완료 기록(CASCADE)을 삭제하고 닉네임을 차단 목록에 올린다. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ joinCode: string; memberId: string }> },
) {
  const params = await ctx.params;
  const code = joinCodeSchema.safeParse(params.joinCode);
  if (!code.success) return fail(404, "스터디를 찾을 수 없습니다.");
  const target = memberIdSchema.safeParse(params.memberId);
  const body = bodySchema.safeParse(await readJson(req));
  if (!target.success || !body.success) return fail(400, "요청 형식이 올바르지 않습니다.");
  const requesterId = body.data.memberId;

  try {
    const studies = await query<{ id: number; owner_member_id: number | null }>(
      `SELECT id, owner_member_id FROM studies WHERE join_code = $1`,
      [code.data],
    );
    if (studies.length === 0) return fail(404, "스터디를 찾을 수 없습니다.");
    const study = studies[0];

    if (study.owner_member_id === null || study.owner_member_id !== requesterId) {
      return fail(403, "스터디장만 멤버를 추방할 수 있습니다.");
    }
    if (target.data === study.owner_member_id) {
      return fail(400, "스터디장은 추방할 수 없습니다.");
    }

    // 삭제와 차단 등록을 한 문장으로 처리해 둘 중 하나만 반영되는 일이 없게 한다.
    // 스터디장 조건을 여기서도 다시 걸어 검사~삭제 사이의 변경에 대비한다.
    const rows = await query<{ n: number }>(
      `WITH del AS (
         DELETE FROM members
          WHERE id = $1 AND study_id = $2 AND id <> $3
            AND EXISTS (SELECT 1 FROM studies WHERE id = $2 AND owner_member_id = $3)
          RETURNING id, nickname
       ), ins AS (
         INSERT INTO banned_nicknames (study_id, nickname, member_id)
         SELECT $2, nickname, id FROM del
         ON CONFLICT DO NOTHING
       )
       SELECT count(*)::int AS n FROM del`,
      [target.data, study.id, requesterId],
    );
    if (rows[0].n === 0) return fail(404, "이미 없는 멤버입니다.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
