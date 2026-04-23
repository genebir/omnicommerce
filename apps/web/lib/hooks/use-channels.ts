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

export function useDisconnectChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) => api.delete(`/channels/${channelId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}

export type { ChannelType, ConnectedChannel };
