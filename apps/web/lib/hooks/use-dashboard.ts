"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface DashboardStats {
  total_products: number;
  total_orders: number;
  recent_orders: number;
  low_stock_count: number;
  pending_orders: number;
  sync_issue_count: number;
}

interface MonthlySales {
  month: string;
  orders: number;
  revenue: number;
}

interface SalesData {
  monthly: MonthlySales[];
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get<DashboardStats>("/dashboard/stats");
      return res.data;
    },
  });
}

export function useSalesStats(months = 7) {
  return useQuery({
    queryKey: ["dashboard-sales", months],
    queryFn: async () => {
      const res = await api.get<SalesData>(
        `/dashboard/sales?months=${months}`,
      );
      return res.data;
    },
  });
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

interface ActivityData {
  items: ActivityItem[];
}

export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: ["dashboard-activity", limit],
    queryFn: async () => {
      const res = await api.get<ActivityData>(
        `/dashboard/activity?limit=${limit}`,
      );
      return res.data;
    },
  });
}

export type { DashboardStats, MonthlySales, SalesData, ActivityItem, ActivityData };
