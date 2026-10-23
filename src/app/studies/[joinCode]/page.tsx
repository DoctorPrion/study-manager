"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { JoinStudyForm } from "@/components/JoinStudyForm";
import { MemberProgress } from "@/components/MemberProgress";
import { TaskItem } from "@/components/TaskItem";
import { Card, ErrorMessage } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { clearSession, loadSession } from "@/lib/session";
import type { StudyDetail, Task, TaskList } from "@/types";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "needJoin" }
  | { status: "ready"; detail: StudyDetail & { me: NonNullable<StudyDetail["me"]> }; list: TaskList };

export default function StudyPage() {
  const params = useParams<{ joinCode: string }>();
  const joinCode = params.joinCode.toUpperCase();
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inFlight = useRef(false);

  // background=true: 자동 갱신. 로딩/에러 화면으로 바꾸지 않고, 실패하면 기존 화면을 유지한다.
  const load = useCallback(async (background = false) => {
    if (background) {
      if (inFlight.current) return;
      inFlight.current = true;
    }
    try {
      const session = loadSession(joinCode);
      const detail = await api<StudyDetail>(
        `/api/studies/${joinCode}?memberId=${session?.memberId ?? 0}`,
      );
      if (!detail.me) {
        clearSession(joinCode);
        setState({ status: "needJoin" });
        return;
      }
      const list = await api<TaskList>(`/api/studies/${joinCode}/tasks?memberId=${detail.me.id}`);
      const next = { status: "ready" as const, detail: { ...detail, me: detail.me }, list };
      setState((prev) =>
        // 내용이 같으면 기존 state를 유지해 불필요한 리렌더를 막는다.
        prev.status === "ready" && JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
      );
    } catch (e) {
      if (background) return;
      setState({
        status: "error",
        message: e instanceof ApiError ? e.message : "불러오지 못했습니다.",
      });
    } finally {
      if (background) inFlight.current = false;
    }
  }, [joinCode]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") load(true);
    };
    const timer = setInterval(refresh, 10_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  if (state.status === "loading") return <p className="text-slate-500">불러오는 중…</p>;

  if (state.status === "error") {
    return (
      <div className="space-y-4">
        <ErrorMessage message={state.message} />
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          ← 첫 화면으로
        </Link>
      </div>
    );
  }

  if (state.status === "needJoin") {
    return (
      <div className="mx-auto max-w-sm space-y-4">
        <Card>
          <h1 className="mb-1 text-lg font-semibold">닉네임을 정하고 입장하세요</h1>
          <p className="mb-4 text-sm text-slate-500">참여 코드 {joinCode}</p>
          <JoinStudyForm initialCode={joinCode} codeFixed onJoined={() => load()} />
        </Card>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          ← 첫 화면으로
        </Link>
      </div>
    );
  }

  const { detail, list } = state;
  const { study, me, members, totalTasks } = detail;

  async function toggle(task: Task) {
    setActionError(null);
    try {
      if (task.doneByMe) {
        await api(`/api/tasks/${task.id}/completion?memberId=${me.id}`, { method: "DELETE" });
      } else {
        await api(`/api/tasks/${task.id}/completion`, {
          method: "PUT",
          body: JSON.stringify({ memberId: me.id }),
        });
      }
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "처리하지 못했습니다.");
    }
    await load();
  }

  async function remove(task: Task) {
    setActionError(null);
    try {
      await api(`/api/tasks/${task.id}`, { method: "DELETE" });
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "삭제하지 못했습니다.");
    }
    await load();
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(study.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          ← 첫 화면
        </Link>
        <h1 className="text-2xl font-bold">{study.name}</h1>
        {study.description && (
          <p className="whitespace-pre-wrap text-slate-600">{study.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-sm text-slate-600">
          <span>
            참여 코드{" "}
            <button
              onClick={copyCode}
              className="rounded bg-slate-200 px-2 py-0.5 font-mono font-semibold tracking-widest hover:bg-slate-300"
              title="클릭해서 복사"
            >
              {study.joinCode}
            </button>
            {copied && <span className="ml-1 text-emerald-600">복사됨</span>}
          </span>
          <span>
            내 닉네임 <b>{me.nickname}</b>
          </span>
          <button
            className="text-xs text-slate-500 underline"
            onClick={() => {
              clearSession(joinCode);
              router.push("/");
            }}
          >
            나가기
          </button>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">과제 ({list.tasks.length})</h2>
          <Link
            href={`/studies/${joinCode}/tasks/new`}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + 과제 추가
          </Link>
        </div>
        <ErrorMessage message={actionError} />
        {list.tasks.length === 0 ? (
          <Card>
            <p className="text-center text-sm text-slate-500">
              아직 과제가 없어요. 첫 과제를 추가해 보세요.
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {list.tasks.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                totalMembers={list.totalMembers}
                joinCode={joinCode}
                onToggle={toggle}
                onDelete={remove}
              />
            ))}
          </ul>
        )}
      </section>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">멤버별 진행률</h2>
        <MemberProgress members={members} totalTasks={totalTasks} meId={me.id} />
      </Card>
    </div>
  );
}
