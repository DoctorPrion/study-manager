export interface Session {
  memberId: number;
  nickname: string;
}

const key = (joinCode: string) => `study-manager:session:${joinCode.toUpperCase()}`;

export function loadSession(joinCode: string): Session | null {
  try {
    const raw = localStorage.getItem(key(joinCode));
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (typeof s?.memberId === "number" && typeof s?.nickname === "string") return s;
  } catch {}
  return null;
}

export function saveSession(joinCode: string, s: Session) {
  try {
    localStorage.setItem(key(joinCode), JSON.stringify(s));
  } catch {}
}

export function clearSession(joinCode: string) {
  try {
    localStorage.removeItem(key(joinCode));
  } catch {}
}
