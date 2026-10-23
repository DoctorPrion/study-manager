"use client";

import { useState } from "react";
import { api, ApiError, jsonBody } from "@/lib/api";
import { saveSession } from "@/lib/session";
import { Button, ErrorMessage, Field, Input } from "./ui";

interface JoinResult {
  memberId: number;
  nickname: string;
  study: { joinCode: string };
}

/** codeFixed 이면 참여 코드 입력란을 고정한다. */
export function JoinStudyForm({
  initialCode = "",
  codeFixed = false,
  onJoined,
}: {
  initialCode?: string;
  codeFixed?: boolean;
  onJoined: (joinCode: string) => void;
}) {
  const [joinCode, setJoinCode] = useState(initialCode);
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const r = await api<JoinResult>("/api/studies/join", {
        method: "POST",
        ...jsonBody({ joinCode, nickname }),
      });
      saveSession(r.study.joinCode, { memberId: r.memberId, nickname: r.nickname });
      onJoined(r.study.joinCode);
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        setError(Object.keys(err.fields).length ? null : err.message);
      } else setError("알 수 없는 오류가 발생했습니다.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="참여 코드" error={fields.joinCode}>
        <Input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="ABC123"
          disabled={codeFixed}
          className="font-mono uppercase tracking-widest"
        />
      </Field>
      <Field label="닉네임" error={fields.nickname}>
        <Input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={20}
          placeholder="스터디에서 사용할 이름"
        />
      </Field>
      <ErrorMessage message={error} />
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "입장 중…" : "입장하기"}
      </Button>
    </form>
  );
}
