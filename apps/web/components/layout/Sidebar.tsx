"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Warehouse,
  Link2,
  Settings,
  Plus,
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
  X,
  SlidersHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLowStock, usePendingMatches, useSyncIssues } from "@/lib/hooks";

interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

type BadgeTone = "warn" | "error";

interface NavBadge {
  count: number;
  tone: BadgeTone;
  ariaLabel: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/products", labelKey: "products", icon: Package },
  { href: "/orders", labelKey: "orders", icon: ShoppingCart },
  { href: "/inventory", labelKey: "inventory", icon: Warehouse },
  { href: "/channels", labelKey: "channels", icon: Link2 },
  { href: "/settings", labelKey: "settings", icon: Settings },
  { href: "/admin/settings", labelKey: "adminSettings", icon: SlidersHorizontal },
];

const quickActions: NavItem[] = [
  { href: "/products/new", labelKey: "newProduct", icon: Plus },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onToggle, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  // 인증 후에만 의미 있는 카운트 — 미인증 상태에선 비어있어 안전.
  const { data: pendingMatches } = usePendingMatches();
  const { data: lowStock } = useLowStock(10, 100);
  const { data: syncIssues } = useSyncIssues();

  const pendingCount = pendingMatches?.length ?? 0;
  const lowStockCount = lowStock?.length ?? 0;
  const syncIssueCount = syncIssues?.total ?? 0;

  const badgesByHref: Record<string, NavBadge | undefined> = {
    "/products":
      pendingCount > 0
        ? {
            count: pendingCount,
            tone: "warn",
            ariaLabel: t("badgePendingMatches", { count: pendingCount }),
          }
        : undefined,
    "/inventory":
      lowStockCount > 0
        ? {
            count: lowStockCount,
            tone: "error",
            ariaLabel: t("badgeLowStock", { count: lowStockCount }),
          }
        : undefined,
    "/channels":
      syncIssueCount > 0
        ? {
            count: syncIssueCount,
            tone: "error",
            ariaLabel: t("badgeSyncIssues", { count: syncIssueCount }),
          }
        : undefined,
  };

  return (
    <>
      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border-subtle bg-bg-sidebar transition-all duration-200 ease-out",
          "max-lg:translate-x-[-100%] max-lg:w-60",
          mobileOpen && "max-lg:translate-x-0",
          collapsed ? "lg:w-16" : "lg:w-60",
        )}
      >
        {/* 워크스페이스 스위처 */}
        <div className="flex h-14 items-center justify-between border-b border-border-subtle px-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-iris font-mono text-xs font-bold text-text-primary">
              O
            </div>
            {(!collapsed || mobileOpen) && (
              <span className="truncate text-sm font-semibold text-text-primary">
                OmniCommerce
              </span>
            )}
          </div>
          {mobileOpen && (
            <button
              type="button"
              onClick={onMobileClose}
              className="cursor-pointer lg:hidden"
              aria-label="close"
            >
              <X className="size-5 text-text-tertiary" />
            </button>
          )}
        </div>

        {/* Primary Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const label = t(item.labelKey);
              const badge = badgesByHref[item.href];
              const showLabel = !collapsed || mobileOpen;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={collapsed && !mobileOpen ? label : undefined}
                    onClick={onMobileClose}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-bg-surface-2 text-text-primary"
                        : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent-iris" />
                    )}
                    <span className="relative shrink-0">
                      <item.icon className="size-5" />
                      {/* 접힌 상태: 아이콘 우상단에 점만 (숫자 없음) */}
                      {badge && !showLabel && (
                        <span
                          className={cn(
                            "absolute -right-0.5 -top-0.5 size-2 rounded-full ring-2 ring-bg-sidebar",
                            badge.tone === "error" ? "bg-state-error" : "bg-state-warn",
                          )}
                          aria-label={badge.ariaLabel}
                        />
                      )}
                    </span>
                    {showLabel && (
                      <>
                        <span className="flex-1">{label}</span>
                        {badge && (
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold",
                              badge.tone === "error"
                                ? "bg-state-error/15 text-state-error"
                                : "bg-state-warn/15 text-state-warn",
                            )}
                            aria-label={badge.ariaLabel}
                          >
                            {badge.count > 99 ? "99+" : badge.count}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* 빠른 작업 */}
          <div className="mt-6 border-t border-border-subtle pt-4">
            {(!collapsed || mobileOpen) && (
              <p className="mb-2 px-3 text-xs font-medium text-text-tertiary">
                {t("quickActions")}
              </p>
            )}
            <ul className="space-y-1">
              {quickActions.map((item) => {
                const label = t(item.labelKey);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed && !mobileOpen ? label : undefined}
                      onClick={onMobileClose}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-surface-2 hover:text-text-primary"
                    >
                      <item.icon className="size-5 shrink-0" />
                      {(!collapsed || mobileOpen) && <span>{label}</span>}
                    </Link>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  title={collapsed && !mobileOpen ? t("syncAll") : undefined}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-surface-2 hover:text-text-primary"
                >
                  <RefreshCw className="size-5 shrink-0" />
                  {(!collapsed || mobileOpen) && <span>{t("syncAll")}</span>}
                </button>
              </li>
            </ul>
          </div>
        </nav>

        {/* 하단: 접기 토글 (데스크톱만) */}
        <div className="hidden border-t border-border-subtle p-2 lg:block">
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
            title={collapsed ? t("expandSidebar") : t("collapseSidebar")}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-tertiary transition-colors hover:bg-bg-surface-2 hover:text-text-primary"
          >
            {collapsed ? (
              <PanelLeft className="size-5 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="size-5 shrink-0" />
                <span>{t("collapse")}</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
