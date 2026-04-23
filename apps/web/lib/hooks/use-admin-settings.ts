"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export interface AdminSetting {
  id: string;
  key: string;
  value: unknown;
  value_type: string;
  scope: string;
  description: string;
  is_secret: boolean;
  default_value: unknown;
  version: number;
}

export interface SettingHistory {
  id: string;
  key: string;
  old_value: unknown;
  new_value: unknown;
  changed_by: string | null;
  changed_at: string;
}

interface ListParams {
  q?: string;
  scope?: string;
  limit?: number;
  cursor?: string;
}

interface SettingsMeta {
  total: number;
  has_more: boolean;
  next_cursor: string | null;
}

interface SettingsPage {
  data: AdminSetting[];
  meta: SettingsMeta;
}

export function useAdminSettings(params: ListParams = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.scope) query.set("scope", params.scope);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.cursor) query.set("cursor", params.cursor);
  const qs = query.toString();

  return useQuery({
    queryKey: ["admin-settings", params],
    queryFn: async (): Promise<SettingsPage> => {
      const res = await api.get<AdminSetting[]>(
        `/admin/settings${qs ? `?${qs}` : ""}`
      );
      return {
        data: res.data,
        meta: {
          total: res.meta?.total ?? 0,
          has_more: res.meta?.has_more ?? false,
          next_cursor: res.meta?.next_cursor ?? null,
        },
      };
    },
  });
}

export function useSettingHistory(settingId: string | null) {
  return useQuery({
    queryKey: ["admin-setting-history", settingId],
    queryFn: async (): Promise<{ data: SettingHistory[] }> => {
      const res = await api.get<SettingHistory[]>(
        `/admin/settings/${settingId}/history`
      );
      return { data: res.data };
    },
    enabled: !!settingId,
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: unknown }) =>
      api.patch<AdminSetting>(`/admin/settings/${id}`, { value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });
}

export function useRollbackSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ settingId, historyId }: { settingId: string; historyId: string }) =>
      api.post<AdminSetting>(
        `/admin/settings/${settingId}/rollback?history_id=${historyId}`,
        {}
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-setting-history", vars.settingId] });
    },
  });
}
