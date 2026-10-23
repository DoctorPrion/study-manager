import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { fail, readJson, serverError } from "@/lib/http";
import { joinCodeSchema, memberIdSchema } from "@/lib/validation";
import { z } from "zod";

export async function GET(req: Request, ctx: { params: Promise<{ joinCode: string }> }) {
  const code = joinCodeSchema.safeParse((await ctx.params).joinCode);
  if (!code.success) return fail(404, "스터디를 찾을 수 없습니다.");

  try {
    const studies = await query<{ id: number; name: string; description: string; owner_member_id: number | null }>(
      `SELECT id, name, description, owner_member_id FROM studies WHERE join_code = $1`,
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

    // 멤버가 없는데 추방 기록에 이 memberId 가 있으면, 추방된 사람의 화면이다.
    const kicked =
      !me && memberIdParam > 0
        ? (
            await query(`SELECT 1 FROM banned_nicknames WHERE study_id = $1 AND member_id = $2`, [
              study.id,
              memberIdParam,
            ])
          ).length > 0
        : false;

    return NextResponse.json({
      kicked,
      study: { name: study.name, description: study.description, joinCode: code.data },
      members: members.map((m) => ({
        id: m.id,
        nickname: m.nickname,
        completedCount: m.completed_count,
        isOwner: m.id === study.owner_member_id,
      })),
      totalTasks: totals[0].total,
      me: me ? { id: me.id, nickname: me.nickname, isOwner: me.id === study.owner_member_id } : null,
    });
  } catch (e) {
    return serverError(e);
  }
}

const deleteSchema = z.object({
  memberId: memberIdSchema,
  confirmName: z.string({ error: "스터디 이름을 입력해 주세요." }),
});

/** 스터디 삭제: 스터디장만 가능. 멤버·과제·완료 기록은 ON DELETE CASCADE 로 함께 삭제된다. */
export async function DELETE(req: Request, ctx: { params: Promise<{ joinCode: string }> }) {
  const code = joinCodeSchema.safeParse((await ctx.params).joinCode);
  if (!code.success) return fail(404, "삭제된 스터디이거나 존재하지 않습니다.");
  const body = await readJson(req);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return fail(400, "요청 형식이 올바르지 않습니다.");

  try {
    const studies = await query<{ id: number; name: string; owner_member_id: number | null }>(
      `SELECT id, name, owner_member_id FROM studies WHERE join_code = $1`,
      [code.data],
    );
    if (studies.length === 0) return fail(404, "삭제된 스터디이거나 존재하지 않습니다.");
    const study = studies[0];

    if (study.owner_member_id === null || study.owner_member_id !== parsed.data.memberId) {
      return fail(403, "스터디장만 스터디를 삭제할 수 있습니다.");
    }
    if (parsed.data.confirmName !== study.name) {
      return fail(400, "스터디 이름이 일치하지 않습니다.", {
        confirmName: "스터디 이름이 일치하지 않습니다.",
      });
    }

    // 스터디장 검사를 DELETE 조건에도 넣어 검사~삭제 사이의 변경에 대비한다.
    await query(`DELETE FROM studies WHERE id = $1 AND owner_member_id = $2`, [
      study.id,
      parsed.data.memberId,
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
