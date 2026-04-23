"use client";

import { useState } from "react";
import { ArrowLeft, Edit, Package, Trash2, ImageIcon, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChannelBadge, SyncStatus } from "@/components/patterns";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDeleteProduct, useAddProductImage, useDeleteProductImage } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/utils/format";

interface ChannelListing {
  channelCode: string;
  externalId: string;
  syncStatus: "synced" | "syncing" | "pending" | "failed";
  lastSyncedAt: string;
}

interface ProductImage {
  id: string;
  url: string;
  sort_order: number;
  alt_text: string | null;
}

interface ProductDetailData {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  channelListings: ChannelListing[];
  images: ProductImage[];
}

interface ProductDetailProps {
  product?: ProductDetailData | null;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const deleteProduct = useDeleteProduct();
  const addImage = useAddProductImage(product?.id ?? "");
  const deleteImage = useDeleteProductImage(product?.id ?? "");

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <Package className="size-12 text-text-tertiary" />
        <p className="text-text-secondary">{t("notFound")}</p>
        <Link
          href="/products"
          className="text-sm text-accent-iris hover:underline"
        >
          {tc("back")}
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: "info", label: t("productInfo") },
    { id: "images", label: t("images") },
    { id: "channels", label: t("channelListings") },
    { id: "inventory", label: t("inventoryInfo") },
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link
          href="/products"
          className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-surface-2 hover:text-text-primary"
          aria-label={tc("back")}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text-primary">
            {product.name}
          </h1>
          <p className="mt-0.5 font-mono text-sm text-text-tertiary">
            {product.sku}
          </p>
        </div>
        <DropdownMenu
          trigger={
            <button
              type="button"
              className="rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2"
            >
              ···
            </button>
          }
        >
          <DropdownItem
            icon={<Edit className="size-4" />}
            onClick={() => router.push(`/products/${product.id}/edit`)}
          >
            {t("editProduct")}
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem
            icon={<Trash2 className="size-4" />}
            destructive
            onClick={() => setShowDeleteDialog(true)}
          >
            {t("deleteProduct")}
          </DropdownItem>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t("deleteProduct")}
        description={t("deleteConfirm")}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        destructive
        loading={deleteProduct.isPending}
        onConfirm={async () => {
          await deleteProduct.mutateAsync(product.id);
          toast.success(t("deleteSuccess"));
          router.push("/products");
        }}
      />

      {/* 탭 */}
      <Tabs tabs={tabs} defaultTab="info">
        {(activeTab) => (
          <>
            {activeTab === "info" && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("productInfo")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <InfoRow label={t("fieldName")} value={product.name} />
                    <InfoRow label={t("fieldSku")} value={product.sku} mono />
                    <InfoRow
                      label={t("fieldPrice")}
                      value={formatCurrency(product.price)}
                      mono
                    />
                    <InfoRow label={t("status")} value={product.status} />
                    <InfoRow
                      label={t("createdAt")}
                      value={formatDate(product.createdAt)}
                    />
                    <InfoRow
                      label={t("updatedAt")}
                      value={formatDate(product.updatedAt)}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t("description")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm text-text-secondary">
                      {product.description || "—"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "images" && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("images")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form
                    className="flex gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!imageUrl.trim()) return;
                      await addImage.mutateAsync({ url: imageUrl.trim() });
                      setImageUrl("");
                      toast.success(t("imageAdded"));
                    }}
                  >
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder={t("imageUrlPlaceholder")}
                      className="flex-1 rounded-lg border border-border-strong bg-bg-canvas px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-ring-focus"
                    />
                    <button
                      type="submit"
                      disabled={addImage.isPending || !imageUrl.trim()}
                      className="flex items-center gap-1.5 rounded-xl bg-accent-iris px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80 disabled:opacity-50"
                    >
                      <Plus className="size-4" />
                      {t("addImage")}
                    </button>
                  </form>

                  {product.images.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12">
                      <ImageIcon className="size-10 text-text-tertiary" />
                      <p className="text-sm text-text-tertiary">{t("noImages")}</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {product.images.map((img) => (
                        <div
                          key={img.id}
                          className="group relative aspect-square overflow-hidden rounded-xl border border-border-subtle bg-bg-canvas"
                        >
                          <img
                            src={img.url}
                            alt={img.alt_text ?? product.name}
                            className="size-full object-cover transition-transform group-hover:scale-105"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteImage.mutateAsync(img.id);
                              toast.success(t("imageDeleted"));
                            }}
                            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-bg-elevated/80 text-text-primary opacity-0 transition-opacity hover:bg-state-error hover:text-white group-hover:opacity-100"
                            aria-label={tc("delete")}
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "channels" && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("channelListings")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {product.channelListings.length === 0 ? (
                    <p className="py-8 text-center text-sm text-text-tertiary">
                      {t("noListings")}
                    </p>
                  ) : (
                    <div className="divide-y divide-border-subtle">
                      {product.channelListings.map((listing) => (
                        <div
                          key={listing.channelCode}
                          className="flex items-center justify-between py-3"
                        >
                          <div className="flex items-center gap-3">
                            <ChannelBadge code={listing.channelCode} />
                            <span className="font-mono text-xs text-text-secondary">
                              {listing.externalId}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-text-tertiary">
                              {formatDate(listing.lastSyncedAt)}
                            </span>
                            <SyncStatus status={listing.syncStatus} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "inventory" && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("inventoryInfo")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <StatBlock
                      label={t("fieldStock")}
                      value={String(product.stock)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </Tabs>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-text-tertiary">{label}</span>
      <span
        className={`text-sm text-text-primary ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg-canvas p-4">
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-text-primary">
        {value}
      </p>
    </div>
  );
}
