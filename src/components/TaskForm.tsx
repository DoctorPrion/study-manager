"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { Button, ErrorMessage, Field, Input, Textarea } from "./ui";

export interface TaskFormValues {
  title: string;
  description: string;
  dueDate: string;
}

export function TaskForm({
  initial = { title: "", description: "", dueDate: "" },
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: TaskFormValues;
  submitLabel: string;
  onSubmit: (v: TaskFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (k: keyof TaskFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await onSubmit(values);
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
      <Field label="제목" error={fields.title}>
        <Input value={values.title} onChange={set("title")} maxLength={100} />
      </Field>
      <Field label="설명 (선택)" error={fields.description}>
        <Textarea value={values.description} onChange={set("description")} maxLength={1000} />
      </Field>
      <Field label="마감일" error={fields.dueDate}>
        <Input type="date" value={values.dueDate} onChange={set("dueDate")} />
      </Field>
      <ErrorMessage message={error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "저장 중…" : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          취소
        </Button>
      </div>
    </form>
  );
}
