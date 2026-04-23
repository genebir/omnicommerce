"use client";

import { useTranslations } from "next-intl";
import { Loader2, ShoppingCart, Package } from "lucide-react";
import { formatRelative } from "@/lib/utils/format";
import { useRecentActivity } from "@/lib/hooks";

const TYPE_ICONS: Record<string, typeof ShoppingCart> = {
  order: ShoppingCart,
  product: Package,
};

export function RecentActivity() {
  const t = useTranslations("dashboard");
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
            return (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-bg-surface-2"
              >
                <div className="flex items-center gap-3">
                  <Icon className="size-4 text-text-tertiary" />
                  <span className="text-sm text-text-secondary">
                    {item.description}
                  </span>
                </div>
                {item.timestamp && (
                  <span className="whitespace-nowrap text-xs text-text-tertiary">
                    {formatRelative(item.timestamp)}
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
