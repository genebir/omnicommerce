"use client";

import { useState } from "react";
import { type RowSelectionState, createColumnHelper } from "@tanstack/react-table";
import { Package, Loader2, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { DataTable } from "@/components/patterns/DataTable";
import { formatCurrency } from "@/lib/utils/format";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useProducts, useDeleteProduct } from "@/lib/hooks";

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  price: number;
  status: string;
}

const columnHelper = createColumnHelper<ProductRow>();

export function ProductsTable() {
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
      size: 280,
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
      size: 140,
      cell: (info) => (
        <span className="font-mono text-xs text-text-secondary">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("price", {
      header: t("columnPrice"),
      size: 120,
      cell: (info) => (
        <span className="font-mono">{formatCurrency(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor("status", {
      header: t("status"),
      size: 100,
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

  async function handleBulkDelete() {
    for (const id of selectedIds) {
      await deleteProduct.mutateAsync(id);
    }
    setRowSelection({});
    setShowDeleteConfirm(false);
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
            onClick={() => setShowDeleteConfirm(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-state-error transition-colors hover:bg-state-error/10"
          >
            <Trash2 className="size-3.5" />
            {tc("delete")}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t("bulkDeleteTitle")}
        description={t("bulkDeleteConfirm", { count: selectedIds.length })}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        destructive
        loading={deleteProduct.isPending}
        onConfirm={handleBulkDelete}
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
