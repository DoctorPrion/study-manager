"use client";

import { useState } from "react";
import { api, ApiError, jsonBody } from "@/lib/api";
import { Button, ErrorMessage, Field, Input, Textarea } from "./ui";
import { JoinStudyForm } from "./JoinStudyForm";

export function CreateStudyForm({ onJoined }: { onJoined: (joinCode: string) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const r = await api<{ joinCode: string }>("/api/studies", {
        method: "POST",
        ...jsonBody({ name, description }),
      });
      setCreatedCode(r.joinCode);
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        setError(Object.keys(err.fields).length ? null : err.message);
      } else setError("알 수 없는 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  // 생성 직후: 참여 코드를 보여 주고 닉네임을 입력해 바로 입장
  if (createdCode) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-indigo-50 p-4 text-center">
          <p className="text-sm text-slate-600">스터디가 만들어졌어요. 참여 코드를 공유하세요.</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-[0.3em] text-indigo-700">
            {createdCode}
          </p>
        </div>
        <JoinStudyForm initialCode={createdCode} codeFixed onJoined={onJoined} />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="스터디 이름" error={fields.name}>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
      </Field>
      <Field label="설명 (선택)" error={fields.description}>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
        />
      </Field>
      <ErrorMessage message={error} />
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "만드는 중…" : "스터디 만들기"}
      </Button>
    </form>
  );
}
