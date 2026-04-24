"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { MatchingList } from "@/features/products/MatchingList";

export default function ProductsMatchingPage() {
  const t = useTranslations("matching");
  const tp = useTranslations("products");

  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { label: tp("title"), href: "/products" },
          { label: t("title") },
        ]}
      />
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Sparkles className="size-6 text-text-secondary" />
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {t("title")}
          </h1>
        </div>
        <Link
          href="/products"
          className="text-sm text-accent-iris hover:underline"
        >
          {tp("title")}
        </Link>
      </div>
      <MatchingList />
    </div>
  );
}
