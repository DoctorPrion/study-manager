import { neon } from "@neondatabase/serverless";

let client: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다.");
    client = neon(url);
  }
  return client;
}

/** 쿼리 결과를 행 배열로 받는 헬퍼 (태그드 템플릿 대신 파라미터 배열 사용) */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const rows = await getSql().query(text, params);
  return rows as T[];
}

/** Postgres unique violation (23505) 여부 */
export function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}
