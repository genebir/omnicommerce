"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChannelBadge } from "@/components/patterns/ChannelBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConnectedChannels, type ChannelListingInfo } from "@/lib/hooks";

interface SelectedProduct {
  id: string;
  channel_listings: ChannelListingInfo[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedProducts: SelectedProduct[];
  onConfirm: (channelTypes: string[]) => void;
  loading: boolean;
}

/**
 * 상품 일괄 삭제 다이얼로그.
 * - 사용자에게 연결된 모든 채널을 표시.
 * - 선택된 상품들 중 어디라도 listing이 있는 채널은 활성, 어디에도 없으면 disabled.
 * - 채널별로 "이 채널에 등록된 N개" 카운트 표시.
 * - 기본은 모두 미체크 — 체크하지 않으면 내부 DB만 삭제, 채널은 보존.
 */
export function BulkDeleteProductsDialog({
  open,
  onOpenChange,
  selectedProducts,
  onConfirm,
  loading,
}: Props) {
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const { data: connectedChannels } = useConnectedChannels();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleOpenChange = (next: boolean) => {
    if (next && !open) setSelected(new Set());
    onOpenChange(next);
  };

  // 선택 상품들의 channel_type별 카운트 (이 채널에 listing을 가진 상품 수)
  const channelCounts = new Map<string, number>();
  for (const p of selectedProducts) {
    const seen = new Set<string>();
    for (const cl of p.channel_listings) {
      if (seen.has(cl.channel_type)) continue;
      seen.add(cl.channel_type);
      channelCounts.set(cl.channel_type, (channelCounts.get(cl.channel_type) ?? 0) + 1);
    }
  }
  const channels = connectedChannels ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-state-error">{t("bulkDeleteTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-text-secondary">
            {t("bulkDeleteConfirm", { count: selectedProducts.length })}
          </p>

          {channels.length > 0 ? (
            <div className="space-y-3 rounded-xl border border-border-subtle bg-bg-surface-2 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                {t("deleteChannelLabel")}
              </p>
              <div className="space-y-2">
                {channels.map((ch) => {
                  const count = channelCounts.get(ch.channel_type) ?? 0;
                  const linked = count > 0;
                  return (
                    <label
                      key={ch.channel_type}
                      className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${
                        linked
                          ? "cursor-pointer hover:bg-bg-surface"
                          : "cursor-not-allowed opacity-50"
                      }`}
                    >
                      <Checkbox
                        checked={selected.has(ch.channel_type)}
                        disabled={!linked}
                        onCheckedChange={(checked) => {
                          if (!linked) return;
                          const next = new Set(selected);
                          if (checked) next.add(ch.channel_type);
                          else next.delete(ch.channel_type);
                          setSelected(next);
                        }}
                      />
                      <ChannelBadge code={ch.channel_type} />
                      <span className="text-xs text-text-tertiary">
                        {linked
                          ? t("bulkDeleteChannelCount", { count })
                          : t("deleteChannelNotLinked")}
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-text-tertiary">{t("deleteChannelHint")}</p>
            </div>
          ) : (
            <p className="rounded-xl border border-border-subtle bg-bg-surface-2 px-4 py-3 text-xs text-text-tertiary">
              {t("deleteChannelNoConnected")}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(Array.from(selected))}
            disabled={loading}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : tc("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
