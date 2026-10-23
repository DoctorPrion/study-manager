"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TaskForm, type TaskFormValues } from "@/components/TaskForm";
import { Card, ErrorMessage } from "@/components/ui";
import { api, jsonBody } from "@/lib/api";
import type { Task } from "@/types";

export default function EditTaskPage() {
  const { joinCode, taskId } = useParams<{ joinCode: string; taskId: string }>();
  const router = useRouter();
  const back = `/studies/${joinCode}`;
  const [initial, setInitial] = useState<TaskFormValues | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    api<{ task: Task }>(`/api/tasks/${taskId}`)
      .then(({ task }) =>
        setInitial({ title: task.title, description: task.description, dueDate: task.dueDate }),
      )
      .catch((e) => setLoadError(e.message));
  }, [taskId]);

  return (
    <div className="space-y-4">
      <Link href={back} className="text-sm text-indigo-600 hover:underline">
        ← 스터디로 돌아가기
      </Link>
      <Card>
        <h1 className="mb-4 text-xl font-semibold">과제 수정</h1>
        <ErrorMessage message={loadError} />
        {!initial && !loadError && <p className="text-sm text-slate-500">불러오는 중…</p>}
        {initial && (
          <TaskForm
            initial={initial}
            submitLabel="저장"
            onCancel={() => router.push(back)}
            onSubmit={async (v) => {
              await api(`/api/tasks/${taskId}`, { method: "PATCH", ...jsonBody(v) });
              router.push(back);
            }}
          />
        )}
      </Card>
    </div>
  );
}
