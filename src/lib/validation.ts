import { z } from "zod";

const isRealDate = (s: string) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

export const joinCodeSchema = z
  .string({ error: "참여 코드를 입력해 주세요." })
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/, "참여 코드는 영문·숫자 6자리입니다.");

export const nicknameSchema = z
  .string({ error: "닉네임을 입력해 주세요." })
  .trim()
  .min(1, "닉네임을 입력해 주세요.")
  .max(20, "닉네임은 20자 이하로 입력해 주세요.");

export const createStudySchema = z.object({
  name: z
    .string({ error: "스터디 이름을 입력해 주세요." })
    .trim()
    .min(1, "스터디 이름을 입력해 주세요.")
    .max(50, "스터디 이름은 50자 이하로 입력해 주세요."),
  description: z
    .string()
    .trim()
    .max(500, "설명은 500자 이하로 입력해 주세요.")
    .default(""),
});

export const joinStudySchema = z.object({
  joinCode: joinCodeSchema,
  nickname: nicknameSchema,
});

export const taskSchema = z.object({
  title: z
    .string({ error: "제목을 입력해 주세요." })
    .trim()
    .min(1, "제목을 입력해 주세요.")
    .max(100, "제목은 100자 이하로 입력해 주세요."),
  description: z
    .string()
    .trim()
    .max(1000, "설명은 1000자 이하로 입력해 주세요.")
    .default(""),
  dueDate: z
    .string({ error: "마감일을 입력해 주세요." })
    .refine(isRealDate, "마감일을 올바른 날짜(YYYY-MM-DD)로 입력해 주세요."),
});

export const memberIdSchema = z.coerce
  .number({ error: "memberId가 올바르지 않습니다." })
  .int("memberId가 올바르지 않습니다.")
  .positive("memberId가 올바르지 않습니다.");

export const idSchema = z.coerce.number().int().positive();
