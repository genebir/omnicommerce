"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  XCircle,
  RotateCcw,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChannelBadge } from "@/components/patterns";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownItem,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";
import { useUpdateOrderStatus, useUpdateOrderTracking } from "@/lib/hooks";
import { TrackingDialog } from "./TrackingDialog";

interface OrderItem {
  id: string;
  productName: string;
  sku: string | null;
  optionText: string | null;
  productId: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderDetailData {
  id: string;
  orderNumber: string;
  channel: string;
  status: string;
  totalAmount: number;
  shippingFee: number;
  buyer: {
    name: string | null;
    phone: string | null;
    email: string | null;
  };
  recipient: {
    name: string | null;
    phone: string | null;
    address: string | null;
    zipcode: string | null;
  };
  trackingNumber: string | null;
  trackingCompany: string | null;
  orderedAt: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: OrderItem[];
}

const statusColors: Record<string, string> = {
  PAID: "bg-accent-iris/15 text-accent-iris",
  PREPARING: "bg-accent-amber/15 text-accent-amber",
  SHIPPED: "bg-accent-aurora/15 text-accent-aurora",
  DELIVERED: "bg-state-success/15 text-state-success",
  CANCELED: "bg-state-error/15 text-state-error",
  REFUNDED: "bg-text-tertiary/15 text-text-tertiary",
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  PAID: ["PREPARING", "CANCELED"],
  PREPARING: ["SHIPPED", "CANCELED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELED: [],
  REFUNDED: [],
};

interface OrderDetailProps {
  order?: OrderDetailData | null;
}

type StatusKey =
  | "statusPaid"
  | "statusPreparing"
  | "statusShipped"
  | "statusDelivered"
  | "statusCanceled"
  | "statusRefunded";

function statusKeyOf(status: string): StatusKey {
  return `status${status.charAt(0)}${status.slice(1).toLowerCase()}` as StatusKey;
}

export function OrderDetail({ order }: OrderDetailProps) {
  const t = useTranslations("orders");
  const tc = useTranslations("common");
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [showTracking, setShowTracking] = useState(false);
  const [editTracking, setEditTracking] = useState(false);
  const updateStatus = useUpdateOrderStatus(order?.id ?? "");
  const updateTracking = useUpdateOrderTracking(order?.id ?? "");

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <Package className="size-12 text-text-tertiary" />
        <p className="text-text-secondary">{t("notFound")}</p>
        <Link href="/orders" className="text-sm text-accent-iris hover:underline">
          {tc("back")}
        </Link>
      </div>
    );
  }

  // cafe24가 구매자/결제 정보를 마스킹해서 보냄 (mall.read_personal 미사용 정책)
  // → 사용자에게 "cafe24 관리자에서 직접 확인" 안내
  const isMaskedByChannel =
    order.channel === "cafe24" &&
    order.buyer.name === null &&
    order.totalAmount === 0;

  const itemsSubtotal = order.items.reduce(
    (sum, it) => sum + (it.totalPrice || it.unitPrice * it.quantity),
    0,
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link
          href="/orders"
          className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-surface-2 hover:text-text-primary"
          aria-label={tc("back")}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold text-text-primary">
              {order.orderNumber}
            </h1>
            <ChannelBadge code={order.channel} />
          </div>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {order.orderedAt ? formatDateTime(order.orderedAt) : "—"}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[order.status] ?? "bg-bg-surface-2 text-text-secondary"}`}
        >
          {t(statusKeyOf(order.status))}
        </span>
        {(VALID_TRANSITIONS[order.status]?.length ?? 0) > 0 && (
          <DropdownMenu
            trigger={
              <button
                type="button"
                className="cursor-pointer rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2"
              >
                {t("changeStatus")}
              </button>
            }
          >
            {VALID_TRANSITIONS[order.status]?.map((nextStatus) => {
              const isDestructive =
                nextStatus === "CANCELED" || nextStatus === "REFUNDED";
              return (
                <DropdownItem
                  key={nextStatus}
                  destructive={isDestructive}
                  onClick={() => {
                    if (nextStatus === "SHIPPED") {
                      setShowTracking(true);
                    } else {
                      setPendingStatus(nextStatus);
                    }
                  }}
                >
                  {t(statusKeyOf(nextStatus))}
                </DropdownItem>
              );
            })}
          </DropdownMenu>
        )}
        {/* 배송 중이면서 운송장이 없으면 입력 유도, 있으면 수정 버튼 */}
        {order.status === "SHIPPED" && (
          <button
            type="button"
            onClick={() => setEditTracking(true)}
            className="cursor-pointer rounded-xl border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2"
          >
            <Truck className="mr-1.5 inline size-3.5" />
            {order.trackingNumber ? t("trackingEdit") : t("trackingEnterNow")}
          </button>
        )}
      </div>

      {/* 일반 상태 전환 확인 다이얼로그 (SHIPPED 제외) */}
      <ConfirmDialog
        open={!!pendingStatus}
        onOpenChange={(open) => !open && setPendingStatus(null)}
        title={t("changeStatus")}
        description={t("changeStatusConfirm", {
          status: pendingStatus ? t(statusKeyOf(pendingStatus)) : "",
        })}
        confirmLabel={tc("confirm")}
        cancelLabel={tc("cancel")}
        destructive={pendingStatus === "CANCELED" || pendingStatus === "REFUNDED"}
        loading={updateStatus.isPending}
        onConfirm={async () => {
          if (!pendingStatus) return;
          await updateStatus.mutateAsync({ status: pendingStatus });
          toast.success(t("statusChangeSuccess"));
          setPendingStatus(null);
        }}
      />

      {/* SHIPPED 전환 시 — 운송장 입력 다이얼로그 */}
      <TrackingDialog
        open={showTracking}
        onOpenChange={setShowTracking}
        loading={updateStatus.isPending}
        onConfirmWithTracking={async (info) => {
          await updateStatus.mutateAsync({
            status: "SHIPPED",
            tracking_company: info.tracking_company,
            tracking_number: info.tracking_number,
          });
          toast.success(t("statusChangeSuccess"));
          setShowTracking(false);
        }}
        onConfirmWithoutTracking={async () => {
          await updateStatus.mutateAsync({ status: "SHIPPED" });
          toast.success(t("statusChangeSuccess"));
          setShowTracking(false);
        }}
      />

      {/* 운송장 수정 다이얼로그 */}
      <TrackingDialog
        open={editTracking}
        onOpenChange={setEditTracking}
        editOnly
        initialValues={{
          tracking_company: order.trackingCompany,
          tracking_number: order.trackingNumber,
        }}
        loading={updateTracking.isPending}
        onConfirmWithTracking={async (info) => {
          await updateTracking.mutateAsync(info);
          toast.success(t("trackingSaveSuccess"));
          setEditTracking(false);
        }}
      />

      {isMaskedByChannel && (
        <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-bg-surface-2 p-4">
          <Info className="mt-0.5 size-5 shrink-0 text-text-tertiary" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-text-primary">
              {t("buyerInfoMaskedTitle")}
            </p>
            <p className="text-text-secondary">
              {t("buyerInfoMaskedDesc")}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 주문자 */}
        <Card>
          <CardHeader>
            <CardTitle>{t("buyerInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label={t("customerName")} value={order.buyer.name ?? "—"} />
            <InfoRow
              label={t("customerPhone")}
              value={order.buyer.phone ?? "—"}
              mono={!!order.buyer.phone}
            />
            <InfoRow
              label={t("customerEmail")}
              value={order.buyer.email ?? "—"}
            />
          </CardContent>
        </Card>

        {/* 수령자 */}
        <Card>
          <CardHeader>
            <CardTitle>{t("recipientInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label={t("recipientName")}
              value={order.recipient.name ?? "—"}
            />
            <InfoRow
              label={t("recipientPhone")}
              value={order.recipient.phone ?? "—"}
              mono={!!order.recipient.phone}
            />
            <InfoRow
              label={t("recipientAddress")}
              value={
                order.recipient.address
                  ? `${order.recipient.zipcode ? `(${order.recipient.zipcode}) ` : ""}${order.recipient.address}`
                  : "—"
              }
            />
            {order.trackingNumber && (
              <InfoRow
                label={t("trackingNumber")}
                value={`${order.trackingCompany ?? ""} ${order.trackingNumber}`.trim()}
                mono
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 결제 요약 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("paymentSummary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-tertiary">{t("itemsSubtotal")}</span>
              <span className="font-mono text-text-primary">
                {formatCurrency(itemsSubtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-tertiary">{t("shippingFee")}</span>
              <span className="font-mono text-text-primary">
                {formatCurrency(order.shippingFee)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border-subtle pt-3">
              <span className="font-medium text-text-primary">
                {t("paymentTotal")}
              </span>
              <span className="font-mono text-lg font-bold text-text-primary">
                {formatCurrency(order.totalAmount || itemsSubtotal + order.shippingFee)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 타임라인 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("timeline")}</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTimeline order={order} t={t} />
        </CardContent>
      </Card>

      {/* 주문 상품 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("items")}</CardTitle>
        </CardHeader>
        <CardContent>
          {order.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-tertiary">
              {t("noItems")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-text-tertiary">
                    <th className="pb-3 font-medium">{t("productName")}</th>
                    <th className="pb-3 font-medium">{t("columnSku")}</th>
                    <th className="pb-3 text-right font-medium">{t("quantity")}</th>
                    <th className="pb-3 text-right font-medium">{t("unitPrice")}</th>
                    <th className="pb-3 text-right font-medium">{t("subtotal")}</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border-subtle last:border-0"
                    >
                      <td className="py-3 text-text-primary">
                        {item.productId ? (
                          <Link
                            href={`/products/${item.productId}`}
                            className="text-accent-iris hover:underline"
                          >
                            {item.productName}
                          </Link>
                        ) : (
                          item.productName
                        )}
                        {item.optionText && (
                          <span className="ml-2 text-xs text-text-tertiary">
                            ({item.optionText})
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-mono text-xs text-text-secondary">
                        {item.sku ?? "—"}
                      </td>
                      <td className="py-3 text-right font-mono text-text-secondary">
                        {item.quantity}
                      </td>
                      <td className="py-3 text-right font-mono text-text-secondary">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-3 text-right font-mono text-text-primary">
                        {formatCurrency(item.totalPrice || item.unitPrice * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
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
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-sm text-text-tertiary">{label}</span>
      <span
        className={`text-right text-sm text-text-primary ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

const TIMELINE_STEPS = [
  { status: "PAID", icon: CheckCircle2, color: "text-accent-iris" },
  { status: "PREPARING", icon: Clock, color: "text-accent-amber" },
  { status: "SHIPPED", icon: Truck, color: "text-accent-aurora" },
  { status: "DELIVERED", icon: PackageCheck, color: "text-state-success" },
] as const;

const STATUS_ORDER = ["PAID", "PREPARING", "SHIPPED", "DELIVERED"];

function OrderTimeline({
  order,
  t,
}: {
  order: OrderDetailData;
  t: ReturnType<typeof useTranslations<"orders">>;
}) {
  const isCanceled = order.status === "CANCELED";
  const isRefunded = order.status === "REFUNDED";
  const currentIdx = STATUS_ORDER.indexOf(order.status);

  const timestamps: Record<string, string | null | undefined> = {
    PAID: order.paidAt || order.orderedAt,
    PREPARING: undefined,
    SHIPPED: order.shippedAt,
    DELIVERED: order.deliveredAt,
  };

  return (
    <div className="relative flex items-start justify-between gap-2">
      {TIMELINE_STEPS.map((step, idx) => {
        const isComplete = idx <= currentIdx && !isCanceled && !isRefunded;
        const isCurrent = idx === currentIdx && !isCanceled && !isRefunded;
        const Icon = step.icon;
        const ts = timestamps[step.status];
        const statusKey = statusKeyOf(step.status);

        return (
          <div key={step.status} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative flex items-center justify-center">
              {idx > 0 && (
                <div
                  className={`absolute right-1/2 top-1/2 h-0.5 -translate-y-1/2 ${
                    isComplete ? "bg-accent-iris" : "bg-border-subtle"
                  }`}
                  style={{ width: "calc(100% + 2rem)" }}
                />
              )}
              <div
                className={`relative z-10 flex size-10 items-center justify-center rounded-full ${
                  isComplete
                    ? `bg-accent-iris/15 ${step.color}`
                    : "bg-bg-surface-2 text-text-tertiary"
                } ${isCurrent ? "ring-2 ring-accent-iris ring-offset-2 ring-offset-bg-surface" : ""}`}
              >
                <Icon className="size-5" />
              </div>
            </div>
            <span
              className={`text-xs font-medium ${isComplete ? "text-text-primary" : "text-text-tertiary"}`}
            >
              {t(statusKey)}
            </span>
            {ts && (
              <span className="font-mono text-[10px] text-text-tertiary">
                {formatDate(ts)}
              </span>
            )}
          </div>
        );
      })}

      {(isCanceled || isRefunded) && (
        <div className="flex flex-1 flex-col items-center gap-2">
          <div className="relative z-10 flex size-10 items-center justify-center rounded-full bg-state-error/15 text-state-error ring-2 ring-state-error ring-offset-2 ring-offset-bg-surface">
            {isCanceled ? <XCircle className="size-5" /> : <RotateCcw className="size-5" />}
          </div>
          <span className="text-xs font-medium text-state-error">
            {isCanceled ? t("statusCanceled") : t("statusRefunded")}
          </span>
        </div>
      )}
    </div>
  );
}
