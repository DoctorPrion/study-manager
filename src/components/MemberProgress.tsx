import type { MemberProgress as Member } from "@/types";

export function MemberProgress({
  members,
  totalTasks,
  meId,
}: {
  members: Member[];
  totalTasks: number;
  meId: number;
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
              </span>
              <span className="text-slate-500">
                {m.completedCount}/{totalTasks} · {pct}%
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
