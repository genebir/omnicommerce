"use client";

import { useState } from "react";
import { type RowSelectionState, createColumnHelper } from "@tanstack/react-table";
import { Package, Loader2, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { DataTable } from "@/components/patterns/DataTable";
import { ChannelBadge } from "@/components/patterns/ChannelBadge";
import { formatCurrency } from "@/lib/utils/format";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useProducts, useDeleteProduct, type ChannelListingInfo } from "@/lib/hooks";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DeleteProductDialog } from "./DeleteProductDialog";

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  price: number;
  status: string;
  channel_listings: ChannelListingInfo[];
}

const columnHelper = createColumnHelper<ProductRow>();

/** 일괄 삭제 확인 다이얼로그 */
function BulkDeleteDialog({
  open,
  onOpenChange,
  count,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  count: number;
  onConfirm: () => void;
  loading: boolean;
}) {
  const t = useTranslations("products");
  const tc = useTranslations("common");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-state-error">{t("bulkDeleteTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-text-secondary py-2">
          {t("bulkDeleteConfirm", { count })}
        </p>
        <p className="text-xs text-text-tertiary">
          {t("bulkDeleteChannelHint")}
        </p>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : tc("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProductsTable() {
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [q, setQ] = useQueryState("q", { defaultValue: "" });
  const [statusFilter, setStatusFilter] = useQueryState("status", { defaultValue: "" });
  const { data, isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage } = useProducts({
    q: q || undefined,
    status: statusFilter || undefined,
  });
  const deleteProduct = useDeleteProduct();

  const products: ProductRow[] =
    data?.pages?.flatMap((page) =>
      page.items.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        status: p.status,
        channel_listings: p.channel_listings ?? [],
      })),
    ) ?? [];

  const columns = [
    columnHelper.display({
      id: "select",
      size: 40,
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)}
          aria-label="전체 선택"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="행 선택"
        />
      ),
    }),
    columnHelper.accessor("name", {
      header: t("columnName"),
      size: 260,
      cell: (info) => (
        <Link
          href={`/products/${info.row.original.id}`}
          className="truncate font-medium text-accent-iris hover:underline"
        >
          {info.getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor("sku", {
      header: t("columnSku"),
      size: 130,
      cell: (info) => (
        <span className="font-mono text-xs text-text-secondary">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("channel_listings", {
      header: t("columnChannels"),
      size: 160,
      cell: (info) => {
        const listings = info.getValue();
        if (!listings.length) {
          return <span className="text-xs text-text-tertiary">—</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {listings.map((cl) => (
              <ChannelBadge key={cl.channel_type} code={cl.channel_type} />
            ))}
          </div>
        );
      },
    }),
    columnHelper.accessor("price", {
      header: t("columnPrice"),
      size: 110,
      cell: (info) => (
        <span className="font-mono">{formatCurrency(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor("status", {
      header: t("status"),
      size: 90,
      cell: (info) => {
        const status = info.getValue();
        return (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            status === "ACTIVE"
              ? "bg-state-success/10 text-state-success"
              : "bg-text-tertiary/10 text-text-tertiary"
          }`}>
            {status === "ACTIVE" ? t("statusActive") : t("statusInactive")}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      size: 48,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteTarget(row.original);
          }}
          className="cursor-pointer rounded-lg p-1.5 text-text-tertiary opacity-0 transition-all hover:bg-state-error/10 hover:text-state-error group-hover:opacity-100"
          aria-label="삭제"
        >
          <Trash2 className="size-3.5" />
        </button>
      ),
    }),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-sm text-state-error">{t("loadError")}</p>
      </div>
    );
  }

  const selectedCount = Object.keys(rowSelection).length;
  const selectedIds = Object.keys(rowSelection)
    .map((idx) => products[Number(idx)]?.id)
    .filter(Boolean);

  async function handleSingleDelete(channelTypes: string[]) {
    if (!deleteTarget) return;
    const res = await deleteProduct.mutateAsync({ id: deleteTarget.id, channelTypes });
    setDeleteTarget(null);

    const results = res?.data?.channel_results ?? [];
    const needsReconnect = results.some((r) => r.requires_reconnect);
    const failed = results.filter((r) => !r.success);

    if (needsReconnect) {
      toast.error(t("deleteAuthExpired"), {
        action: { label: t("goToChannels"), onClick: () => window.location.href = "/channels" },
        duration: 8000,
      });
    } else if (failed.length > 0) {
      const names = failed.map((r) => r.channel_type).join(", ");
      toast.warning(t("deleteChannelFailed", { channels: names }));
    } else {
      toast.success(t("deleteSuccess"));
    }
  }

  async function handleBulkDelete() {
    for (const id of selectedIds) {
      await deleteProduct.mutateAsync({ id });
    }
    setRowSelection({});
    setShowBulkDelete(false);
    toast.success(t("bulkDeleteSuccess", { count: selectedIds.length }));
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
          <option value="ACTIVE">{t("statusActive")}</option>
          <option value="INACTIVE">{t("statusInactive")}</option>
        </select>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-accent-iris/10 px-4 py-2">
          <span className="text-sm font-medium text-accent-iris">
            {tc("selected", { count: selectedCount })}
          </span>
          <button
            type="button"
            onClick={() => setShowBulkDelete(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-state-error transition-colors hover:bg-state-error/10"
          >
            <Trash2 className="size-3.5" />
            {tc("delete")}
          </button>
        </div>
      )}

      {/* 단건 삭제 — 채널 선택 */}
      <DeleteProductDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        productName={deleteTarget?.name ?? ""}
        channelListings={deleteTarget?.channel_listings ?? []}
        onConfirm={handleSingleDelete}
        loading={deleteProduct.isPending}
      />

      {/* 일괄 삭제 — 간단 확인 */}
      <BulkDeleteDialog
        open={showBulkDelete}
        onOpenChange={setShowBulkDelete}
        count={selectedIds.length}
        onConfirm={handleBulkDelete}
        loading={deleteProduct.isPending}
      />

      <DataTable
        columns={columns}
        data={products}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        emptyIcon={<Package className="size-12" />}
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
    </div>
  );
}
