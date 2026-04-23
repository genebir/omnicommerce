import { Package } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProductForm } from "@/features/products/ProductForm";

export default function NewProductPage() {
  const t = useTranslations("products");

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <Package className="size-6 text-text-secondary" />
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {t("newProduct")}
        </h1>
      </div>
      <ProductForm />
    </div>
  );
}
