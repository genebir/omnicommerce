"use client";

import { AlertTriangle, RefreshCw, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChannelBadge } from "@/components/patterns";
import { useSyncIssues, useResyncProduct } from "@/lib/hooks";
import { formatDate } from "@/lib/utils/format";

const STATUS_LABELS: Record<string, string> = {
  FAILED: "실패",
  STALE: "정보 불일치",
  PENDING: "대기 중",
};

const STATUS_COLORS: Record<string, string> = {
  FAILED: "text-state-error bg-state-error/10",
  STALE: "text-state-warn bg-state-warn/10",
  PENDING: "text-text-tertiary bg-bg-surface-2",
};

function ResyncButton({ productId, channelType, onDone }: { productId: string; channelType: string; onDone: () => void }) {
  const t = useTranslations("products");
  const resync = useResyncProduct(productId);

  return (
    <button
      type="button"
      disabled={resync.isPending}
      onClick={async () => {
        try {
          const res = await resync.mutateAsync(channelType);
          if (res.data?.success) {
            toast.success(t("resyncSuccess", { channel: channelType }));
            onDone();
          } else {
            toast.error(res.data?.error ?? t("resyncError"));
          }
        } catch {
          toast.error(t("resyncError"));
        }
      }}
      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent-iris/50 hover:text-accent-iris disabled:cursor-not-allowed disabled:opacity-50"
    >
      {resync.isPending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <RefreshCw className="size-3" />
      )}
      재동기화
    </button>
  );
}

export function SyncIssuePanel() {
  const t = useTranslations("channels");
  const { data, isLoading, refetch } = useSyncIssues();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-text-tertiary" />
      </div>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-subtle bg-bg-surface py-12 text-center">
        <CheckCircle2 className="size-10 text-state-success" />
        <p className="text-sm font-medium text-text-primary">{t("syncAllGood")}</p>
        <p className="text-xs text-text-tertiary">{t("syncAllGoodDesc")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl bg-state-warn/10 px-4 py-2.5">
        <AlertTriangle className="size-4 text-state-warn" />
        <span className="text-sm text-state-warn">
          {t("syncIssueCount", { count: items.length })}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface">
        <div className="grid grid-cols-[1fr_80px_90px_auto] gap-0 border-b border-border-subtle bg-bg-surface-2 px-4 py-2 text-xs font-medium text-text-tertiary">
          <span>{t("syncColProduct")}</span>
          <span>{t("syncColChannel")}</span>
          <span>{t("syncColStatus")}</span>
          <span />
        </div>

        <div className="divide-y divide-border-subtle">
          {items.map((item) => (
            <div
              key={`${item.product_id}-${item.channel_type}`}
              className="grid grid-cols-[1fr_80px_90px_auto] items-center gap-0 px-4 py-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/products/${item.product_id}?tab=channels`}
                  className="block truncate text-sm font-medium text-text-primary hover:text-accent-iris transition-colors"
                >
                  {item.product_name}
                </Link>
                <p className="mt-0.5 font-mono text-xs text-text-tertiary">{item.sku}</p>
                {item.last_error && (
                  <p className="mt-0.5 truncate text-xs text-state-error" title={item.last_error}>
                    {item.last_error}
                  </p>
                )}
              </div>

              <span>
                <ChannelBadge code={item.channel_type} />
              </span>

              <span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.sync_status] ?? "text-text-tertiary bg-bg-surface-2"}`}
                >
                  {STATUS_LABELS[item.sync_status] ?? item.sync_status}
                </span>
              </span>

              <div className="flex items-center gap-2 pl-2">
                <Link
                  href={`/products/${item.product_id}?tab=channels`}
                  className="rounded-lg p-1.5 text-text-tertiary transition-colors hover:text-accent-iris"
                  aria-label="상품 상세 보기"
                >
                  <ExternalLink className="size-3.5" />
                </Link>
                <ResyncButton
                  productId={item.product_id}
                  channelType={item.channel_type}
                  onDone={() => refetch()}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {data && data.total > 0 && (
        <p className="text-right text-xs text-text-tertiary">
          {t("syncIssueLastUpdated", { date: formatDate(new Date().toISOString()) })}
        </p>
      )}
    </div>
  );
}
