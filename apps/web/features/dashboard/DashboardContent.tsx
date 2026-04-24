"use client";

import { useState, useEffect } from "react";
import { Package, ShoppingCart, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { OnboardingWizard, OnboardingChecklist } from "@/features/onboarding";
import { AlertWidgets } from "./AlertWidgets";
import { StatCard } from "./StatCard";
import { RecentActivity } from "./RecentActivity";
import { SalesChart } from "./SalesChart";
import { ChannelSummary } from "./ChannelSummary";
import { useDashboardStats } from "@/lib/hooks";

const ONBOARDING_DONE_KEY = "omni:onboarding-done";

export function DashboardContent() {
  const t = useTranslations("dashboard");
  const [showWizard, setShowWizard] = useState(false);
  const { data: stats, isLoading } = useDashboardStats();

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_DONE_KEY)) {
      // 클라이언트 hydration 직후 1회만 결정 — localStorage는 SSR 불가하므로 effect 불가피.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowWizard(true);
    }
  }, []);

  const statCards = [
    { key: "totalProducts" as const, icon: Package, value: stats?.total_products ?? 0 },
    { key: "newOrders" as const, icon: ShoppingCart, value: stats?.total_orders ?? 0 },
    { key: "lowStock" as const, icon: AlertTriangle, value: stats?.low_stock_count ?? 0 },
    { key: "pendingSync" as const, icon: RefreshCw, value: 0 },
  ];

  return (
    <>
      <OnboardingWizard
        open={showWizard}
        onComplete={() => {
          localStorage.setItem(ONBOARDING_DONE_KEY, "1");
          setShowWizard(false);
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-text-tertiary" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat) => (
                <StatCard
                  key={stat.key}
                  label={t(stat.key)}
                  value={stat.value}
                  icon={stat.icon}
                />
              ))}
            </div>
          )}

          <AlertWidgets />
          <SalesChart />
          <ChannelSummary />
          <RecentActivity />
        </div>

        <div>
          <OnboardingChecklist />
        </div>
      </div>
    </>
  );
}
