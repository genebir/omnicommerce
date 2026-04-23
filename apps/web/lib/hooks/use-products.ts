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
