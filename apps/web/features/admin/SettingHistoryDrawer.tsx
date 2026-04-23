"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RotateCcw, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDateTime } from "@/lib/utils/format/date";
import type { AdminSetting, SettingHistory } from "@/lib/hooks/use-admin-settings";
import { useSettingHistory, useRollbackSetting } from "@/lib/hooks/use-admin-settings";

interface Props {
  setting: AdminSetting | null;
  open: boolean;
  onClose: () => void;
}

export function SettingHistoryDrawer({ setting, open, onClose }: Props) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const { data, isLoading } = useSettingHistory(open && setting ? setting.id : null);
  const { mutateAsync: rollback, isPending: isRollingBack } = useRollbackSetting();

  const [confirmTarget, setConfirmTarget] = useState<SettingHistory | null>(null);

  const handleRollback = async () => {
    if (!setting || !confirmTarget) return;
    try {
      await rollback({ settingId: setting.id, historyId: confirmTarget.id });
      toast.success(t("rollbackSuccess"));
      setConfirmTarget(null);
      onClose();
    } catch {
      toast.error(t("rollbackError"));
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="fixed inset-0 bg-black/40" onClick={onClose} />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={setting ? t("historyTitle", { key: setting.key }) : ""}
          className="relative z-50 flex h-full w-full max-w-md flex-col bg-[var(--bg-surface)] shadow-2xl"
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
            <div className="flex items-center gap-2 text-[var(--text-primary)]">
              <Clock className="h-4 w-4 text-[var(--accent-iris)]" />
              <h2 className="text-sm font-semibold">
                {setting ? t("historyTitle", { key: setting.key }) : ""}
              </h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="닫기">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 이력 목록 */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isLoading && (
              <p className="text-sm text-[var(--text-tertiary)]">
                {tc("loading")}
              </p>
            )}

            {!isLoading && (!data?.data || data.data.length === 0) && (
              <div className="flex flex-col items-center gap-2 py-12 text-[var(--text-tertiary)]">
                <Clock className="h-8 w-8 opacity-40" />
                <p className="text-sm">{t("historyEmpty")}</p>
              </div>
            )}

            <ol className="relative flex flex-col gap-0 border-l border-[var(--border-subtle)]">
              {data?.data?.map((h: SettingHistory, idx: number) => (
                <li key={h.id} className="pb-6 pl-6">
                  {/* 타임라인 도트 */}
                  <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface-2)]" />

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {formatDateTime(new Date(h.changed_at))}
                      </p>

                      <div className="flex flex-col gap-1 text-xs">
                        <div>
                          <span className="text-[var(--text-tertiary)]">{t("historyOldValue")}: </span>
                          <code className="rounded bg-[var(--bg-surface-2)] px-1 py-0.5 text-[var(--state-error)]">
                            {h.old_value != null
                              ? JSON.stringify(h.old_value)
                              : "—"}
                          </code>
                        </div>
                        <div>
                          <span className="text-[var(--text-tertiary)]">{t("historyNewValue")}: </span>
                          <code className="rounded bg-[var(--bg-surface-2)] px-1 py-0.5 text-[var(--state-success)]">
                            {JSON.stringify(h.new_value)}
                          </code>
                        </div>
                      </div>
                    </div>

                    {/* 첫 번째(현재 직전) 이후 이력만 롤백 가능 */}
                    {idx > 0 && h.old_value != null && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--state-warn)]"
                        aria-label={t("rollback")}
                        onClick={() => setConfirmTarget(h)}
                        disabled={isRollingBack}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(o) => { if (!o) setConfirmTarget(null); }}
        title={t("rollbackConfirmTitle")}
        description={t("rollbackConfirmDesc")}
        confirmLabel={t("rollback")}
        cancelLabel={tc("cancel")}
        onConfirm={handleRollback}
        destructive
        loading={isRollingBack}
      />
    </>
  );
}
