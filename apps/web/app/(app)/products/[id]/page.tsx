"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ProductDetail } from "@/features/products/ProductDetail";
import { useProduct } from "@/lib/hooks";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("products");
  const { data, isLoading } = useProduct(params.id);

  const product = data?.data
    ? {
        id: String(data.data.id),
        name: data.data.name,
        sku: data.data.sku,
        price: data.data.price,
        stock: 0,
        description: data.data.description ?? "",
        status: data.data.status,
        createdAt: data.data.created_at ?? "",
        updatedAt: data.data.updated_at ?? "",
        channelListings: [],
        images: data.data.images?.map((img) => ({
          id: String(img.id),
          url: img.url,
          sort_order: img.sort_order,
          alt_text: img.alt_text,
        })) ?? [],
      }
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { label: t("title"), href: "/products" },
          { label: product?.name ?? t("detail") },
        ]}
      />
      <ProductDetail product={product} />
    </div>
  );
}
