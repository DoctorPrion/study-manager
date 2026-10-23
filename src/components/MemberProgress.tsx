import type { MemberProgress as Member } from "@/types";

export function MemberProgress({
  members,
  totalTasks,
  meId,
  onKick,
}: {
  members: Member[];
  totalTasks: number;
  meId: number;
  /** 있으면(스터디장 화면) 본인을 제외한 각 멤버 옆에 추방 버튼을 보여 준다. */
  onKick?: (member: Member) => void;
}) {
  return (
    <ul className="space-y-3">
      {members.map((m) => {
        const pct = totalTasks ? Math.round((m.completedCount / totalTasks) * 100) : 0;
        return (
          <li key={m.id}>
            <div className="flex justify-between text-sm">
              <span className={m.id === meId ? "font-semibold text-indigo-700" : ""}>
                {m.nickname}
                {m.id === meId && " (나)"}
                {m.isOwner && (
                  <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                    스터디장
                  </span>
                )}
              </span>
              <span className="text-slate-500">
                {m.completedCount}/{totalTasks} · {pct}%
                {onKick && m.id !== meId && (
                  <button
                    className="ml-2 text-xs text-red-600 underline"
                    onClick={() => onKick(m)}
                  >
                    추방
                  </button>
                )}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
