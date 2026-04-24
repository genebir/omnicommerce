"use client";

import { Loader2, Undo2, History, ArrowDown, ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { useProductPriceHistory, useRevertPriceBatch } from "@/lib/hooks";

interface Props {
  productId: string;
}

export function PriceHistoryCard({ productId }: Props) {
  const t = useTranslations("priceHistory");
  const { data, isLoading } = useProductPriceHistory(productId);
  const revertBatch = useRevertPriceBatch();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-text-tertiary" />
        </CardContent>
      </Card>
    );
  }

  const items = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-tertiary">{t("empty")}</p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {items.map((h) => {
              const diff = (h.new_value ?? 0) - (h.old_value ?? 0);
              const isUp = diff > 0;
              const isReverted = !!h.reverted_at;
              const isRevertItself = h.change_mode === "revert";

              return (
                <div key={h.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-text-secondary">
                        {h.field === "price" ? t("fieldPrice") : t("fieldCostPrice")}
                      </span>
                      {isRevertItself && (
                        <span className="rounded-full bg-bg-surface-2 px-2 py-0.5 text-text-tertiary">
                          {t("revertBadge")}
                        </span>
                      )}
                      {isReverted && !isRevertItself && (
                        <span className="rounded-full bg-state-warn/10 px-2 py-0.5 text-state-warn">
                          {t("revertedBadge")}
                        </span>
                      )}
                      <span className="font-mono text-text-tertiary">
                        {h.created_at ? formatDateTime(h.created_at) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-text-tertiary line-through">
                        {h.old_value !== null ? formatCurrency(h.old_value) : "—"}
                      </span>
                      <ArrowDown className="size-3 -rotate-90 text-text-tertiary" />
                      <span className="font-mono font-medium text-text-primary">
                        {formatCurrency(h.new_value)}
                      </span>
                      {diff !== 0 && (
                        <span
                          className={`inline-flex items-center gap-0.5 text-xs ${
                            isUp ? "text-state-success" : "text-state-error"
                          }`}
                        >
                          {isUp ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                          {formatCurrency(Math.abs(diff))}
                        </span>
                      )}
                    </div>
                  </div>

                  {!isReverted && !isRevertItself && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={revertBatch.isPending}
                      onClick={async () => {
                        try {
                          await revertBatch.mutateAsync(h.batch_id);
                          toast.success(t("revertSuccess"));
                        } catch {
                          toast.error(t("revertError"));
                        }
                      }}
                    >
                      <Undo2 className="mr-1.5 size-3.5" />
                      {t("revertAction")}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
