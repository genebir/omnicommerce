"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, Plus, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProductsTable } from "@/features/products/ProductsTable";
import { ImportProductsModal } from "@/features/channels/ImportProductsModal";

export default function ProductsPage() {
  const t = useTranslations("products");
  const tc = useTranslations("channels");
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="size-6 text-text-secondary" />
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {t("title")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-subtle px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2"
          >
            <Download className="size-4" />
            {tc("importFromChannel")}
          </button>
          <Link
            href="/products/new"
            className="flex items-center gap-2 rounded-xl bg-accent-iris px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80"
          >
            <Plus className="size-4" />
            {t("newProduct")}
          </Link>
        </div>
      </div>
      <ProductsTable />
      <ImportProductsModal open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
