"use client";

import { useMessages, useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ChannelBadge } from "@/components/patterns";
import { cn } from "@/lib/utils";

interface ChannelCardProps {
  code: string;
  name: string;
  icon: LucideIcon;
  connected: boolean;
  productCount?: number;
  orderCount?: number;
  onConnect: () => void;
  onDisconnect?: () => void;
  disconnecting?: boolean;
}

// 백엔드 channel_types.name은 한글 단일 컬럼이라 영어 모드에서도 한글로 노출됐음.
// 카탈로그 키가 있으면 우선 사용하고, 없으면 백엔드가 보낸 name으로 폴백한다.
const BRAND_KEY: Record<string, string> = {
  cafe24: "brandNameCafe24",
  naver: "brandNameNaver",
  coupang: "brandNameCoupang",
};

export function ChannelCard({
  code,
  name,
  icon: Icon,
  connected,
  productCount,
  orderCount,
  onConnect,
  onDisconnect,
  disconnecting,
}: ChannelCardProps) {
  const t = useTranslations("channels");
  const messages = useMessages() as Record<string, Record<string, unknown>>;
  const brandKey = BRAND_KEY[code];
  const brandName = brandKey && messages.channels?.[brandKey] ? t(brandKey) : name;

  return (
    <div className="flex flex-col rounded-2xl border border-border-subtle bg-bg-surface p-6 transition-colors hover:border-border-strong">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg-surface-2">
            <Icon className="size-5 text-text-secondary" />
          </div>
          <div className="min-w-0">
            <h3 className="break-words font-semibold leading-tight text-text-primary">{brandName}</h3>
            <ChannelBadge code={code} className="mt-1" />
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            connected
              ? "bg-state-success/15 text-state-success"
              : "bg-bg-surface-2 text-text-tertiary",
          )}
        >
          {connected ? t("connected") : t("notConnected")}
        </span>
      </div>

      <p className="mb-4 flex-1 text-sm text-text-tertiary">{t(code)}</p>

      {connected && (
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl bg-bg-canvas p-3">
          <div>
            <p className="text-xs text-text-tertiary">{t("productCount")}</p>
            <p className="font-mono text-lg font-bold text-text-primary">
              {productCount ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">{t("orderCount")}</p>
            <p className="font-mono text-lg font-bold text-text-primary">
              {orderCount ?? 0}
            </p>
          </div>
        </div>
      )}

      {connected ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onConnect}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border-subtle px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2"
          >
            {t("manage")}
            <ExternalLink className="size-3.5" />
          </button>
          {onDisconnect && (
            <button
              type="button"
              onClick={onDisconnect}
              disabled={disconnecting}
              className="cursor-pointer rounded-xl border border-state-error/30 px-3 py-2.5 text-sm font-medium text-state-error transition-colors hover:bg-state-error/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("disconnect")}
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent-iris px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80"
        >
          {t("connect")}
        </button>
      )}
    </div>
  );
}
