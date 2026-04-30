"use client";

import { useLocale, useTranslations } from "next-intl";
import { Loader2, ShoppingCart, Package } from "lucide-react";
import { formatRelative } from "@/lib/utils/format";
import { useRecentActivity } from "@/lib/hooks";

const TYPE_ICONS: Record<string, typeof ShoppingCart> = {
  order: ShoppingCart,
  product: Package,
};

const KEY_MAP: Record<string, string> = {
  orderUpdated: "activityOrderUpdated",
  productUpdated: "activityProductUpdated",
};

export function RecentActivity() {
  const t = useTranslations("dashboard");
  const locale = useLocale() as "ko" | "en";
  const { data, isLoading } = useRecentActivity(10);

  const items = data?.items ?? [];

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6">
      <h3 className="mb-4 text-sm font-semibold text-text-primary">
        {t("recentActivity")}
      </h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-5 animate-spin text-text-tertiary" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t("noActivity")}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = TYPE_ICONS[item.type] ?? Package;
            const messageKey = item.title_key ? KEY_MAP[item.title_key] : undefined;
            const message = messageKey
              ? t(messageKey, item.params ?? {})
              : item.description;
            return (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-bg-surface-2"
              >
                <div className="flex items-center gap-3">
                  <Icon className="size-4 text-text-tertiary" />
                  <span className="text-sm text-text-secondary">{message}</span>
                </div>
                {item.timestamp && (
                  <span className="whitespace-nowrap text-xs text-text-tertiary">
                    {formatRelative(item.timestamp, locale)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
