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
import { formatCurrency } from "@/lib/utils/format";
import {
  useBulkEditPrice,
  useConnectedChannels,
  useRevertPriceBatch,
  type BulkPriceField,
  type ChannelListingInfo,
} from "@/lib/hooks";

type Mode = "absolute" | "inc_amount" | "inc_percent" | "custom";
type Field = "price" | "cost_price";

interface SelectedProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  channel_listings: ChannelListingInfo[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedProducts: SelectedProduct[];
  onApplied?: () => void;
}

function applyChange(current: number, mode: Mode, value: number, roundTo = 10): number {
  let next = current;
  if (mode === "absolute") next = value;
  else if (mode === "inc_amount") next = current + value;
  else next = current * (1 + value / 100);
  next = Math.max(0, next);
  if (roundTo > 1) next = Math.round(next / roundTo) * roundTo;
  return next;
}

export function BulkPriceEditDialog({
  open,
  onOpenChange,
  selectedProducts,
  onApplied,
}: Props) {
  const t = useTranslations("bulkPrice");
  const tc = useTranslations("common");
  const { data: connectedChannels } = useConnectedChannels();
  const bulkEdit = useBulkEditPrice();
  const revertBatch = useRevertPriceBatch();

  const [field, setField] = useState<Field>("price");
  const [mode, setMode] = useState<Mode>("absolute");
  const [valueStr, setValueStr] = useState("");
  const [roundTo, setRoundTo] = useState<number>(10);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());

  // 다이얼로그 열릴 때마다 입력 초기화 + 모든 채널 자동 선택 (안전한 default)
  const handleOpenChange = (next: boolean) => {
    if (next && !open) {
      setValueStr("");
      setMode("absolute");
      setField("price");
      setCustomPrices({});
      const allChannelTypes = (connectedChannels ?? []).map((c) => c.channel_type);
      setSelectedChannels(new Set(allChannelTypes));
    }
    onOpenChange(next);
  };

  const value = parseFloat(valueStr || "0") || 0;

  // 비정형 모드 — 상품별 새 가격 입력
  const [customPrices, setCustomPrices] = useState<Record<string, string>>({});
  const customMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const [pid, str] of Object.entries(customPrices)) {
      const n = parseFloat(str);
      if (!Number.isNaN(n) && n >= 0) m[pid] = n;
    }
    return m;
  }, [customPrices]);

  const previews = useMemo(() => {
    return selectedProducts.map((p) => {
      const newPrice =
        mode === "custom"
          ? customMap[p.id] ?? p.price
          : applyChange(p.price, mode, value, roundTo);
      const channelTypesInProduct = p.channel_listings.map((cl) => cl.channel_type);
      return {
        product: p,
        oldPrice: p.price,
        newPrice,
        diff: newPrice - p.price,
        affectedChannels: channelTypesInProduct.filter((ct) => selectedChannels.has(ct)),
      };
    });
  }, [selectedProducts, mode, value, roundTo, selectedChannels, customMap]);

  const channels = connectedChannels ?? [];

  async function handleApply() {
    const requestBody = {
      product_ids: selectedProducts.map((p) => p.id),
      sync_channels: selectedChannels.size > 0,
      channel_types: Array.from(selectedChannels),
    } as Parameters<typeof bulkEdit.mutateAsync>[0];

    if (mode === "custom") {
      requestBody.overrides = Object.entries(customMap).map(([product_id, price]) => ({
        product_id,
        ...(field === "price" ? { price } : { cost_price: price }),
      }));
    } else {
      const change: BulkPriceField = { mode, value, round_to: roundTo };
      if (field === "price") requestBody.price = change;
      else requestBody.cost_price = change;
    }

    const res = await bulkEdit.mutateAsync(requestBody);

    const data = res.data!;
    // 채널별 결과 집계
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

    // 모든 결과 토스트에 "실행 취소" 액션 첨부 — 5초 동안 1클릭 원복
    const undo = async () => {
      try {
        await revertBatch.mutateAsync(data.batch_id);
        toast.success(t("undoSuccess"));
      } catch {
        toast.error(t("undoError"));
      }
    };

    if (needsReconnect) {
      toast.error(t("authExpired"), {
        action: { label: t("goToChannels"), onClick: () => (window.location.href = "/channels") },
        duration: 8000,
      });
    } else if (failByChannel.size > 0) {
      const summary = Array.from(failByChannel.entries())
        .map(([ch, n]) => `${ch} ${n}건`)
        .join(", ");
      toast.warning(t("partialFailed", { summary, count: data.updated_count }), {
        duration: 8000,
        action: { label: t("undo"), onClick: undo },
      });
    } else {
      toast.success(t("applied", { count: data.updated_count }), {
        duration: 8000,  // 평소 4초보다 길게 — 되돌릴 시간 확보
        action: { label: t("undo"), onClick: undo },
      });
    }

    onApplied?.();
    onOpenChange(false);
  }

  const isValid =
    mode === "custom"
      ? Object.keys(customMap).length > 0
      : valueStr.trim() !== "" && !Number.isNaN(parseFloat(valueStr));
  // custom 모드는 항상 미리보기 표가 보여야 입력 가능 (input이 표 안에 있음)
  const showPreview = mode === "custom" || isValid;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:w-auto sm:max-w-[min(1400px,95vw)]">
        <DialogHeader>
          <DialogTitle>{t("title", { count: selectedProducts.length })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 1단계: 무엇을 바꿀지 (가격 vs 단가) */}
          <section className="space-y-2">
            <Label>
              <span className="text-text-tertiary">{t("step1")}</span>
            </Label>
            <div className="flex gap-2">
              <ToggleButton selected={field === "price"} onClick={() => setField("price")}>
                {t("fieldPrice")}
              </ToggleButton>
              <ToggleButton selected={field === "cost_price"} onClick={() => setField("cost_price")}>
                {t("fieldCostPrice")}
              </ToggleButton>
            </div>
          </section>

          {/* 2단계: 어떻게 바꿀지 (모드 + 값) */}
          <section className="space-y-2">
            <Label>
              <span className="text-text-tertiary">{t("step2")}</span>
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ToggleButton selected={mode === "absolute"} onClick={() => setMode("absolute")}>
                {t("modeAbsolute")}
              </ToggleButton>
              <ToggleButton selected={mode === "inc_amount"} onClick={() => setMode("inc_amount")}>
                {t("modeIncAmount")}
              </ToggleButton>
              <ToggleButton selected={mode === "inc_percent"} onClick={() => setMode("inc_percent")}>
                {t("modeIncPercent")}
              </ToggleButton>
              <ToggleButton selected={mode === "custom"} onClick={() => setMode("custom")}>
                {t("modeCustom")}
              </ToggleButton>
            </div>
            {mode !== "custom" && (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={valueStr}
                    onChange={(e) => setValueStr(e.target.value)}
                    placeholder={
                      mode === "absolute"
                        ? t("placeholderAbsolute")
                        : mode === "inc_amount"
                          ? t("placeholderIncAmount")
                          : t("placeholderIncPercent")
                    }
                    className="flex-1"
                  />
                  <span className="text-sm text-text-tertiary">
                    {mode === "inc_percent" ? "%" : "원"}
                  </span>
                </div>
                {mode !== "inc_percent" && (
                  <div className="flex items-center gap-2 text-xs text-text-tertiary">
                    <span>{t("roundTo")}</span>
                    {[1, 10, 100, 1000].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRoundTo(r)}
                        className={`cursor-pointer rounded-md px-2 py-0.5 ${
                          roundTo === r
                            ? "bg-accent-iris/15 text-accent-iris"
                            : "text-text-tertiary hover:text-text-primary"
                        }`}
                      >
                        {r === 1 ? t("noRound") : `${r}원`}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {mode === "custom" && (
              <p className="text-xs text-text-tertiary">{t("customHint")}</p>
            )}
          </section>

          {/* 3단계: 어느 채널에 동기화할지 */}
          <section className="space-y-2">
            <Label>
              <span className="text-text-tertiary">{t("step3")}</span>
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
          {showPreview && (
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
                    <col className="w-[34%]" />
                    <col className="w-[16%]" />
                    <col className="w-[30%]" />
                    <col className="w-[20%]" />
                  </colgroup>
                  <thead className="sticky top-0 bg-bg-surface text-center text-xs text-text-tertiary">
                    <tr className="border-b border-border-subtle">
                      <th className="px-3 py-2 font-medium">{t("colProduct")}</th>
                      <th className="px-3 py-2 font-medium">{t("colCurrent")}</th>
                      <th className="px-3 py-2 font-medium">{t("colNew")}</th>
                      <th className="px-3 py-2 font-medium">{t("colChannels")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previews.map((p) => (
                      <tr key={p.product.id} className="border-b border-border-subtle last:border-0">
                        <td className="px-3 py-2 text-text-primary">
                          <div className="truncate" title={p.product.name}>
                            {p.product.name}
                          </div>
                          <div className="truncate font-mono text-[11px] text-text-tertiary">
                            {p.product.sku}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-center font-mono text-text-tertiary">
                          {field === "price" ? formatCurrency(p.oldPrice) : "—"}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-2 text-center font-mono ${
                            mode !== "custom" && p.diff < 0
                              ? "text-state-error"
                              : mode !== "custom" && p.diff > 0
                                ? "text-state-success"
                                : "text-text-primary"
                          }`}
                        >
                          {mode === "custom" ? (
                            <Input
                              type="number"
                              inputMode="decimal"
                              value={customPrices[p.product.id] ?? ""}
                              onChange={(e) =>
                                setCustomPrices({
                                  ...customPrices,
                                  [p.product.id]: e.target.value,
                                })
                              }
                              placeholder={String(p.oldPrice)}
                              className="mx-auto block w-full text-center font-mono"
                            />
                          ) : (
                            <div>
                              <div>{field === "price" ? formatCurrency(p.newPrice) : "—"}</div>
                              {field === "price" && p.diff !== 0 && (
                                <div className="text-[11px] opacity-80">
                                  ({p.diff > 0 ? "+" : ""}
                                  {formatCurrency(p.diff)})
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap justify-center gap-1">
                            {p.affectedChannels.length === 0 ? (
                              <span className="text-[11px] text-text-tertiary">—</span>
                            ) : (
                              p.affectedChannels.map((ct) => (
                                <ChannelBadge key={ct} code={ct} />
                              ))
                            )}
                          </div>
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
      className={`flex-1 cursor-pointer whitespace-nowrap rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors ${
        selected
          ? "border-accent-iris bg-accent-iris/10 text-accent-iris"
          : "border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}
