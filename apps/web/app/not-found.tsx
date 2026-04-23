import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-canvas">
      <p className="font-mono text-7xl font-bold text-text-tertiary">404</p>
      <p className="mt-4 text-lg text-text-secondary">
        페이지를 찾을 수 없습니다
      </p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-xl bg-accent-iris px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80"
      >
        대시보드로 돌아가기
      </Link>
    </div>
  );
}
