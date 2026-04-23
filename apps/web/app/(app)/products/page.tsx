import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProductsTable } from "@/features/products/ProductsTable";

export default function ProductsPage() {
  const t = useTranslations("products");

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="size-6 text-text-secondary" />
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {t("title")}
          </h1>
        </div>
        <Link
          href="/products/new"
          className="flex items-center gap-2 rounded-xl bg-accent-iris px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80"
        >
          <Plus className="size-4" />
          {t("newProduct")}
        </Link>
      </div>
      <ProductsTable />
    </div>
  );
}
