"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useAuthStore } from "@/stores/auth";

interface AdminOnlyGateProps {
  children: ReactNode;
}

/**
 * `is_superuser=true` 사용자에게만 children을 렌더한다.
 *
 * 페이즈 8에서 백엔드는 이미 403으로 차단했지만, 프론트엔드에서도 사전 차단해
 * 사이드바 가드(페이즈 17)를 우회한 직접 접근(URL 입력·북마크) 시 깔끔한 안내 페이지를
 * 보여준다. localStorage hydrate 전 깜빡임을 막기 위해 hydrate 전에는 로딩 스켈레톤.
 */
export function AdminOnlyGate({ children }: AdminOnlyGateProps) {
  const t = useTranslations("admin");
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isSuperuser = useAuthStore((s) => s.user?.is_superuser ?? false);

  if (!isHydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" aria-hidden>
        <div className="size-8 animate-pulse rounded-full bg-bg-surface-2" />
      </div>
    );
  }

  if (!isSuperuser) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-border-subtle bg-bg-surface px-8 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-state-warning/15 text-state-warning">
          <ShieldAlert className="size-6" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary">{t("noAccessTitle")}</h2>
        <p className="text-sm text-text-tertiary">{t("noAccessDesc")}</p>
        <Link
          href="/dashboard"
          className="mt-2 inline-flex cursor-pointer items-center rounded-xl bg-accent-iris px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80"
        >
          {t("backToDashboard")}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
