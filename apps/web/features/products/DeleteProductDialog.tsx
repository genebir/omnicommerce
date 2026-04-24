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

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productName: string;
  channelListings: ChannelListingInfo[];
  onConfirm: (channelTypes: string[]) => void;
  loading: boolean;
}

/**
 * 상품 삭제 다이얼로그.
 * - 사용자에게 연결된 모든 채널을 체크박스로 표시.
 * - 이 상품에 listing이 있는 채널만 체크 가능, 없는 채널은 disabled.
 * - 기본값은 모두 미체크 — 체크 안 하면 내부 DB에서만 삭제, 채널은 그대로 유지.
 */
export function DeleteProductDialog({
  open,
  onOpenChange,
  productName,
  channelListings,
  onConfirm,
  loading,
}: Props) {
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const { data: connectedChannels } = useConnectedChannels();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleOpenChange = (next: boolean) => {
    // 다이얼로그가 열릴 때마다 체크 상태 초기화
    if (next && !open) setSelected(new Set());
    onOpenChange(next);
  };

  const listingMap = new Map(channelListings.map((cl) => [cl.channel_type, cl]));
  const channels = connectedChannels ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-state-error">{t("deleteTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-text-secondary">
            <span className="font-medium text-text-primary">{productName}</span>
            {t("deleteConfirmSuffix")}
          </p>

          {channels.length > 0 ? (
            <div className="space-y-3 rounded-xl border border-border-subtle bg-bg-surface-2 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                {t("deleteChannelLabel")}
              </p>
              <div className="space-y-2">
                {channels.map((ch) => {
                  const listing = listingMap.get(ch.channel_type);
                  const linked = !!listing;
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
                      {linked ? (
                        <span className="font-mono text-xs text-text-tertiary">
                          #{listing.external_id}
                        </span>
                      ) : (
                        <span className="text-xs text-text-tertiary">
                          {t("deleteChannelNotLinked")}
                        </span>
                      )}
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
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
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
