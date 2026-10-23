"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { TaskForm } from "@/components/TaskForm";
import { Card } from "@/components/ui";
import { api, jsonBody } from "@/lib/api";

export default function NewTaskPage() {
  const { joinCode } = useParams<{ joinCode: string }>();
  const router = useRouter();
  const back = `/studies/${joinCode}`;

  return (
    <div className="space-y-4">
      <Link href={back} className="text-sm text-indigo-600 hover:underline">
        ← 스터디로 돌아가기
      </Link>
      <Card>
        <h1 className="mb-4 text-xl font-semibold">과제 추가</h1>
        <TaskForm
          submitLabel="추가"
          onCancel={() => router.push(back)}
          onSubmit={async (v) => {
            await api(`/api/studies/${joinCode}/tasks`, { method: "POST", ...jsonBody(v) });
            router.push(back);
          }}
        />
      </Card>
    </div>
  );
}
