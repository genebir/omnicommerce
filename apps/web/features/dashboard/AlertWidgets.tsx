"use client";

import { AlertTriangle, ArrowRight, History, Loader2, Sparkles, Undo2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import {
  useLowStock,
  usePendingMatches,
  useRecentPriceBatches,
  useRevertPriceBatch,
} from "@/lib/hooks";

/**
 * 대시보드 상단 알림 위젯 묶음 — 매일 첫 화면에서 즉시 보임.
 * - 검토 대기 매칭 (있으면 강조)
 * - 재고 부족 (가용 ≤ 10)
 * - 최근 가격 변경 + 되돌리기
 */
export function AlertWidgets() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <PendingMatchesCard />
      <LowStockCard />
      <RecentPriceChangesCard />
    </div>
  );
}

// ----- 검토 대기 매칭 -----

function PendingMatchesCard() {
  const t = useTranslations("dashboardWidgets");
  const { data, isLoading } = usePendingMatches();
  const count = data?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-accent-iris" />
          {t("matchingTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SmallLoader />
        ) : count === 0 ? (
          <EmptyHint message={t("matchingEmpty")} />
        ) : (
          <Link
            href="/products/matching"
            className="group flex items-center justify-between gap-3 rounded-lg border border-state-warn/30 bg-state-warn/10 p-3 transition-colors hover:bg-state-warn/15"
          >
            <div>
              <p className="text-2xl font-bold text-state-warn">{count}</p>
              <p className="mt-0.5 text-xs text-text-secondary">{t("matchingHint")}</p>
            </div>
            <ArrowRight className="size-4 text-state-warn transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

// ----- 재고 부족 -----

function LowStockCard() {
  const t = useTranslations("dashboardWidgets");
  const { data, isLoading } = useLowStock(10, 5);
  const items = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4 text-state-error" />
          {t("lowStockTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SmallLoader />
        ) : items.length === 0 ? (
          <EmptyHint message={t("lowStockEmpty")} />
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <Link
                key={it.inventory_id}
                href={`/products/${it.product_id}`}
                className="group flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg-surface-2"
              >
                <div className="flex-1 truncate">
                  <p className="truncate text-sm text-text-primary">{it.product_name}</p>
                  <p className="font-mono text-[11px] text-text-tertiary">{it.sku}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-mono font-medium ${
                    it.available === 0
                      ? "bg-state-error/15 text-state-error"
                      : "bg-state-warn/15 text-state-warn"
                  }`}
                >
                  {it.available}
                </span>
              </Link>
            ))}
            <Link
              href="/inventory"
              className="block pt-2 text-right text-xs text-accent-iris hover:underline"
            >
              {t("seeAll")}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----- 최근 가격 변경 -----

function RecentPriceChangesCard() {
  const t = useTranslations("dashboardWidgets");
  const { data, isLoading } = useRecentPriceBatches(5);
  const revertBatch = useRevertPriceBatch();
  const items = data ?? [];

  function describeBatch(b: (typeof items)[number]) {
    if (b.change_mode === "absolute") return t("modeAbsolute", { value: formatCurrency(b.change_value ?? 0) });
    if (b.change_mode === "inc_amount") {
      const v = b.change_value ?? 0;
      return v >= 0 ? t("modeIncAmountUp", { value: formatCurrency(v) }) : t("modeIncAmountDown", { value: formatCurrency(Math.abs(v)) });
    }
    if (b.change_mode === "inc_percent") {
      const v = b.change_value ?? 0;
      return v >= 0 ? t("modeIncPercentUp", { value: v }) : t("modeIncPercentDown", { value: Math.abs(v) });
    }
    if (b.change_mode === "revert") return t("modeRevert");
    return t("modeOther");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4 text-text-secondary" />
          {t("priceHistoryTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SmallLoader />
        ) : items.length === 0 ? (
          <EmptyHint message={t("priceHistoryEmpty")} />
        ) : (
          <div className="space-y-2">
            {items.map((b) => (
              <div
                key={b.batch_id}
                className="flex items-start justify-between gap-3 rounded-lg px-2 py-1.5"
              >
                <div className="flex-1">
                  <p className="text-sm text-text-primary">
                    {describeBatch(b)}{" "}
                    <span className="text-xs text-text-tertiary">
                      ({t("productCount", { count: b.product_count })})
                    </span>
                  </p>
                  <p className="font-mono text-[11px] text-text-tertiary">
                    {b.created_at ? formatDateTime(b.created_at) : "—"}
                  </p>
                </div>
                {b.is_reverted ? (
                  <span className="shrink-0 rounded-full bg-bg-surface-2 px-2 py-0.5 text-[11px] text-text-tertiary">
                    {t("revertedBadge")}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={revertBatch.isPending}
                    onClick={async () => {
                      try {
                        await revertBatch.mutateAsync(b.batch_id);
                        toast.success(t("revertSuccess"));
                      } catch {
                        toast.error(t("revertError"));
                      }
                    }}
                    className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-text-tertiary transition-colors hover:bg-bg-surface-2 hover:text-state-warn disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={t("revertAction")}
                  >
                    <Undo2 className="size-3" />
                    {t("revertAction")}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----- 공통 -----

function SmallLoader() {
  return (
    <div className="flex items-center justify-center py-6">
      <Loader2 className="size-4 animate-spin text-text-tertiary" />
    </div>
  );
}

function EmptyHint({ message }: { message: string }) {
  return <p className="py-4 text-center text-xs text-text-tertiary">{message}</p>;
}
