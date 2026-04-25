"use client";

import { useState } from "react";
import { ArrowLeft, Edit, Package, Trash2, ImageIcon, Plus, X, ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChannelBadge, SyncStatus } from "@/components/patterns";
import { useDeleteProduct, useAddProductImage, useDeleteProductImage, useResyncProduct, type ChannelListingInfo } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { DeleteProductDialog } from "./DeleteProductDialog";
import { PriceHistoryCard } from "./PriceHistoryCard";

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
  channel_listings: ChannelListingInfo[];
  images: ProductImage[];
}

interface ProductDetailProps {
  product?: ProductDetailData | null;
}

/** sync_status를 SyncStatus 컴포넌트 형식으로 변환 */
function toSyncStatus(status: string): "synced" | "syncing" | "pending" | "failed" {
  const map: Record<string, "synced" | "syncing" | "pending" | "failed"> = {
    SYNCED: "synced",
    PENDING: "pending",
    FAILED: "failed",
    STALE: "pending",
  };
  return map[status] ?? "pending";
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
  const resync = useResyncProduct(product?.id ?? "");

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <Package className="size-12 text-text-tertiary" />
        <p className="text-text-secondary">{t("notFound")}</p>
        <Link href="/products" className="text-sm text-accent-iris hover:underline">
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

  async function handleDelete(channelTypes: string[]) {
    const res = await deleteProduct.mutateAsync({ id: product!.id, channelTypes });
    const results = res?.data?.channel_results ?? [];
    const needsReconnect = results.some((r) => r.requires_reconnect);
    const failed = results.filter((r) => !r.success);

    if (needsReconnect) {
      toast.error(t("deleteAuthExpired"), {
        action: { label: t("goToChannels"), onClick: () => router.push("/channels") },
        duration: 8000,
      });
    } else if (failed.length > 0) {
      const names = failed.map((r) => r.channel_type).join(", ");
      toast.warning(t("deleteChannelFailed", { channels: names }));
    } else {
      toast.success(t("deleteSuccess"));
    }
    router.push("/products");
  }

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
          <h1 className="text-2xl font-bold text-text-primary">{product.name}</h1>
          <p className="mt-0.5 font-mono text-sm text-text-tertiary">{product.sku}</p>
        </div>

        {/* 연결된 채널 배지 — 헤더에도 표시 */}
        {product.channel_listings.length > 0 && (
          <div className="flex gap-1.5">
            {product.channel_listings.map((cl) => (
              <ChannelBadge key={cl.channel_type} code={cl.channel_type} />
            ))}
          </div>
        )}

        <DropdownMenu
          trigger={
            <button
              type="button"
              className="cursor-pointer rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2"
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

      <DeleteProductDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        productName={product.name}
        channelListings={product.channel_listings}
        onConfirm={handleDelete}
        loading={deleteProduct.isPending}
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
                    <InfoRow label={t("fieldPrice")} value={formatCurrency(product.price)} mono />
                    <InfoRow label={t("status")} value={product.status} />
                    <InfoRow label={t("createdAt")} value={formatDate(product.createdAt)} />
                    <InfoRow label={t("updatedAt")} value={formatDate(product.updatedAt)} />
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

                <div className="lg:col-span-2">
                  <PriceHistoryCard productId={product.id} />
                </div>
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
                      className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-accent-iris px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80 disabled:cursor-not-allowed disabled:opacity-50"
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
                            className="absolute right-2 top-2 flex size-7 cursor-pointer items-center justify-center rounded-full bg-bg-elevated/80 text-text-primary opacity-0 transition-opacity hover:bg-state-error hover:text-white group-hover:opacity-100"
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
                  {product.channel_listings.length === 0 ? (
                    <p className="py-8 text-center text-sm text-text-tertiary">
                      {t("noListings")}
                    </p>
                  ) : (
                    <div className="divide-y divide-border-subtle">
                      {product.channel_listings.map((cl) => {
                        const canResync = cl.sync_status === "FAILED" || cl.sync_status === "STALE";
                        const isSyncing = resync.isPending && resync.variables === cl.channel_type;
                        return (
                          <div key={cl.channel_type} className="flex items-center justify-between py-4">
                            <div className="flex items-center gap-3">
                              <ChannelBadge code={cl.channel_type} />
                              <span className="font-mono text-xs text-text-secondary">
                                #{cl.external_id}
                              </span>
                              {cl.external_url && (
                                <a
                                  href={cl.external_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-text-tertiary hover:text-accent-iris transition-colors"
                                  aria-label="채널 페이지 열기"
                                >
                                  <ExternalLink className="size-3.5" />
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <SyncStatus status={isSyncing ? "syncing" : toSyncStatus(cl.sync_status)} />
                              {canResync && (
                                <button
                                  type="button"
                                  disabled={resync.isPending}
                                  onClick={async () => {
                                    try {
                                      const res = await resync.mutateAsync(cl.channel_type);
                                      if (res.data?.success) {
                                        toast.success(t("resyncSuccess", { channel: cl.channel_type }));
                                      } else {
                                        toast.error(res.data?.error ?? t("resyncError"));
                                      }
                                    } catch {
                                      toast.error(t("resyncError"));
                                    }
                                  }}
                                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-border-subtle px-2 py-1 text-xs text-text-secondary transition-colors hover:border-accent-iris/50 hover:text-accent-iris disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <RefreshCw className={`size-3 ${isSyncing ? "animate-spin" : ""}`} />
                                  {t("resync")}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
                    <StatBlock label={t("fieldStock")} value={String(product.stock)} />
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

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-text-tertiary">{label}</span>
      <span className={`text-sm text-text-primary ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg-canvas p-4">
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-text-primary">{value}</p>
    </div>
  );
}
