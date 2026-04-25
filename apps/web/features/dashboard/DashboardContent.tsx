"use client";

import { useState, useEffect } from "react";
import { Package, ShoppingCart, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { OnboardingWizard, OnboardingChecklist } from "@/features/onboarding";
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
      setShowWizard(true);
    }
  }, []);

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
              <StatCard
                label={t("totalProducts")}
                value={stats?.total_products ?? 0}
                icon={Package}
                href="/products"
              />
              <StatCard
                label={t("newOrders")}
                value={stats?.pending_orders ?? 0}
                icon={ShoppingCart}
                href="/orders?status=PAID"
                urgent
              />
              <StatCard
                label={t("lowStock")}
                value={stats?.low_stock_count ?? 0}
                icon={AlertTriangle}
                href="/inventory?lowStock=true"
                urgent
              />
              <StatCard
                label={t("pendingSync")}
                value={stats?.sync_issue_count ?? 0}
                icon={RefreshCw}
                href="/channels"
                urgent
              />
            </div>
          )}

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
