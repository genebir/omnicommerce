"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface InventoryItem {
  id: string;
  product_id: string;
  sku: string;
  warehouse_id: string;
  total_quantity: number;
  allocated: number;
  available: number;
}

export function useInventory() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const res = await api.get<InventoryItem[]>("/inventory");
      return {
        data: res.data,
        total: res.meta?.total ?? 0,
      };
    },
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      product_id: string;
      sku: string;
      warehouse_id: string;
      total_quantity: number;
    }) => api.put<InventoryItem>("/inventory", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

// ----- 재고 일괄 조정 -----

export interface BulkInventoryEditRequest {
  inventory_ids: string[];
  mode: "absolute" | "inc_amount";
  value: number;
  sync_channels?: boolean;
  channel_types?: string[];
}

export interface BulkInventoryItemResult {
  inventory_id: string;
  sku: string;
  old_total: number;
  new_total: number;
  old_available: number;
  new_available: number;
  channel_results: { channel_type: string; success: boolean; error?: string | null; requires_reconnect?: boolean }[];
}

export interface BulkInventoryEditResult {
  updated_count: number;
  sync_attempted: boolean;
  items: BulkInventoryItemResult[];
}

export function useBulkEditInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkInventoryEditRequest) =>
      api.patch<BulkInventoryEditResult>("/inventory/bulk", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export type { InventoryItem };
