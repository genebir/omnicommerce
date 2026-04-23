"use client";

import { useRef, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef as ColumnDefType,
  type RowSelectionState,
  type OnChangeFn,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface DataTableProps<TData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDefType<TData, any>[];
  data: TData[];
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  emptyIcon?: React.ReactNode;
  emptyMessage?: string;
  emptyHint?: string;
  emptyAction?: React.ReactNode;
  rowHeight?: number;
}

export function DataTable<TData>({
  columns,
  data,
  rowSelection = {},
  onRowSelectionChange,
  emptyIcon,
  emptyMessage,
  emptyHint,
  emptyAction,
  rowHeight = 48,
}: DataTableProps<TData>) {
  const t = useTranslations("common");
  const parentRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    state: { rowSelection },
    onRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: !!onRowSelectionChange,
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  const selectedCount = Object.keys(rowSelection).length;

  const columnWidths = useMemo(() => {
    return table.getHeaderGroups()[0]?.headers.map((h) => h.getSize()) ?? [];
  }, [table]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border-subtle bg-bg-surface py-24">
        {emptyIcon && <div className="mb-4 text-text-tertiary">{emptyIcon}</div>}
        <p className="text-text-secondary">{emptyMessage ?? t("noResults")}</p>
        {emptyHint && (
          <p className="mt-1 text-sm text-text-tertiary">{emptyHint}</p>
        )}
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-border-subtle bg-bg-surface">
      {/* 플로팅 액션바 */}
      {selectedCount > 0 && (
        <div className="sticky top-0 z-10 flex items-center gap-4 rounded-t-2xl border-b border-border-subtle bg-accent-iris/10 px-4 py-2">
          <span className="text-sm font-medium text-accent-iris">
            {t("selected", { count: selectedCount })}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => onRowSelectionChange?.({})}
            className="cursor-pointer text-xs text-text-tertiary hover:text-text-primary"
          >
            {t("cancel")}
          </button>
        </div>
      )}

      {/* 테이블 헤더 */}
      <div className="border-b border-border-subtle">
        {table.getHeaderGroups().map((headerGroup) => (
          <div key={headerGroup.id} className="flex">
            {headerGroup.headers.map((header, i) => (
              <div
                key={header.id}
                className="flex items-center px-4 py-3 text-xs font-medium text-text-tertiary"
                style={{ width: columnWidths[i], minWidth: columnWidths[i] }}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 가상화된 행 */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight: "calc(100vh - 280px)" }}
      >
        <div
          style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <div
                key={row.id}
                className={cn(
                  "absolute left-0 flex w-full items-center border-b border-border-subtle transition-colors hover:bg-bg-surface-2",
                  row.getIsSelected() && "bg-accent-iris/5",
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.getVisibleCells().map((cell, i) => (
                  <div
                    key={cell.id}
                    className="flex items-center px-4 text-sm text-text-primary"
                    style={{ width: columnWidths[i], minWidth: columnWidths[i] }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
