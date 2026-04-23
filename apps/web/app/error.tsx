"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-canvas">
      <p className="font-mono text-5xl font-bold text-state-error">오류</p>
      <p className="mt-4 text-lg text-text-secondary">
        문제가 발생했습니다
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-xl bg-accent-iris px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80"
      >
        다시 시도
      </button>
    </div>
  );
}
