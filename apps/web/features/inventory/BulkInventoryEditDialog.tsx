"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChannelBadge } from "@/components/patterns/ChannelBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useBulkEditInventory,
  useConnectedChannels,
  type InventoryItem,
} from "@/lib/hooks";

type Mode = "absolute" | "inc_amount";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedItems: InventoryItem[];
  productNameBySku?: Record<string, string>;
  onApplied?: () => void;
}

function compute(current: number, mode: Mode, value: number): number {
  if (mode === "absolute") return Math.max(0, value);
  return Math.max(0, current + value);
}

export function BulkInventoryEditDialog({
  open,
  onOpenChange,
  selectedItems,
  productNameBySku = {},
  onApplied,
}: Props) {
  const t = useTranslations("bulkInventory");
  const tc = useTranslations("common");
  const { data: connectedChannels } = useConnectedChannels();
  const bulkEdit = useBulkEditInventory();

  const [mode, setMode] = useState<Mode>("absolute");
  const [valueStr, setValueStr] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());

  const handleOpenChange = (next: boolean) => {
    if (next && !open) {
      setValueStr("");
      setMode("absolute");
      const allCh = (connectedChannels ?? []).map((c) => c.channel_type);
      setSelectedChannels(new Set(allCh));
    }
    onOpenChange(next);
  };

  const value = parseInt(valueStr || "0", 10) || 0;
  const previews = useMemo(() => {
    return selectedItems.map((it) => {
      const newTotal = compute(it.total_quantity, mode, value);
      return {
        inv: it,
        newTotal,
        diff: newTotal - it.total_quantity,
      };
    });
  }, [selectedItems, mode, value]);

  const channels = connectedChannels ?? [];

  async function handleApply() {
    const res = await bulkEdit.mutateAsync({
      inventory_ids: selectedItems.map((it) => it.id),
      mode,
      value,
      sync_channels: selectedChannels.size > 0,
      channel_types: Array.from(selectedChannels),
    });
    const data = res.data!;

    const okByChannel = new Map<string, number>();
    const failByChannel = new Map<string, number>();
    let needsReconnect = false;
    for (const item of data.items) {
      for (const cr of item.channel_results) {
        if (cr.success) okByChannel.set(cr.channel_type, (okByChannel.get(cr.channel_type) ?? 0) + 1);
        else failByChannel.set(cr.channel_type, (failByChannel.get(cr.channel_type) ?? 0) + 1);
        if (cr.requires_reconnect) needsReconnect = true;
      }
    }

    if (needsReconnect) {
      toast.error(t("authExpired"), {
        action: { label: t("goToChannels"), onClick: () => (window.location.href = "/channels") },
        duration: 8000,
      });
    } else if (failByChannel.size > 0) {
      const summary = Array.from(failByChannel.entries())
        .map(([ch, n]) => t("channelFailItem", { channel: ch, count: n }))
        .join(", ");
      toast.warning(t("partialFailed", { summary, count: data.updated_count }), { duration: 8000 });
    } else {
      toast.success(t("applied", { count: data.updated_count }));
    }

    onApplied?.();
    onOpenChange(false);
  }

  const isValid = valueStr.trim() !== "" && !Number.isNaN(parseInt(valueStr, 10));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:w-[min(750px,95vw)] sm:max-w-[min(750px,95vw)]">
        <DialogHeader>
          <DialogTitle>{t("title", { count: selectedItems.length })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 1. 모드 */}
          <section className="space-y-2">
            <Label>
              <span className="text-text-tertiary">{t("step1")}</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <ToggleButton selected={mode === "absolute"} onClick={() => setMode("absolute")}>
                {t("modeAbsolute")}
              </ToggleButton>
              <ToggleButton selected={mode === "inc_amount"} onClick={() => setMode("inc_amount")}>
                {t("modeIncAmount")}
              </ToggleButton>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                value={valueStr}
                onChange={(e) => setValueStr(e.target.value)}
                placeholder={
                  mode === "absolute" ? t("placeholderAbsolute") : t("placeholderIncAmount")
                }
                className="flex-1"
              />
              <span className="text-sm text-text-tertiary">{t("unitPiece")}</span>
            </div>
          </section>

          {/* 2. 채널 */}
          <section className="space-y-2">
            <Label>
              <span className="text-text-tertiary">{t("step2")}</span>
            </Label>
            {channels.length === 0 ? (
              <p className="rounded-lg border border-border-subtle bg-bg-surface-2 px-3 py-2 text-xs text-text-tertiary">
                {t("noChannels")}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {channels.map((ch) => {
                  const checked = selectedChannels.has(ch.channel_type);
                  return (
                    <label
                      key={ch.channel_type}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-border-subtle bg-bg-surface px-3 py-1.5 hover:bg-bg-surface-2"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const next = new Set(selectedChannels);
                          if (v) next.add(ch.channel_type);
                          else next.delete(ch.channel_type);
                          setSelectedChannels(next);
                        }}
                      />
                      <ChannelBadge code={ch.channel_type} />
                    </label>
                  );
                })}
              </div>
            )}
            {channels.length > 0 && selectedChannels.size === 0 && (
              <p className="text-xs text-text-tertiary">{t("noChannelHint")}</p>
            )}
          </section>

          {/* 미리보기 */}
          {isValid && (
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-accent-iris" />
                <Label>
                  <span className="text-text-tertiary">{t("preview")}</span>
                </Label>
              </div>
              <div className="max-h-80 overflow-auto rounded-xl border border-border-subtle">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-[55%]" />
                    <col className="w-[20%]" />
                    <col className="w-[25%]" />
                  </colgroup>
                  <thead className="sticky top-0 bg-bg-surface text-left text-xs text-text-tertiary">
                    <tr className="border-b border-border-subtle">
                      <th className="px-3 py-2 font-medium">{t("colSku")}</th>
                      <th className="px-3 py-2 text-right font-medium">{t("colCurrent")}</th>
                      <th className="px-3 py-2 text-right font-medium">{t("colNew")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previews.map((p) => (
                      <tr key={p.inv.id} className="border-b border-border-subtle last:border-0">
                        <td className="px-3 py-2 text-text-primary">
                          <div className="font-mono text-xs">{p.inv.sku}</div>
                          {productNameBySku[p.inv.sku] && (
                            <div className="truncate text-[11px] text-text-tertiary" title={productNameBySku[p.inv.sku]}>
                              {productNameBySku[p.inv.sku]}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-text-tertiary">
                          {p.inv.total_quantity}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-2 text-right font-mono ${
                            p.diff < 0
                              ? "text-state-error"
                              : p.diff > 0
                                ? "text-state-success"
                                : "text-text-primary"
                          }`}
                        >
                          {p.newTotal}
                          {p.diff !== 0 && (
                            <span className="ml-1 text-[11px]">
                              ({p.diff > 0 ? "+" : ""}{p.diff})
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={bulkEdit.isPending}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleApply} disabled={!isValid || bulkEdit.isPending}>
            {bulkEdit.isPending ? <Loader2 className="size-4 animate-spin" /> : t("apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 cursor-pointer whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
        selected
          ? "border-accent-iris bg-accent-iris/10 text-accent-iris"
          : "border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}
