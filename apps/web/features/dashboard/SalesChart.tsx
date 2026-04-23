"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import { useSalesStats } from "@/lib/hooks";

function formatMonth(month: string): string {
  const m = parseInt(month.split("-")[1], 10);
  return `${m}월`;
}

const PERIOD_OPTIONS = [3, 6, 12] as const;

export function SalesChart() {
  const t = useTranslations("dashboard");
  const [months, setMonths] = useState<number>(6);
  const { data: salesData, isLoading } = useSalesStats(months);

  const chartData = salesData?.monthly?.map((item) => ({
    date: formatMonth(item.month),
    orders: item.orders,
    revenue: item.revenue,
  })) ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t("salesTrend")}</CardTitle>
        <select
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="cursor-pointer rounded-lg border border-border-subtle bg-bg-surface px-2 py-1 text-xs text-text-secondary focus:border-accent-iris focus:outline-none"
        >
          {PERIOD_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {t("periodMonths", { count: m })}
            </option>
          ))}
        </select>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-text-tertiary" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-text-tertiary">{t("noSalesData")}</p>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-iris)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent-iris)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-subtle)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}만`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "12px",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                }}
                formatter={(value) => [formatCurrency(Number(value)), t("revenue")]}
                labelStyle={{ color: "var(--text-secondary)" }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--accent-iris)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
