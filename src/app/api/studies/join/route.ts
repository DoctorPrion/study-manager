import { NextResponse } from "next/server";
import { isUniqueViolation, query } from "@/lib/db";
import { fail, readJson, serverError, zodFail } from "@/lib/http";
import { hashPin, verifyPin } from "@/lib/pin";
import { joinStudySchema } from "@/lib/validation";

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

interface MemberRow {
  id: number;
  nickname: string;
  pin_hash: string | null;
  locked: boolean | null;
}

/** 입장: 새 닉네임이면 등록, 기존 닉네임이면 PIN 확인 후 재입장. PIN 이 없는 기존 멤버는 첫 입장 때 PIN 을 등록한다. */
export async function POST(req: Request) {
  const body = await readJson(req);
  if (body === undefined) return fail(400, "요청 형식이 올바르지 않습니다.");
  const parsed = joinStudySchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);
  const { joinCode, nickname, pin } = parsed.data;

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

    const findMember = async () =>
      (
        await query<MemberRow>(
          `SELECT id, nickname, pin_hash, (pin_locked_until > now()) AS locked
             FROM members WHERE study_id = $1 AND lower(nickname) = lower($2)`,
          [study.id, nickname],
        )
      )[0];

    const respond = async (memberId: number, nick: string, status: number) => {
      const owner = await query(`SELECT 1 FROM studies WHERE id = $1 AND owner_member_id = $2`, [
        study.id,
        memberId,
      ]);
      return NextResponse.json(
        {
          memberId,
          nickname: nick,
          isOwner: owner.length > 0,
          study: { name: study.name, description: study.description, joinCode },
        },
        { status },
      );
    };

    const pinError = (message: string, status: number) => fail(status, message, { pin: message });

    let member = await findMember();

    // 새 닉네임 → (추방된 닉네임이면 거부) 새 멤버 등록
    if (!member) {
      const banned = await query(
        `SELECT 1 FROM banned_nicknames WHERE study_id = $1 AND lower(nickname) = lower($2)`,
        [study.id, nickname],
      );
      if (banned.length > 0) {
        return fail(403, "이 스터디에서 추방된 닉네임입니다.", {
          nickname: "이 스터디에서 추방된 닉네임입니다.",
        });
      }
      try {
        const rows = await query<{ id: number; nickname: string }>(
          `INSERT INTO members (study_id, nickname, pin_hash) VALUES ($1, $2, $3) RETURNING id, nickname`,
          [study.id, nickname, await hashPin(pin)],
        );
        // 스터디장이 비어 있으면(처음 입장한 멤버) 이 멤버가 스터디장. 조건부 UPDATE 라 동시 입장에도 한 명만 된다.
        await query(
          `UPDATE studies SET owner_member_id = $2 WHERE id = $1 AND owner_member_id IS NULL`,
          [study.id, rows[0].id],
        );
        return respond(rows[0].id, rows[0].nickname, 201);
      } catch (e) {
        if (!isUniqueViolation(e)) throw e;
        // 동시에 같은 닉네임이 등록됨 → 기존 멤버 흐름으로 처리
        member = await findMember();
        if (!member) throw e;
      }
    }

    // 기존 멤버, PIN 미등록 → 입력한 PIN 을 등록 (그 사이 누가 등록했다면 아래 검증으로 넘어간다)
    if (member.pin_hash === null) {
      const claimed = await query(
        `UPDATE members SET pin_hash = $2 WHERE id = $1 AND pin_hash IS NULL RETURNING id`,
        [member.id, await hashPin(pin)],
      );
      if (claimed.length > 0) return respond(member.id, member.nickname, 200);
      member = await findMember();
      if (!member || member.pin_hash === null) throw new Error("PIN 등록 실패");
    }

    // 기존 멤버, PIN 등록됨 → 잠금 확인 후 검증
    if (member.locked) {
      return pinError(
        `PIN을 여러 번 틀려 잠시 잠겼습니다. ${LOCK_MINUTES}분 뒤에 다시 시도해 주세요.`,
        429,
      );
    }
    if (await verifyPin(pin, member.pin_hash)) {
      await query(
        `UPDATE members SET pin_failed_count = 0, pin_locked_until = NULL
          WHERE id = $1 AND (pin_failed_count > 0 OR pin_locked_until IS NOT NULL)`,
        [member.id],
      );
      return respond(member.id, member.nickname, 200);
    }

    const failed = await query<{ locked: boolean | null }>(
      `UPDATE members
          SET pin_failed_count = CASE WHEN pin_failed_count + 1 >= $2 THEN 0 ELSE pin_failed_count + 1 END,
              pin_locked_until = CASE WHEN pin_failed_count + 1 >= $2
                                      THEN now() + make_interval(mins => $3) ELSE pin_locked_until END
        WHERE id = $1
        RETURNING (pin_locked_until > now()) AS locked`,
      [member.id, MAX_FAILS, LOCK_MINUTES],
    );
    if (failed[0]?.locked) {
      return pinError(`PIN을 ${MAX_FAILS}번 틀려 ${LOCK_MINUTES}분간 잠겼습니다.`, 429);
    }
    return pinError("PIN이 일치하지 않습니다.", 401);
  } catch (e) {
    return serverError(e);
  }
}
