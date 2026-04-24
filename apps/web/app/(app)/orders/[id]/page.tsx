"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { OrderDetail } from "@/features/orders/OrderDetail";
import { useOrder } from "@/lib/hooks";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("orders");
  const { data, isLoading } = useOrder(params.id);

  const d = data?.data;
  const order = d
    ? {
        id: String(d.id),
        orderNumber: d.external_order_id,
        channel: d.channel_type,
        status: d.status,
        totalAmount: d.total_amount,
        shippingFee: d.shipping_fee,
        buyer: {
          name: d.buyer_name,
          phone: d.buyer_phone,
          email: d.buyer_email,
        },
        recipient: {
          name: d.recipient_name,
          phone: d.recipient_phone,
          address: d.recipient_address,
          zipcode: d.recipient_zipcode,
        },
        trackingNumber: d.tracking_number,
        trackingCompany: d.tracking_company,
        orderedAt: d.ordered_at,
        paidAt: d.paid_at,
        shippedAt: d.shipped_at,
        deliveredAt: d.delivered_at,
        items:
          d.items?.map((item) => ({
            id: String(item.id),
            productName: item.name,
            sku: item.sku,
            optionText: item.option_text,
            productId: item.product_id,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            totalPrice: item.total_price,
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
          { label: t("title"), href: "/orders" },
          { label: order?.orderNumber ?? t("detail") },
        ]}
      />
      <OrderDetail order={order} />
    </div>
  );
}
