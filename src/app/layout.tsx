import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "스터디 매니저",
  description: "스터디의 과제와 진행 상황을 한 곳에서 관리하세요.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
