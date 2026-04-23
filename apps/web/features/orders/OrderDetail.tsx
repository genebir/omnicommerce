"use client";

import { useState } from "react";
import { ArrowLeft, Package, CheckCircle2, Clock, Truck, PackageCheck, XCircle, RotateCcw } from "lucide-react";
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
import { useUpdateOrderStatus } from "@/lib/hooks";

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface OrderDetailData {
  id: string;
  orderNumber: string;
  channel: string;
  status: string;
  totalAmount: number;
  shippingFee: number;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  orderedAt: string;
  paidAt: string;
  shippedAt?: string;
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

export function OrderDetail({ order }: OrderDetailProps) {
  const t = useTranslations("orders");
  const tc = useTranslations("common");
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const updateStatus = useUpdateOrderStatus(order?.id ?? "");

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <Package className="size-12 text-text-tertiary" />
        <p className="text-text-secondary">{t("notFound")}</p>
        <Link
          href="/orders"
          className="text-sm text-accent-iris hover:underline"
        >
          {tc("back")}
        </Link>
      </div>
    );
  }

  const statusKey = `status${order.status.charAt(0)}${order.status.slice(1).toLowerCase()}` as
    | "statusPaid"
    | "statusPreparing"
    | "statusShipped"
    | "statusDelivered"
    | "statusCanceled"
    | "statusRefunded";

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
            <h1 className="text-2xl font-bold text-text-primary">
              {order.orderNumber}
            </h1>
            <ChannelBadge code={order.channel} />
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[order.status] ?? "bg-bg-surface-2 text-text-secondary"}`}
        >
          {t(statusKey)}
        </span>
        {(VALID_TRANSITIONS[order.status]?.length ?? 0) > 0 && (
          <DropdownMenu
            trigger={
              <button
                type="button"
                className="rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2"
              >
                {t("changeStatus")}
              </button>
            }
          >
            {VALID_TRANSITIONS[order.status]?.map((nextStatus) => {
              const key = `status${nextStatus.charAt(0)}${nextStatus.slice(1).toLowerCase()}` as keyof typeof statusColors;
              const isDestructive = nextStatus === "CANCELED" || nextStatus === "REFUNDED";
              return (
                <DropdownItem
                  key={nextStatus}
                  destructive={isDestructive}
                  onClick={() => setPendingStatus(nextStatus)}
                >
                  {t(key as "statusPaid" | "statusPreparing" | "statusShipped" | "statusDelivered" | "statusCanceled" | "statusRefunded")}
                </DropdownItem>
              );
            })}
          </DropdownMenu>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingStatus}
        onOpenChange={(open) => !open && setPendingStatus(null)}
        title={t("changeStatus")}
        description={t("changeStatusConfirm", {
          status: pendingStatus
            ? t(`status${pendingStatus.charAt(0)}${pendingStatus.slice(1).toLowerCase()}` as "statusPaid")
            : "",
        })}
        confirmLabel={tc("confirm")}
        cancelLabel={tc("cancel")}
        destructive={pendingStatus === "CANCELED" || pendingStatus === "REFUNDED"}
        loading={updateStatus.isPending}
        onConfirm={async () => {
          if (!pendingStatus) return;
          await updateStatus.mutateAsync(pendingStatus);
          toast.success(t("statusChangeSuccess"));
          setPendingStatus(null);
        }}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 주문 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>{t("orderInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label={t("columnOrderNumber")} value={order.orderNumber} mono />
            <InfoRow label={t("orderedAt")} value={formatDate(order.orderedAt)} />
            <InfoRow label={t("columnTotal")} value={formatCurrency(order.totalAmount)} mono />
          </CardContent>
        </Card>

        {/* 주문자 정보 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("customerInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label={t("customerName")} value={order.customer.name} />
            <InfoRow label={t("customerPhone")} value={order.customer.phone || "—"} mono />
            <InfoRow label={t("customerAddress")} value={order.customer.address || "—"} />
          </CardContent>
        </Card>
      </div>

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-text-tertiary">
                  <th className="pb-3 font-medium">{t("productName")}</th>
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
                    <td className="py-3 text-text-primary">{item.productName}</td>
                    <td className="py-3 text-right font-mono text-text-secondary">
                      {item.quantity}
                    </td>
                    <td className="py-3 text-right font-mono text-text-secondary">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="py-3 text-right font-mono text-text-primary">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={3}
                    className="pt-3 text-right font-medium text-text-secondary"
                  >
                    {t("columnTotal")}
                  </td>
                  <td className="pt-3 text-right font-mono text-lg font-semibold text-text-primary">
                    {formatCurrency(order.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
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

  const timestamps: Record<string, string | undefined> = {
    PAID: order.paidAt || order.orderedAt,
    PREPARING: undefined,
    SHIPPED: order.shippedAt,
    DELIVERED: undefined,
  };

  return (
    <div className="relative flex items-start justify-between gap-2">
      {TIMELINE_STEPS.map((step, idx) => {
        const isComplete = idx <= currentIdx && !isCanceled && !isRefunded;
        const isCurrent = idx === currentIdx && !isCanceled && !isRefunded;
        const Icon = step.icon;
        const ts = timestamps[step.status];
        const statusKey = `status${step.status.charAt(0)}${step.status.slice(1).toLowerCase()}` as
          | "statusPaid"
          | "statusPreparing"
          | "statusShipped"
          | "statusDelivered";

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
              <span className="text-[10px] font-mono text-text-tertiary">
                {formatDateTime(ts)}
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
