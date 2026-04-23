"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface CheckItem {
  id: string;
  labelKey: string;
  href: string;
  completed: boolean;
}

const defaultItems: CheckItem[] = [
  { id: "connect", labelKey: "checkConnectChannel", href: "/channels", completed: false },
  { id: "product", labelKey: "checkAddProduct", href: "/products", completed: false },
  { id: "sync", labelKey: "checkSyncData", href: "/channels", completed: false },
  { id: "orders", labelKey: "checkExploreOrders", href: "/orders", completed: false },
  { id: "inventory", labelKey: "checkSetInventory", href: "/inventory", completed: false },
  { id: "team", labelKey: "checkInviteTeam", href: "/settings", completed: false },
];

export function OnboardingChecklist() {
  const t = useTranslations("onboarding");
  const [collapsed, setCollapsed] = useState(false);
  const [items] = useState<CheckItem[]>(defaultItems);

  const completed = items.filter((i) => i.completed).length;
  const total = items.length;

  if (completed === total) return null;

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface">
      {/* 헤더 */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between px-6 py-4"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-text-primary">
            {t("getStarted")}
          </h3>
          <span className="rounded-full bg-accent-iris/15 px-2.5 py-0.5 text-xs font-medium text-accent-iris">
            {t("progress", { completed, total })}
          </span>
        </div>
        {collapsed ? (
          <ChevronDown className="size-4 text-text-tertiary" />
        ) : (
          <ChevronUp className="size-4 text-text-tertiary" />
        )}
      </button>

      {/* 진행 바 */}
      <div className="mx-6 mb-2 h-1 overflow-hidden rounded-full bg-border-strong">
        <div
          className="h-full rounded-full bg-accent-iris transition-all"
          style={{ width: `${(completed / total) * 100}%` }}
        />
      </div>

      {/* 체크리스트 항목 */}
      {!collapsed && (
        <ul className="px-4 pb-4 pt-2">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  item.completed
                    ? "text-text-tertiary line-through"
                    : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border",
                    item.completed
                      ? "border-state-success bg-state-success/15 text-state-success"
                      : "border-border-strong",
                  )}
                >
                  {item.completed && <Check className="size-3" />}
                </span>
                {t(item.labelKey)}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
