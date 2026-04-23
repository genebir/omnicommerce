"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { Search, History, Pencil, Lock, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AdminSetting } from "@/lib/hooks/use-admin-settings";
import { useAdminSettings } from "@/lib/hooks/use-admin-settings";
import { SettingEditDialog } from "./SettingEditDialog";
import { SettingHistoryDrawer } from "./SettingHistoryDrawer";

const SCOPES = ["global", "channel:cafe24", "channel:naver", "channel:coupang"];
const PAGE_SIZE = 50;

const VALUE_TYPE_COLORS: Record<string, string> = {
  int: "text-[var(--accent-iris)]",
  bool: "text-[var(--accent-aurora)]",
  string: "text-[var(--text-secondary)]",
  json: "text-[var(--accent-amber)]",
  duration: "text-[var(--state-warn)]",
};

function ValuePreview({ setting }: { setting: AdminSetting }) {
  const t = useTranslations("admin");
  if (setting.is_secret) {
    return (
      <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
        <Lock className="h-3 w-3" />
        {t("masked")}
      </span>
    );
  }
  const str = JSON.stringify(setting.value);
  return (
    <code className="max-w-[200px] truncate text-xs text-[var(--text-secondary)]">
      {str}
    </code>
  );
}

export function AdminSettingsContent() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");

  const [q, setQ] = useQueryState("q", { defaultValue: "" });
  const [scope, setScope] = useQueryState("scope", { defaultValue: "" });
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [prevCursors, setPrevCursors] = useState<string[]>([]);

  const [editTarget, setEditTarget] = useState<AdminSetting | null>(null);
  const [historyTarget, setHistoryTarget] = useState<AdminSetting | null>(null);

  const { data, isLoading, isError } = useAdminSettings({
    q: q || undefined,
    scope: scope || undefined,
    limit: PAGE_SIZE,
    cursor,
  });

  const settings = data?.data ?? [];
  const meta = data?.meta;

  const handleNext = () => {
    if (!meta?.next_cursor) return;
    setPrevCursors((prev) => [...prev, cursor ?? ""]);
    setCursor(meta.next_cursor);
  };

  const handlePrev = () => {
    const prev = [...prevCursors];
    const last = prev.pop();
    setPrevCursors(prev);
    setCursor(last || undefined);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("subtitle")}</p>
      </div>

      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 검색 */}
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setCursor(undefined); setPrevCursors([]); }}
            placeholder={t("searchPlaceholder")}
            className="h-9 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface-2)] pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--ring-focus)] focus:outline-none"
          />
        </div>

        {/* 스코프 필터 */}
        <select
          value={scope}
          onChange={(e) => { setScope(e.target.value); setCursor(undefined); setPrevCursors([]); }}
          className="h-9 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface-2)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--ring-focus)] focus:outline-none"
        >
          <option value="">{t("scopeAll")}</option>
          {SCOPES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {meta && (
          <span className="ml-auto text-xs text-[var(--text-tertiary)]">
            총 {meta.total}개
          </span>
        )}
      </div>

      {/* 테이블 */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-sm text-[var(--text-tertiary)]">
            {tc("loading")}
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center py-16 text-sm text-[var(--state-error)]">
            {t("loadError")}
          </div>
        )}

        {!isLoading && !isError && settings.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-[var(--text-tertiary)]">
            <p className="text-sm">{t("empty")}</p>
          </div>
        )}

        {!isLoading && !isError && settings.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-left text-xs font-medium text-[var(--text-tertiary)]">
                <th className="px-4 py-3 w-[280px]">{t("columnKey")}</th>
                <th className="px-4 py-3 w-32">{t("columnScope")}</th>
                <th className="px-4 py-3 w-20">{t("columnType")}</th>
                <th className="px-4 py-3">현재 값</th>
                <th className="px-4 py-3 w-16 text-center">{t("columnVersion")}</th>
                <th className="px-4 py-3 w-24 text-right">{t("columnActions")}</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((s: AdminSetting, i: number) => (
                <tr
                  key={s.id}
                  className={cn(
                    "border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-surface-2)]",
                    i === settings.length - 1 && "border-b-0"
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs text-[var(--accent-iris)]">{s.key}</code>
                      {s.is_secret && (
                        <Lock className="h-3 w-3 text-[var(--state-warn)]" aria-label={t("secret")} />
                      )}
                    </div>
                    {s.description && (
                      <p className="mt-0.5 text-xs text-[var(--text-tertiary)] line-clamp-1">{s.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{s.scope}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("font-mono text-xs", VALUE_TYPE_COLORS[s.value_type] ?? "text-[var(--text-secondary)]")}>
                      {s.value_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ValuePreview setting={s} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {t("versionBadge", { version: s.version })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditTarget(s)}
                        aria-label={t("edit")}
                        className="h-7 w-7 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setHistoryTarget(s)}
                        aria-label={t("history")}
                        className="h-7 w-7 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      >
                        <History className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 페이지네이션 */}
      {(prevCursors.length > 0 || meta?.has_more) && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={prevCursors.length === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            이전
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNext}
            disabled={!meta?.has_more}
          >
            다음
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 편집 다이얼로그 */}
      <SettingEditDialog
        setting={editTarget}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
      />

      {/* 변경 이력 드로어 */}
      <SettingHistoryDrawer
        setting={historyTarget}
        open={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
      />
    </div>
  );
}
