"use client";

import { useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Warehouse, Loader2, Edit } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { DataTable } from "@/components/patterns";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatNumber } from "@/lib/utils/format";
import { useInventory, useUpdateInventory } from "@/lib/hooks";

interface InventoryRow {
  id: string;
  productId: string;
  sku: string;
  warehouse: string;
  available: number;
  allocated: number;
  total: number;
}

const columnHelper = createColumnHelper<InventoryRow>();

export function InventoryTable() {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const { data, isLoading } = useInventory();
  const updateInventory = useUpdateInventory();
  const [editItem, setEditItem] = useState<InventoryRow | null>(null);
  const [editQuantity, setEditQuantity] = useState(0);

  const rows: InventoryRow[] =
    data?.data?.map((inv) => ({
      id: String(inv.id),
      productId: String(inv.product_id),
      sku: inv.sku,
      warehouse: inv.warehouse_id,
      available: inv.available,
      allocated: inv.allocated,
      total: inv.total_quantity,
    })) ?? [];

  async function handleSaveQuantity() {
    if (!editItem) return;
    try {
      await updateInventory.mutateAsync({
        product_id: editItem.productId,
        sku: editItem.sku,
        warehouse_id: editItem.warehouse,
        total_quantity: editQuantity,
      });
      toast.success(t("updateSuccess"));
      setEditItem(null);
    } catch {
      toast.error(t("updateError"));
    }
  }

  const columns = [
    columnHelper.accessor("sku", {
      header: t("columnSku"),
      size: 140,
      cell: (info) => (
        <span className="font-mono text-xs">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("warehouse", {
      header: t("columnWarehouse"),
      size: 120,
    }),
    columnHelper.accessor("available", {
      header: t("columnAvailable"),
      size: 100,
      cell: (info) => (
        <span className="font-mono text-state-success">{formatNumber(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor("allocated", {
      header: t("columnAllocated"),
      size: 100,
      cell: (info) => (
        <span className="font-mono text-state-warn">{formatNumber(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor("total", {
      header: t("columnTotal"),
      size: 100,
      cell: (info) => (
        <span className="font-mono font-bold">{formatNumber(info.getValue())}</span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      size: 60,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => {
            setEditItem(row.original);
            setEditQuantity(row.original.total);
          }}
          className="cursor-pointer rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-bg-surface-2 hover:text-text-primary"
          aria-label={tc("edit")}
        >
          <Edit className="size-3.5" />
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

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        emptyIcon={<Warehouse className="size-12" />}
        emptyMessage={t("empty")}
        emptyHint={t("emptyHint")}
      />

      <Dialog
        open={!!editItem}
        onOpenChange={(open) => !open && setEditItem(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="text-lg font-semibold text-text-primary">
            {t("adjustStock")}
          </DialogTitle>
          {editItem && (
            <div className="space-y-4">
              <div className="rounded-xl bg-bg-canvas p-3">
                <p className="font-mono text-sm text-text-secondary">{editItem.sku}</p>
                <p className="mt-1 text-xs text-text-tertiary">{editItem.warehouse}</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                  {t("columnTotal")}
                </label>
                <input
                  type="number"
                  min={0}
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-lg border border-border-strong bg-bg-canvas px-3 py-2 font-mono text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring-focus"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="cursor-pointer rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2"
                >
                  {tc("cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuantity}
                  disabled={updateInventory.isPending}
                  className="cursor-pointer rounded-xl bg-accent-iris px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updateInventory.isPending ? "..." : tc("save")}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
