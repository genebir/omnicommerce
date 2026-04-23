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

export type { InventoryItem };
