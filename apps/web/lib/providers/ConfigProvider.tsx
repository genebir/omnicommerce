"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";

interface ChannelCapabilities {
  supports_options: boolean;
  supports_scheduled_publish: boolean;
  supports_bulk_inventory: boolean;
  supports_webhook: boolean;
  supports_partial_update: boolean;
  max_images_per_product: number;
  max_option_combinations: number;
  order_fetch_min_interval_sec: number;
  category_schema: "tree" | "flat" | "code";
}

interface FeatureFlags {
  bulk_upload_enabled: boolean;
  new_dashboard_v2: boolean;
  [key: string]: boolean;
}

export interface AppConfig {
  features: FeatureFlags;
  channels: Record<string, { capabilities: ChannelCapabilities }>;
  ui: {
    page_size: number;
    polling_interval_ms: number;
    toast_duration_ms: number;
    default_sort_field: string;
    default_sort_order: "asc" | "desc";
  };
}

const defaultConfig: AppConfig = {
  features: {
    bulk_upload_enabled: false,
    new_dashboard_v2: false,
  },
  channels: {},
  ui: {
    page_size: 20,
    polling_interval_ms: 30000,
    toast_duration_ms: 4000,
    default_sort_field: "created_at",
    default_sort_order: "desc",
  },
};

const ConfigContext = createContext<AppConfig>(defaultConfig);

async function fetchConfig(): Promise<AppConfig> {
  const res = await fetch("/api/v1/config/ui");
  if (!res.ok) return defaultConfig;
  const json = await res.json();
  return json.data ?? defaultConfig;
}

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const { data } = useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    placeholderData: defaultConfig,
  });

  return (
    <ConfigContext value={data ?? defaultConfig}>
      {children}
    </ConfigContext>
  );
}

export function useConfig(): AppConfig {
  return useContext(ConfigContext);
}

export function useFeatureFlag(key: string): boolean {
  const config = useConfig();
  return config.features[key] ?? false;
}

export function useChannelCapability<K extends keyof ChannelCapabilities>(
  channelCode: string,
  capability: K,
): ChannelCapabilities[K] | undefined {
  const config = useConfig();
  return config.channels[channelCode]?.capabilities[capability];
}
