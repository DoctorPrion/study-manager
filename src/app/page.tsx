"use client";

import { useRouter } from "next/navigation";
import { CreateStudyForm } from "@/components/CreateStudyForm";
import { JoinStudyForm } from "@/components/JoinStudyForm";
import { Card } from "@/components/ui";

export default function HomePage() {
  const router = useRouter();
  const go = (code: string) => router.push(`/studies/${code}`);

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold">스터디 매니저</h1>
        <p className="mt-2 text-slate-600">과제·일정과 진행 상황을 한 곳에서 관리하세요.</p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">스터디 만들기</h2>
          <CreateStudyForm onJoined={go} />
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">참여 코드로 입장</h2>
          <JoinStudyForm onJoined={go} />
        </Card>
      </div>
    </div>
  );
}
