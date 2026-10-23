import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function fail(status: number, message: string, fields?: Record<string, string>) {
  return NextResponse.json({ error: { message, fields } }, { status });
}

export function zodFail(err: ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  const first = Object.values(fields)[0] ?? "입력값이 올바르지 않습니다.";
  return fail(400, first, fields);
}

export async function readJson(req: Request): Promise<unknown | undefined> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

export function serverError(e: unknown) {
  console.error(e);
  return fail(500, "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
}
