"use client";

import Link from "next/link";
import { useState } from "react";
import { shortDate } from "@/lib/format";
import type { Completion, MemberProgress, Task } from "@/types";
import { Button } from "./ui";

export function TaskItem({
  task,
  totalMembers,
  members,
  completions,
  joinCode,
  onToggle,
  onDelete,
}: {
  task: Task;
  totalMembers: number;
  members: MemberProgress[];
  /** 이 과제의 완료 기록 */
  completions: Completion[];
  joinCode: string;
  onToggle: (task: Task) => Promise<void>;
  onDelete: (task: Task) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [open, setOpen] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  const pct = totalMembers ? Math.round((task.completedCount / totalMembers) * 100) : 0;
  const late = task.overdue && !task.doneByMe;

  const doneDate = new Map(completions.map((c) => [c.memberId, c.date]));
  const doneMembers = members.flatMap((m) => {
    const date = doneDate.get(m.id);
    return date ? [{ m, date }] : [];
  });
  const notDone = members.filter((m) => !doneDate.has(m.id));

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          aria-label={`${task.title} 완료`}
          checked={task.doneByMe}
          disabled={busy}
          onChange={() => run(() => onToggle(task))}
          className="mt-1 h-5 w-5 cursor-pointer accent-indigo-600"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`font-semibold ${task.doneByMe ? "text-slate-400 line-through" : ""}`}
            >
              {task.title}
            </h3>
            <span className="text-xs text-slate-500">마감 {task.dueDate}</span>
            {late && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                마감 지남
              </span>
            )}
          </div>
          {task.description && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{task.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
            </div>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="text-xs text-slate-500 hover:text-slate-800 hover:underline"
              title="누가 했는지 보기"
            >
              완료 {task.completedCount}/{totalMembers}명 {open ? "▾" : "▸"}
            </button>
          </div>
          {open && (
            <div className="mt-2 space-y-1 rounded-md bg-slate-50 p-2 text-xs">
              <p>
                <span className="font-medium text-emerald-700">완료: </span>
                {doneMembers.length === 0
                  ? "없음"
                  : doneMembers.map(({ m, date }, i) => (
                      <span key={m.id}>
                        {i > 0 && ", "}
                        {m.nickname}
                        <span className="text-slate-400"> ({shortDate(date)})</span>
                      </span>
                    ))}
              </p>
              <p>
                <span className="font-medium text-red-600">미완료: </span>
                {notDone.length === 0 ? "없음" : notDone.map((m) => m.nickname).join(", ")}
              </p>
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Link
            href={`/studies/${joinCode}/tasks/${task.id}/edit`}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
          >
            수정
          </Link>
          {confirming ? (
            <>
              <Button
                variant="danger"
                className="!px-2 !py-1 !text-xs"
                disabled={busy}
                onClick={() => run(() => onDelete(task))}
              >
                삭제 확인
              </Button>
              <Button
                variant="secondary"
                className="!px-2 !py-1 !text-xs"
                onClick={() => setConfirming(false)}
              >
                취소
              </Button>
            </>
          ) : (
            <Button
              variant="danger"
              className="!px-2 !py-1 !text-xs"
              onClick={() => setConfirming(true)}
            >
              삭제
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
