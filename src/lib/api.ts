export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError("네트워크 오류가 발생했습니다. 연결을 확인해 주세요.", 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      data?.error?.message ?? "요청을 처리하지 못했습니다.",
      res.status,
      data?.error?.fields ?? {},
    );
  }
  return data as T;
}

export const jsonBody = (v: unknown): RequestInit => ({ body: JSON.stringify(v) });
