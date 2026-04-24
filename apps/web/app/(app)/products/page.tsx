"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, Plus, Download, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProductsTable } from "@/features/products/ProductsTable";
import { ImportProductsModal } from "@/features/channels/ImportProductsModal";
import { usePendingMatches } from "@/lib/hooks";

export default function ProductsPage() {
  const t = useTranslations("products");
  const tc = useTranslations("channels");
  const tm = useTranslations("matching");
  const [importOpen, setImportOpen] = useState(false);
  const { data: pendingMatches } = usePendingMatches();
  const pendingCount = pendingMatches?.length ?? 0;

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
          {pendingCount > 0 && (
            <Link
              href="/products/matching"
              className="flex items-center gap-2 rounded-xl border border-state-warn/30 bg-state-warn/10 px-4 py-2.5 text-sm font-medium text-state-warn transition-colors hover:bg-state-warn/15"
            >
              <Sparkles className="size-4" />
              {tm("guideTitle", { count: pendingCount })}
            </Link>
          )}
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
