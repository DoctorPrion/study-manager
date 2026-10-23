import { NextResponse } from "next/server";
import { isUniqueViolation, query } from "@/lib/db";
import { fail, readJson, serverError, zodFail } from "@/lib/http";
import { joinStudySchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await readJson(req);
  if (body === undefined) return fail(400, "요청 형식이 올바르지 않습니다.");
  const parsed = joinStudySchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);
  const { joinCode, nickname } = parsed.data;

  try {
    const studies = await query<{ id: number; name: string; description: string }>(
      `SELECT id, name, description FROM studies WHERE join_code = $1`,
      [joinCode],
    );
    if (studies.length === 0) {
      return fail(404, "해당 참여 코드의 스터디를 찾을 수 없습니다.", {
        joinCode: "해당 참여 코드의 스터디를 찾을 수 없습니다.",
      });
    }
    const study = studies[0];

    try {
      const rows = await query<{ id: number; nickname: string }>(
        `INSERT INTO members (study_id, nickname) VALUES ($1, $2) RETURNING id, nickname`,
        [study.id, nickname],
      );
      return NextResponse.json(
        {
          memberId: rows[0].id,
          nickname: rows[0].nickname,
          study: { name: study.name, description: study.description, joinCode },
        },
        { status: 201 },
      );
    } catch (e) {
      if (isUniqueViolation(e)) {
        return fail(409, "이미 사용 중인 닉네임입니다.", {
          nickname: "이미 사용 중인 닉네임입니다.",
        });
      }
      throw e;
    }
  } catch (e) {
    return serverError(e);
  }
}
