"use client";

import { ShoppingCart, RefreshCw, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { OrdersTable } from "@/features/orders";
import { useConnectedChannels, useSyncChannelOrders } from "@/lib/hooks";

export default function OrdersPage() {
  const t = useTranslations("orders");
  const { data: channels } = useConnectedChannels();
  const sync = useSyncChannelOrders();
  const activeChannels = (channels ?? []).filter((c) => c.is_active);
  const canSync = activeChannels.length > 0 && !sync.isPending;

  async function handleSync() {
    let imported = 0;
    let updated = 0;
    let errors = 0;
    for (const ch of activeChannels) {
      try {
        const res = await sync.mutateAsync({ channelId: ch.id, days: 30 });
        imported += res.data?.imported ?? 0;
        updated += res.data?.updated ?? 0;
        errors += res.data?.errors ?? 0;
      } catch {
        errors += 1;
      }
    }
    if (errors > 0 && imported + updated === 0) {
      toast.error(t("syncOrdersError"));
    } else {
      toast.success(t("syncOrdersSuccess", { imported, updated }));
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShoppingCart className="size-6 text-text-secondary" />
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {t("title")}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={!canSync}
          className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-subtle bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sync.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {t("syncOrders")}
        </button>
      </div>
      <OrdersTable />
    </div>
  );
}
