"use client";

import { useState } from "react";
import { createColumnHelper, type RowSelectionState } from "@tanstack/react-table";
import { ArrowRightLeft, Loader2, Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { DataTable, ChannelBadge } from "@/components/patterns";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { useOrders } from "@/lib/hooks";
import { BulkOrderStatusDialog } from "./BulkOrderStatusDialog";
import type { OrderRow as BulkOrderRow } from "./BulkOrderStatusDialog";

interface OrderRow {
  id: string;
  orderNumber: string;
  channel: string;
  customerName: string;
  totalAmount: number;
  status: string;
  orderedAt: string | null;
}

const columnHelper = createColumnHelper<OrderRow>();

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-accent-iris/10 text-accent-iris",
  PREPARING: "bg-state-warn/10 text-state-warn",
  SHIPPED: "bg-accent-iris/10 text-accent-iris",
  DELIVERED: "bg-state-success/10 text-state-success",
  CANCELED: "bg-state-error/10 text-state-error",
  REFUNDED: "bg-text-tertiary/10 text-text-tertiary",
};

export function OrdersTable() {
  const t = useTranslations("orders");
  const tc = useTranslations("common");
  const [q, setQ] = useQueryState("q", { defaultValue: "" });
  const [statusFilter, setStatusFilter] = useQueryState("status", { defaultValue: "" });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showBulkStatus, setShowBulkStatus] = useState(false);

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useOrders({
    q: q || undefined,
    status: statusFilter || undefined,
  });

  const orders: OrderRow[] =
    data?.pages?.flatMap((page) =>
      page.items.map((o) => ({
        id: String(o.id),
        orderNumber: o.external_order_id,
        channel: o.channel_type,
        customerName: o.buyer_name ?? "—",
        totalAmount: o.total_amount,
        status: o.status,
        orderedAt: o.ordered_at,
      })),
    ) ?? [];

  const selectedCount = Object.keys(rowSelection).length;
  const selectedOrders: BulkOrderRow[] = Object.keys(rowSelection)
    .map((idx) => {
      const o = orders[Number(idx)];
      return o
        ? { id: o.id, orderNumber: o.orderNumber, channel: o.channel, customerName: o.customerName, status: o.status }
        : null;
    })
    .filter(Boolean) as BulkOrderRow[];

  const columns = [
    columnHelper.display({
      id: "select",
      size: 40,
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)}
          aria-label={tc("selectAll")}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          onClick={(e) => e.stopPropagation()}
          aria-label={tc("selectRow")}
        />
      ),
    }),
    columnHelper.accessor("orderNumber", {
      header: t("columnOrderNumber"),
      size: 160,
      cell: (info) => (
        <Link
          href={`/orders/${info.row.original.id}`}
          className="font-mono text-xs text-accent-iris hover:underline"
        >
          {info.getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor("channel", {
      header: t("columnChannel"),
      size: 100,
      cell: (info) => <ChannelBadge code={info.getValue()} />,
    }),
    columnHelper.accessor("customerName", {
      header: t("columnCustomer"),
      size: 120,
    }),
    columnHelper.accessor("totalAmount", {
      header: t("columnTotal"),
      size: 120,
      cell: (info) => (
        <span className="font-mono">{formatCurrency(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor("status", {
      header: t("columnStatus"),
      size: 110,
      cell: (info) => {
        const status = info.getValue();
        const colorClass = STATUS_COLORS[status] ?? "bg-bg-surface-2 text-text-secondary";
        const statusKey = `status${status.charAt(0)}${status.slice(1).toLowerCase()}` as
          | "statusPaid"
          | "statusPreparing"
          | "statusShipped"
          | "statusDelivered"
          | "statusCanceled"
          | "statusRefunded";
        return (
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
            {t(statusKey)}
          </span>
        );
      },
    }),
    columnHelper.accessor("orderedAt", {
      header: t("orderedAt"),
      size: 120,
      cell: (info) => {
        const val = info.getValue();
        return val ? (
          <span className="text-xs text-text-tertiary">{formatDate(val)}</span>
        ) : (
          <span className="text-xs text-text-tertiary">—</span>
        );
      },
    }),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value || null)}
            placeholder={tc("search")}
            className="w-full rounded-lg border border-border-subtle bg-bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-iris focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value || null)}
          className="cursor-pointer rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-secondary focus:border-accent-iris focus:outline-none"
        >
          <option value="">{t("allStatuses")}</option>
          <option value="PAID">{t("statusPaid")}</option>
          <option value="PREPARING">{t("statusPreparing")}</option>
          <option value="SHIPPED">{t("statusShipped")}</option>
          <option value="DELIVERED">{t("statusDelivered")}</option>
          <option value="CANCELED">{t("statusCanceled")}</option>
          <option value="REFUNDED">{t("statusRefunded")}</option>
        </select>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-accent-iris/10 px-4 py-2">
          <span className="text-sm font-medium text-accent-iris">
            {tc("selected", { count: selectedCount })}
          </span>
          <button
            type="button"
            onClick={() => setShowBulkStatus(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-accent-iris transition-colors hover:bg-accent-iris/15"
          >
            <ArrowRightLeft className="size-3.5" />
            {t("bulkStatusChange")}
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={orders}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        emptyIcon={<ShoppingCart className="size-12" />}
        emptyMessage={t("empty")}
        emptyHint={t("emptyHint")}
      />

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="cursor-pointer rounded-xl border border-border-subtle px-6 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isFetchingNextPage ? (
              <Loader2 className="mx-auto size-4 animate-spin" />
            ) : (
              tc("loadMore")
            )}
          </button>
        </div>
      )}

      <BulkOrderStatusDialog
        open={showBulkStatus}
        onOpenChange={setShowBulkStatus}
        selectedOrders={selectedOrders}
        onApplied={() => setRowSelection({})}
      />
    </div>
  );
}
