"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ChannelType {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

interface ConnectedChannel {
  id: string;
  channel_type: string;
  shop_name: string;
  is_active: boolean;
  product_count: number;
  order_count: number;
}

export function useChannelTypes() {
  return useQuery({
    queryKey: ["channel-types"],
    queryFn: async () => {
      const res = await api.get<ChannelType[]>("/channels/types");
      return res.data;
    },
  });
}

export function useConnectedChannels() {
  return useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const res = await api.get<ConnectedChannel[]>("/channels");
      return res.data;
    },
  });
}

export function useConnectChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      channel_type: string;
      shop_name: string;
      credentials: Record<string, string>;
    }) => api.post<ConnectedChannel>("/channels", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      queryClient.invalidateQueries({ queryKey: ["channel-types"] });
    },
  });
}

export function useCafe24OAuthUrl() {
  return useMutation({
    mutationFn: (mallId: string) =>
      api.get<{ url: string }>(`/channels/cafe24/oauth/url?mall_id=${encodeURIComponent(mallId)}`),
  });
}

interface RedirectUriData {
  redirect_uri: string | null;
  configured: boolean;
}

export function useCafe24RedirectUri() {
  return useQuery({
    queryKey: ["cafe24-redirect-uri"],
    queryFn: async () => {
      const res = await api.get<RedirectUriData>("/channels/cafe24/redirect-uri");
      return res.data;
    },
  });
}

export function useConnectCafe24Manual() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { mall_id: string; access_token: string; refresh_token?: string }) =>
      api.post<ConnectedChannel>("/channels/cafe24/connect-manual", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}

export function useDisconnectChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) => api.delete(`/channels/${channelId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
}

export function useImportProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) =>
      api.post<ImportResult>(`/channels/${channelId}/import-products`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}

export type { ChannelType, ConnectedChannel, ImportResult };
