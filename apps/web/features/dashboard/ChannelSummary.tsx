"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Store, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChannelBadge } from "@/components/patterns";
import { useConnectedChannels } from "@/lib/hooks";
import { formatNumber } from "@/lib/utils/format";

export function ChannelSummary() {
  const t = useTranslations("channels");
  const { data: channels, isLoading } = useConnectedChannels();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-text-tertiary" />
        </CardContent>
      </Card>
    );
  }

  if (!channels || channels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-6">
          <Store className="size-10 text-text-tertiary" />
          <p className="text-sm text-text-tertiary">{t("notConnected")}</p>
          <Link
            href="/channels"
            className="flex items-center gap-1 text-sm font-medium text-accent-iris hover:underline"
          >
            {t("connect")}
            <ArrowRight className="size-3.5" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t("title")}</CardTitle>
        <Link
          href="/channels"
          className="flex items-center gap-1 text-xs text-text-tertiary transition-colors hover:text-accent-iris"
        >
          {t("manage")}
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="flex items-center justify-between rounded-xl bg-bg-canvas px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <ChannelBadge code={ch.channel_type} />
                <span className="text-sm font-medium text-text-primary">{ch.channel_type}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] text-text-tertiary">{t("productCount")}</p>
                  <p className="font-mono text-sm font-semibold text-text-primary">
                    {formatNumber(ch.product_count)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-text-tertiary">{t("orderCount")}</p>
                  <p className="font-mono text-sm font-semibold text-text-primary">
                    {formatNumber(ch.order_count)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
