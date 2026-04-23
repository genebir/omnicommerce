"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ProductForm } from "@/features/products/ProductForm";
import { useProduct } from "@/lib/hooks";

export default function ProductEditPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("products");
  const { data, isLoading } = useProduct(params.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  const product = data?.data;
  const defaultValues = product
    ? {
        name: product.name,
        sku: product.sku,
        price: product.price,
        stock: 0,
        description: product.description ?? "",
      }
    : undefined;

  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { label: t("title"), href: "/products" },
          { label: product?.name ?? "...", href: `/products/${params.id}` },
          { label: t("editProduct") },
        ]}
      />
      <ProductForm defaultValues={defaultValues} productId={params.id} />
    </div>
  );
}
