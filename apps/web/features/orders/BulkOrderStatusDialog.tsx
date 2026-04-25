"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChannelBadge } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBulkUpdateOrderStatus } from "@/lib/hooks";

// 전이 가능한 상태 목록 (CLAUDE.md §4 VALID_TRANSITIONS 미러)
const VALID_TRANSITIONS: Record<string, string[]> = {
  PAID: ["PREPARING", "CANCELED"],
  PREPARING: ["SHIPPED", "CANCELED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELED: [],
  REFUNDED: [],
};

const STATUS_LABELS: Record<string, string> = {
  PAID: "결제 완료",
  PREPARING: "상품 준비",
  SHIPPED: "배송 중",
  DELIVERED: "배송 완료",
  CANCELED: "취소",
  REFUNDED: "환불",
};

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-accent-iris/10 text-accent-iris",
  PREPARING: "bg-state-warn/10 text-state-warn",
  SHIPPED: "bg-accent-iris/10 text-accent-iris",
  DELIVERED: "bg-state-success/10 text-state-success",
  CANCELED: "bg-state-error/10 text-state-error",
  REFUNDED: "bg-text-tertiary/10 text-text-tertiary",
};

export interface OrderRow {
  id: string;
  orderNumber: string;
  channel: string;
  customerName: string | null;
  status: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedOrders: OrderRow[];
  onApplied?: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const color = STATUS_COLORS[status] ?? "bg-bg-surface-2 text-text-secondary";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

/** 선택된 주문들의 현재 상태 기준으로 공통 전이 가능 목표 상태 계산 */
function computeAvailableTargets(orders: OrderRow[]): string[] {
  if (orders.length === 0) return [];
  const allStatuses = [...new Set(orders.map((o) => o.status))];
  // 각 상태에서 가능한 다음 상태의 합집합 (union)
  const reachable = new Set<string>();
  for (const s of allStatuses) {
    for (const t of VALID_TRANSITIONS[s] ?? []) reachable.add(t);
  }
  return [...reachable];
}

export function BulkOrderStatusDialog({ open, onOpenChange, selectedOrders, onApplied }: Props) {
  const t = useTranslations("orders");
  const tc = useTranslations("common");
  const bulkUpdate = useBulkUpdateOrderStatus();

  const [targetStatus, setTargetStatus] = useState("");

  const availableTargets = computeAvailableTargets(selectedOrders);

  function handleOpenChange(next: boolean) {
    if (next) setTargetStatus("");
    onOpenChange(next);
  }

  const previews = selectedOrders.map((o) => ({
    order: o,
    allowed: targetStatus ? (VALID_TRANSITIONS[o.status] ?? []).includes(targetStatus) : null,
  }));

  const allowedCount = targetStatus ? previews.filter((p) => p.allowed).length : 0;
  const skippedCount = targetStatus ? previews.filter((p) => !p.allowed).length : 0;

  async function handleApply() {
    if (!targetStatus || allowedCount === 0) return;
    try {
      const res = await bulkUpdate.mutateAsync({
        order_ids: selectedOrders.map((o) => o.id),
        target_status: targetStatus,
      });
      const { updated_count, skipped_count } = res.data ?? { updated_count: 0, skipped_count: 0 };
      if (updated_count === 0) {
        toast.warning(t("bulkStatusNoneUpdated"));
      } else if (skipped_count > 0) {
        toast.success(t("bulkStatusPartial", { updated: updated_count, skipped: skipped_count }));
      } else {
        toast.success(t("bulkStatusApplied", { count: updated_count }));
      }
      onOpenChange(false);
      onApplied?.();
    } catch {
      toast.error("오류가 발생했습니다");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("bulkStatusTitle", { count: selectedOrders.length })}</DialogTitle>
        </DialogHeader>

        {/* 목표 상태 선택 */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-text-secondary">{t("bulkStatusSelectTarget")}</p>
          {availableTargets.length === 0 ? (
            <p className="text-sm text-state-error">{t("bulkStatusNoneUpdated")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableTargets.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTargetStatus(s)}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    targetStatus === s
                      ? "bg-accent-iris text-white"
                      : "border border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-surface-2"
                  }`}
                >
                  {STATUS_LABELS[s] ?? s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 미리보기 표 */}
        {targetStatus && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-secondary">{t("bulkStatusPreview")}</p>

            {skippedCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-state-warn/10 px-3 py-2 text-sm text-state-warn">
                <AlertCircle className="size-4 shrink-0" />
                <span>
                  {t("bulkStatusPartial", { updated: allowedCount, skipped: skippedCount })}
                </span>
              </div>
            )}

            <div className="rounded-xl border border-border-subtle overflow-hidden">
              <div className="grid grid-cols-[1fr_80px_120px_110px_110px] gap-0 border-b border-border-subtle bg-bg-surface-2 px-3 py-2 text-xs font-medium text-text-tertiary">
                <span>{t("bulkStatusColOrder")}</span>
                <span>{t("bulkStatusColChannel")}</span>
                <span>{t("bulkStatusColCustomer")}</span>
                <span>{t("bulkStatusColCurrent")}</span>
                <span>{t("bulkStatusColNext")}</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {previews.map(({ order, allowed }) => (
                  <div
                    key={order.id}
                    className={`grid grid-cols-[1fr_80px_120px_110px_110px] items-center gap-0 border-b border-border-subtle px-3 py-2.5 text-sm last:border-0 ${
                      allowed === false ? "opacity-50" : ""
                    }`}
                  >
                    <span className="font-mono text-xs text-text-secondary truncate">
                      {order.orderNumber}
                    </span>
                    <span>
                      <ChannelBadge code={order.channel} />
                    </span>
                    <span className="text-text-secondary truncate">
                      {order.customerName ?? "—"}
                    </span>
                    <span>
                      <StatusBadge status={order.status} />
                    </span>
                    <span>
                      {allowed ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="size-3.5 text-state-success" />
                          <StatusBadge status={targetStatus} />
                        </span>
                      ) : (
                        <span className="text-xs text-text-tertiary">
                          {t("bulkStatusNotAllowed")}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2"
          >
            {tc("cancel")}
          </button>
          <Button
            onClick={handleApply}
            disabled={!targetStatus || allowedCount === 0 || bulkUpdate.isPending}
            className="min-w-24"
          >
            {bulkUpdate.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              t("bulkStatusApply")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
