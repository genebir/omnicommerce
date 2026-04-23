import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { createColumnHelper, type RowSelectionState } from "@tanstack/react-table";
import { Package } from "lucide-react";
import { DataTable } from "./DataTable";

interface SampleRow {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

const columnHelper = createColumnHelper<SampleRow>();

const columns = [
  columnHelper.accessor("name", { header: "상품명", size: 200 }),
  columnHelper.accessor("sku", { header: "SKU", size: 120 }),
  columnHelper.accessor("price", {
    header: "가격",
    size: 100,
    cell: (info) => `₩${info.getValue().toLocaleString("ko-KR")}`,
  }),
  columnHelper.accessor("stock", { header: "재고", size: 80 }),
];

const sampleData: SampleRow[] = Array.from({ length: 50 }, (_, i) => ({
  id: `product-${i + 1}`,
  name: `샘플 상품 ${i + 1}`,
  sku: `SKU-${String(i + 1).padStart(4, "0")}`,
  price: (i + 1) * 12000,
  stock: Math.floor((i * 7 + 3) % 100),
}));

const meta: Meta<typeof DataTable<SampleRow>> = {
  title: "Patterns/DataTable",
  component: DataTable,
};

export default meta;
type Story = StoryObj<typeof DataTable<SampleRow>>;

export const Default: Story = {
  args: {
    columns,
    data: sampleData.slice(0, 10),
  },
};

export const Empty: Story = {
  args: {
    columns,
    data: [],
    emptyIcon: <Package className="size-12" />,
    emptyMessage: "등록된 상품이 없습니다",
    emptyHint: "첫 번째 상품을 등록해보세요",
    emptyAction: (
      <button
        type="button"
        className="rounded-xl bg-accent-iris px-4 py-2 text-sm font-medium text-white"
      >
        상품 등록
      </button>
    ),
  },
};

export const WithSelection: Story = {
  render: () => {
    const [selection, setSelection] = useState<RowSelectionState>({
      "0": true,
      "2": true,
    });
    return (
      <DataTable
        columns={columns}
        data={sampleData.slice(0, 10)}
        rowSelection={selection}
        onRowSelectionChange={setSelection}
      />
    );
  },
};

export const LargeDataset: Story = {
  args: {
    columns,
    data: sampleData,
  },
};
