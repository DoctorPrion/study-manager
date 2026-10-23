import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { generateJoinCode } from "@/lib/joinCode";
import { fail, readJson, serverError, zodFail } from "@/lib/http";
import { createStudySchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await readJson(req);
  if (body === undefined) return fail(400, "요청 형식이 올바르지 않습니다.");
  const parsed = createStudySchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);

  try {
    // 참여 코드가 겹치면 재생성 (최대 10회)
    for (let i = 0; i < 10; i++) {
      const rows = await query<{ join_code: string }>(
        `INSERT INTO studies (name, description, join_code)
         VALUES ($1, $2, $3)
         ON CONFLICT (join_code) DO NOTHING
         RETURNING join_code`,
        [parsed.data.name, parsed.data.description, generateJoinCode()],
      );
      if (rows.length > 0) {
        return NextResponse.json({ joinCode: rows[0].join_code }, { status: 201 });
      }
    }
    return fail(500, "참여 코드를 생성하지 못했습니다. 다시 시도해 주세요.");
  } catch (e) {
    return serverError(e);
  }
}
