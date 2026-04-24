"use client";

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ChannelListingInfo {
  channel_type: string;
  external_id: string;
  sync_status: string;
  external_url: string | null;
}

export interface ChannelDeleteResult {
  channel_type: string;
  success: boolean;
  error?: string | null;
  requires_reconnect?: boolean;
}

export interface DeleteProductResult {
  channel_results: ChannelDeleteResult[];
}

interface ProductImage {
  id: string;
  url: string;
  sort_order: number;
  alt_text: string | null;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  description: string | null;
  cost_price: number | null;
  category_path: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  channel_listings: ChannelListingInfo[];
  images?: ProductImage[];
}

interface ProductsPage {
  items: Product[];
  total: number;
  next_cursor?: string;
  has_more: boolean;
}

interface ProductsFilter {
  q?: string;
  status?: string;
}

export function useProducts(filter: ProductsFilter = {}) {
  return useInfiniteQuery({
    queryKey: ["products", filter],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      if (filter.q) params.set("q", filter.q);
      if (filter.status) params.set("status", filter.status);
      const qs = params.toString();
      const res = await api.get<Product[]>(
        `/products${qs ? `?${qs}` : ""}`,
      );
      return {
        items: res.data,
        total: res.meta?.total ?? 0,
        next_cursor: res.meta?.next_cursor,
        has_more: res.meta?.has_more ?? false,
      } as ProductsPage;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor : undefined,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => api.get<Product>(`/products/${id}`),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      sku: string;
      price: number;
      description?: string;
      publish_to?: string[];
    }) => api.post<Product>("/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name?: string;
      sku?: string;
      price?: number;
      description?: string;
    }) => api.patch<Product>(`/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", id] });
    },
  });
}

// ----- 가격 일괄 수정 -----

export interface BulkPriceField {
  mode: "absolute" | "inc_amount" | "inc_percent";
  value: number;
  round_to?: number;
}

export interface ProductPriceOverride {
  product_id: string;
  price?: number;
  cost_price?: number;
}

export interface BulkPriceEditRequest {
  product_ids: string[];
  price?: BulkPriceField;
  cost_price?: BulkPriceField;
  sync_channels?: boolean;
  channel_types?: string[];
  overrides?: ProductPriceOverride[];
}

export interface BulkPriceProductResult {
  product_id: string;
  old_price: number;
  new_price: number;
  old_cost_price: number | null;
  new_cost_price: number | null;
  channel_results: ChannelDeleteResult[];
}

export interface BulkPriceEditResult {
  updated_count: number;
  sync_attempted: boolean;
  batch_id: string;
  items: BulkPriceProductResult[];
}

export function useBulkEditPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkPriceEditRequest) =>
      api.patch<BulkPriceEditResult>("/products/bulk/price", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["price-history"] });
    },
  });
}

// ----- 가격 변경 이력 + 되돌리기 -----

export interface PriceHistoryItem {
  id: string;
  product_id: string;
  field: "price" | "cost_price";
  old_value: number | null;
  new_value: number;
  batch_id: string;
  change_mode: string | null;
  change_value: number | null;
  channel_results: { channel_type: string; success: boolean; error?: string | null }[] | null;
  reverted_at: string | null;
  created_at: string | null;
}

export interface PriceBatchItem {
  batch_id: string;
  created_at: string | null;
  product_count: number;
  change_mode: string | null;
  change_value: number | null;
  field: string;
  is_reverted: boolean;
}

export interface RevertBatchResult {
  batch_id: string;
  reverted_count: number;
  new_batch_id: string;
  items: BulkPriceProductResult[];
}

export function useProductPriceHistory(productId: string) {
  return useQuery({
    queryKey: ["price-history", "product", productId],
    queryFn: async () => {
      const res = await api.get<PriceHistoryItem[]>(`/products/${productId}/price-history`);
      return res.data;
    },
    enabled: !!productId,
  });
}

export function useRecentPriceBatches(limit = 20) {
  return useQuery({
    queryKey: ["price-history", "recent", limit],
    queryFn: async () => {
      const res = await api.get<PriceBatchItem[]>(`/products/price-history/recent?limit=${limit}`);
      return res.data;
    },
  });
}

export function useRevertPriceBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) =>
      api.post<RevertBatchResult>(`/products/price-history/${batchId}/revert`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["price-history"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, channelTypes }: { id: string; channelTypes?: string[] }) => {
      const params = new URLSearchParams();
      if (channelTypes && channelTypes.length > 0) {
        channelTypes.forEach((ct) => params.append("channel_types", ct));
      }
      const qs = params.toString();
      return api.delete<DeleteProductResult>(`/products/${id}${qs ? `?${qs}` : ""}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useAddProductImage(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { url: string; alt_text?: string; sort_order?: number }) =>
      api.post<ProductImage>(`/products/${productId}/images`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", productId] });
    },
  });
}

export function useDeleteProductImage(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) =>
      api.delete(`/products/${productId}/images/${imageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", productId] });
    },
  });
}
