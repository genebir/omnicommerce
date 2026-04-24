"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  Sparkles,
  SplitSquareHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChannelBadge } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency } from "@/lib/utils/format";
import {
  useConfirmMatch,
  useDeclineMatch,
  usePendingMatches,
  type MatchCandidateInfo,
  type PendingMatchItem,
} from "@/lib/hooks";

function scoreBadge(score: number) {
  // 80+ 강한 매칭, 60~79 약한 매칭
  if (score >= 80) return "bg-state-success/15 text-state-success";
  if (score >= 60) return "bg-state-warn/15 text-state-warn";
  return "bg-bg-surface-2 text-text-tertiary";
}

export function MatchingList() {
  const t = useTranslations("matching");
  const tc = useTranslations("common");
  const { data, isLoading, error } = usePendingMatches();
  const confirmMatch = useConfirmMatch();
  const declineMatch = useDeclineMatch();
  const [declineTarget, setDeclineTarget] = useState<PendingMatchItem | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-tertiary" />
      </div>
    );
  }
  if (error) {
    return (
      <p className="py-12 text-center text-sm text-state-error">{t("loadError")}</p>
    );
  }

  const items = data ?? [];

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <CheckCircle2 className="size-12 text-state-success" />
          <p className="text-sm font-medium text-text-primary">{t("emptyTitle")}</p>
          <p className="text-xs text-text-tertiary">{t("emptyHint")}</p>
        </CardContent>
      </Card>
    );
  }

  async function handleConfirm(item: PendingMatchItem, productId: string) {
    await confirmMatch.mutateAsync({ listingId: item.listing_id, productId });
    toast.success(t("confirmSuccess"));
  }

  async function handleDecline(item: PendingMatchItem) {
    await declineMatch.mutateAsync(item.listing_id);
    setDeclineTarget(null);
    toast.success(t("declineSuccess"));
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-bg-surface-2 p-4">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-accent-iris" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-text-primary">{t("guideTitle", { count: items.length })}</p>
            <p className="text-text-secondary">{t("guideDesc")}</p>
          </div>
        </div>

        {items.map((item) => (
          <MatchingCard
            key={item.listing_id}
            item={item}
            confirming={confirmMatch.isPending}
            onConfirm={(productId) => handleConfirm(item, productId)}
            onDecline={() => setDeclineTarget(item)}
          />
        ))}
      </div>

      <ConfirmDialog
        open={!!declineTarget}
        onOpenChange={(v) => !v && setDeclineTarget(null)}
        title={t("declineTitle")}
        description={t("declineConfirm")}
        confirmLabel={t("declineAction")}
        cancelLabel={tc("cancel")}
        loading={declineMatch.isPending}
        onConfirm={() => declineTarget && handleDecline(declineTarget)}
      />
    </>
  );
}

function MatchingCard({
  item,
  confirming,
  onConfirm,
  onDecline,
}: {
  item: PendingMatchItem;
  confirming: boolean;
  onConfirm: (productId: string) => void;
  onDecline: () => void;
}) {
  const t = useTranslations("matching");

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        {/* 헤더 — 채널 정보 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ChannelBadge code={item.channel_type} />
            <span className="font-mono text-xs text-text-tertiary">#{item.external_id}</span>
          </div>
          {item.external_url && (
            <a
              href={item.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-text-tertiary hover:text-accent-iris"
            >
              {t("viewOnChannel")}
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>

        {/* 자동 매칭된 마스터 */}
        <div className="rounded-xl border border-border-subtle bg-bg-canvas p-4">
          <div className="mb-2 flex items-center gap-2">
            <Link2 className="size-4 text-accent-iris" />
            <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              {t("autoMatched")}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${scoreBadge(item.current_match.score)}`}
            >
              {t("matchScore", { score: item.current_match.score })}
            </span>
          </div>
          <ProductRow info={item.current_match} primary />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => onConfirm(item.current_match.product_id)}
              disabled={confirming}
            >
              {confirming ? <Loader2 className="size-4 animate-spin" /> : t("confirmCurrent")}
            </Button>
            <Button variant="ghost" size="sm" onClick={onDecline}>
              <SplitSquareHorizontal className="mr-1.5 size-4" />
              {t("declineAction")}
            </Button>
          </div>
        </div>

        {/* 다른 후보 */}
        {item.candidates.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              {t("otherCandidates")}
            </p>
            <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle">
              {item.candidates.map((c) => (
                <div key={c.product_id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <ProductRow info={c} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onConfirm(c.product_id)}
                    disabled={confirming}
                  >
                    {t("pickThis")}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProductRow({ info, primary = false }: { info: MatchCandidateInfo; primary?: boolean }) {
  const t = useTranslations("matching");
  return (
    <div className="flex flex-1 items-center gap-3">
      <div className="flex-1 space-y-1">
        <Link
          href={`/products/${info.product_id}`}
          className={`truncate text-sm hover:underline ${
            primary ? "font-medium text-text-primary" : "text-text-secondary"
          }`}
        >
          {info.name}
        </Link>
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <span className="font-mono">{info.sku}</span>
          <span>·</span>
          <span className="font-mono">{formatCurrency(info.price)}</span>
        </div>
      </div>
      {!primary && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${scoreBadge(info.score)}`}
        >
          {t("matchScore", { score: info.score })}
        </span>
      )}
    </div>
  );
}
