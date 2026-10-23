"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { JoinStudyForm } from "@/components/JoinStudyForm";
import { MemberProgress } from "@/components/MemberProgress";
import { TaskItem } from "@/components/TaskItem";
import { Button, Card, ErrorMessage, Input } from "@/components/ui";
import { api, ApiError, jsonBody } from "@/lib/api";
import { clearSession, loadSession } from "@/lib/session";
import type { MemberProgress as MemberProgressType, StudyDetail, Task, TaskList } from "@/types";

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

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const inFlight = useRef(false);
  const wasReady = useRef(false);
  const leaving = useRef(false); // 내가 직접 나가기/삭제 중이면 "삭제된 스터디" 안내를 띄우지 않는다

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
        if (detail.kicked && !leaving.current) {
          leaving.current = true;
          clearSession(joinCode);
          alert("스터디에서 추방되었습니다.");
          router.push("/");
          return;
        }
        clearSession(joinCode);
        setState({ status: "needJoin" });
        return;
      }
      const list = await api<TaskList>(`/api/studies/${joinCode}/tasks?memberId=${detail.me.id}`);
      wasReady.current = true;
      const next = { status: "ready" as const, detail: { ...detail, me: detail.me }, list };
      setState((prev) =>
        // 내용이 같으면 기존 state를 유지해 불필요한 리렌더를 막는다.
        prev.status === "ready" && JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
      );
    } catch (e) {
      // 보고 있던 스터디가 삭제됨 (다른 멤버가 스터디장이 삭제한 경우)
      if (e instanceof ApiError && e.status === 404 && wasReady.current && !leaving.current) {
        leaving.current = true;
        clearSession(joinCode);
        alert("삭제된 스터디입니다.");
        router.push("/");
        return;
      }
      if (background) return;
      setState({
        status: "error",
        message: e instanceof ApiError ? e.message : "불러오지 못했습니다.",
      });
    } finally {
      if (background) inFlight.current = false;
    }
  }, [joinCode, router]);

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

  async function leave() {
    if (!confirm("스터디에서 나갈까요? 내 완료 기록이 모두 삭제되며 되돌릴 수 없습니다.")) return;
    setActionError(null);
    try {
      await api(`/api/studies/${joinCode}/members/${me.id}`, { method: "DELETE" });
    } catch (e) {
      // 이미 나간 멤버/삭제된 스터디라면 그대로 정리하고 나간다.
      if (!(e instanceof ApiError && e.status === 404)) {
        setActionError(e instanceof ApiError ? e.message : "나가지 못했습니다.");
        return;
      }
    }
    leaving.current = true;
    clearSession(joinCode);
    router.push("/");
  }

  async function deleteStudy(e: React.FormEvent) {
    e.preventDefault();
    setDeleting(true);
    setActionError(null);
    try {
      await api(`/api/studies/${joinCode}`, {
        method: "DELETE",
        ...jsonBody({ memberId: me.id, confirmName }),
      });
      leaving.current = true;
      clearSession(joinCode);
      router.push("/");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "삭제하지 못했습니다.");
      setDeleting(false);
    }
  }

  async function kick(target: MemberProgressType) {
    if (
      !confirm(
        `${target.nickname}님을 추방할까요? 완료 기록이 삭제되고 같은 닉네임으로 다시 입장할 수 없습니다.`,
      )
    )
      return;
    setActionError(null);
    try {
      await api(`/api/studies/${joinCode}/members/${target.id}/kick`, {
        method: "POST",
        ...jsonBody({ memberId: me.id }),
      });
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "추방하지 못했습니다.");
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
          {me.isOwner ? (
            <span className="text-xs text-slate-500">
              스터디장은 나갈 수 없어요. 스터디 삭제만 가능합니다.
            </span>
          ) : (
            <button className="text-xs text-slate-500 underline" onClick={leave}>
              나가기
            </button>
          )}
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
                members={members}
                completions={list.completions.filter((c) => c.taskId === t.id)}
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
        <MemberProgress
          members={members}
          totalTasks={totalTasks}
          tasks={list.tasks}
          completions={list.completions}
          meId={me.id}
          onKick={me.isOwner ? kick : undefined}
        />
      </Card>

      {me.isOwner && (
        <Card className="border-red-200">
          <h2 className="mb-1 text-lg font-semibold text-red-700">스터디 삭제</h2>
          <p className="mb-3 text-sm text-slate-600">
            스터디와 모든 멤버·과제·완료 기록이 영구 삭제됩니다.
          </p>
          {deleteOpen ? (
            <form onSubmit={deleteStudy} className="space-y-3">
              <p className="text-sm">
                확인을 위해 스터디 이름 <b>{study.name}</b> 을(를) 그대로 입력해 주세요.
              </p>
              <Input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={study.name}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant="danger"
                  disabled={deleting || confirmName !== study.name}
                >
                  {deleting ? "삭제 중…" : "영구 삭제"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setDeleteOpen(false);
                    setConfirmName("");
                  }}
                >
                  취소
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              스터디 삭제
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
