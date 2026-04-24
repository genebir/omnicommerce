"use client";

import { useMemo, useState } from "react";
import { type RowSelectionState, createColumnHelper } from "@tanstack/react-table";
import { Warehouse, Loader2, Edit, Boxes } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { DataTable } from "@/components/patterns";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatNumber } from "@/lib/utils/format";
import {
  useBulkEditInventory,
  useInventory,
  useProducts,
  useUpdateInventory,
  type InventoryItem,
} from "@/lib/hooks";
import { BulkInventoryEditDialog } from "./BulkInventoryEditDialog";

interface InventoryRow {
  id: string;
  productId: string;
  sku: string;
  warehouse: string;
  available: number;
  allocated: number;
  total: number;
  // 백엔드 InventoryItem 형태 그대로 보존 (다이얼로그가 그 형태로 받음)
  raw: InventoryItem;
}

const columnHelper = createColumnHelper<InventoryRow>();

export function InventoryTable() {
  const t = useTranslations("inventory");
  const tb = useTranslations("bulkInventory");
  const tc = useTranslations("common");
  const { data, isLoading } = useInventory();
  const { data: productsPages } = useProducts();
  const updateInventory = useUpdateInventory();
  const bulkEdit = useBulkEditInventory();

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showBulk, setShowBulk] = useState(false);
  const [editItem, setEditItem] = useState<InventoryRow | null>(null);
  const [editQuantity, setEditQuantity] = useState(0);

  // SKU → 상품명 (다이얼로그 미리보기에 표시)
  const productNameBySku = useMemo(() => {
    const map: Record<string, string> = {};
    for (const page of productsPages?.pages ?? []) {
      for (const p of page.items) map[p.sku] = p.name;
    }
    return map;
  }, [productsPages]);

  const rows: InventoryRow[] =
    data?.data?.map((inv) => ({
      id: String(inv.id),
      productId: String(inv.product_id),
      sku: inv.sku,
      warehouse: inv.warehouse_id,
      available: inv.available,
      allocated: inv.allocated,
      total: inv.total_quantity,
      raw: inv,
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
          aria-label={tc("selectRow")}
        />
      ),
    }),
    columnHelper.accessor("sku", {
      header: t("columnSku"),
      size: 140,
      cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
    }),
    columnHelper.display({
      id: "name",
      header: t("columnProduct"),
      size: 220,
      cell: ({ row }) => (
        <span className="text-text-secondary">
          {productNameBySku[row.original.sku] ?? "—"}
        </span>
      ),
    }),
    columnHelper.accessor("warehouse", {
      header: t("columnWarehouse"),
      size: 100,
    }),
    columnHelper.accessor("available", {
      header: t("columnAvailable"),
      size: 90,
      cell: (info) => (
        <span className="font-mono text-state-success">{formatNumber(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor("allocated", {
      header: t("columnAllocated"),
      size: 90,
      cell: (info) => (
        <span className="font-mono text-state-warn">{formatNumber(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor("total", {
      header: t("columnTotal"),
      size: 90,
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

  const selectedCount = Object.keys(rowSelection).length;
  const selectedItems = Object.keys(rowSelection)
    .map((idx) => rows[Number(idx)]?.raw)
    .filter(Boolean) as InventoryItem[];

  return (
    <div className="space-y-4">
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-accent-iris/10 px-4 py-2">
          <span className="text-sm font-medium text-accent-iris">
            {tc("selected", { count: selectedCount })}
          </span>
          <button
            type="button"
            onClick={() => setShowBulk(true)}
            disabled={bulkEdit.isPending}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-accent-iris transition-colors hover:bg-accent-iris/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Boxes className="size-3.5" />
            {tb("bulkAdjust")}
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={rows}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        emptyIcon={<Warehouse className="size-12" />}
        emptyMessage={t("empty")}
        emptyHint={t("emptyHint")}
      />

      <BulkInventoryEditDialog
        open={showBulk}
        onOpenChange={setShowBulk}
        selectedItems={selectedItems}
        productNameBySku={productNameBySku}
        onApplied={() => setRowSelection({})}
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
    </div>
  );
}
