"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useConnectedChannels, useImportProducts } from "@/lib/hooks/use-channels";

interface ImportProductsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportProductsModal({ open, onOpenChange }: ImportProductsModalProps) {
  const t = useTranslations("channels");
  const tc = useTranslations("common");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const { data: connectedChannels, isLoading } = useConnectedChannels();
  const importProducts = useImportProducts();

  async function handleImport() {
    if (!selectedChannelId) return;
    try {
      const result = await importProducts.mutateAsync(selectedChannelId);
      toast.success(
        t("importSuccess", {
          imported: result.data.imported,
          skipped: result.data.skipped,
        })
      );
      onOpenChange(false);
      setSelectedChannelId("");
    } catch {
      toast.error(t("importError"));
    }
  }

  function handleClose() {
    onOpenChange(false);
    setSelectedChannelId("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-md !bg-bg-surface !text-text-primary !ring-border-subtle">
        <DialogHeader>
          <DialogTitle className="!text-text-primary">{t("importTitle")}</DialogTitle>
          <DialogDescription className="!text-text-secondary">
            {t("importDesc")}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-accent-iris" />
          </div>
        ) : !connectedChannels || connectedChannels.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-tertiary">
            {t("noConnectedChannels")}
          </p>
        ) : (
          <div className="space-y-2 py-2">
            {connectedChannels.map((ch) => (
              <label
                key={ch.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border-subtle p-3 transition-colors hover:bg-bg-surface-2"
              >
                <input
                  type="radio"
                  name="import-channel"
                  className="size-4 cursor-pointer accent-accent-iris"
                  value={ch.id}
                  checked={selectedChannelId === ch.id}
                  onChange={() => setSelectedChannelId(ch.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{ch.shop_name}</p>
                  <p className="text-xs text-text-tertiary">{ch.channel_type}</p>
                </div>
                <span className="text-xs text-text-tertiary">
                  {t("productCount")} {ch.product_count}
                </span>
              </label>
            ))}
          </div>
        )}

        {importProducts.isPending && (
          <div className="flex items-center gap-2 rounded-xl bg-bg-surface-2 px-4 py-3 text-sm text-text-secondary">
            <Loader2 className="size-4 animate-spin" />
            {t("importing")}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={importProducts.isPending}
            className="cursor-pointer rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {tc("cancel")}
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!selectedChannelId || importProducts.isPending}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-accent-iris px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="size-4" />
            {t("import")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
