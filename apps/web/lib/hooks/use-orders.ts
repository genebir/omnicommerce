"use client";

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface Order {
  id: string;
  channel_type: string;
  external_order_id: string;
  buyer_name: string | null;
  total_amount: number;
  shipping_fee: number;
  status: string;
  ordered_at: string | null;
}

interface OrderItemDetail {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sku: string | null;
  option_text: string | null;
  product_id: string | null;
}

interface OrderDetail {
  id: string;
  channel_type: string;
  external_order_id: string;
  status: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_address: string | null;
  recipient_zipcode: string | null;
  total_amount: number;
  shipping_fee: number;
  ordered_at: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  tracking_number: string | null;
  tracking_company: string | null;
  items: OrderItemDetail[];
}

interface OrdersPage {
  items: Order[];
  total: number;
  next_cursor?: string;
  has_more: boolean;
}

interface OrdersFilter {
  q?: string;
  status?: string;
}

export function useOrders(filter: OrdersFilter = {}) {
  return useInfiniteQuery({
    queryKey: ["orders", filter],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      if (filter.q) params.set("q", filter.q);
      if (filter.status) params.set("status", filter.status);
      const qs = params.toString();
      const res = await api.get<Order[]>(
        `/orders${qs ? `?${qs}` : ""}`,
      );
      return {
        items: res.data,
        total: res.meta?.total ?? 0,
        next_cursor: res.meta?.next_cursor,
        has_more: res.meta?.has_more ?? false,
      } as OrdersPage;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor : undefined,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => api.get<OrderDetail>(`/orders/${id}`),
    enabled: !!id,
  });
}

export function useUpdateOrderStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: string) =>
      api.patch<OrderDetail>(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", id] });
    },
  });
}

export interface BulkOrderStatusItemResult {
  order_id: string;
  external_order_id: string;
  channel_type: string;
  buyer_name: string | null;
  old_status: string;
  new_status: string | null;
  allowed: boolean;
  error: string | null;
}

export interface BulkOrderStatusResult {
  updated_count: number;
  skipped_count: number;
  items: BulkOrderStatusItemResult[];
}

export function useBulkUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { order_ids: string[]; target_status: string }) =>
      api.patch<BulkOrderStatusResult>("/orders/bulk/status", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export type { Order, OrderDetail, OrderItemDetail, OrdersPage };
