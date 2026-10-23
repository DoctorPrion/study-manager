"use client";

import { useState } from "react";
import { shortDate } from "@/lib/format";
import type { Completion, MemberProgress as Member, Task } from "@/types";

export function MemberProgress({
  members,
  totalTasks,
  tasks,
  completions,
  meId,
  onKick,
}: {
  members: Member[];
  totalTasks: number;
  tasks: Task[];
  completions: Completion[];
  meId: number;
  /** 있으면(스터디장 화면) 본인을 제외한 각 멤버 옆에 추방 버튼을 보여 준다. */
  onKick?: (member: Member) => void;
}) {
  // 펼침 상태는 이 컴포넌트가 들고 있다. 자동 갱신은 props 만 바꾸므로 접히지 않는다.
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <ul className="space-y-3">
      {members.map((m) => {
        const pct = totalTasks ? Math.round((m.completedCount / totalTasks) * 100) : 0;
        const isOpen = open.has(m.id);
        const doneDate = new Map(
          completions.filter((c) => c.memberId === m.id).map((c) => [c.taskId, c.date]),
        );
        return (
          <li key={m.id}>
            <div className="flex justify-between text-sm">
              <span className={m.id === meId ? "font-semibold text-indigo-700" : ""}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggle(m.id)}
                  className="hover:underline"
                  title="완료/미완료 과제 보기"
                >
                  {m.nickname}
                  {m.id === meId && " (나)"} {isOpen ? "▾" : "▸"}
                </button>
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
            {isOpen && (
              <div className="mt-2 grid gap-2 rounded-md bg-slate-50 p-2 text-xs sm:grid-cols-2">
                <div>
                  <p className="mb-1 font-medium text-emerald-700">완료</p>
                  <ul className="space-y-0.5">
                    {tasks.filter((t) => doneDate.has(t.id)).map((t) => (
                      <li key={t.id}>
                        {t.title}
                        <span className="text-slate-400"> ({shortDate(doneDate.get(t.id)!)})</span>
                      </li>
                    ))}
                    {doneDate.size === 0 && <li className="text-slate-400">없음</li>}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 font-medium text-red-600">미완료</p>
                  <ul className="space-y-0.5">
                    {tasks.filter((t) => !doneDate.has(t.id)).map((t) => (
                      <li key={t.id}>
                        {t.title}
                        {t.overdue && (
                          <span className="ml-1 rounded bg-red-100 px-1 py-0.5 font-medium text-red-700">
                            마감 지남
                          </span>
                        )}
                      </li>
                    ))}
                    {tasks.length === doneDate.size && <li className="text-slate-400">없음</li>}
                  </ul>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
