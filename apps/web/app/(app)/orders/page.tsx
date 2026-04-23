import { ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { OrdersTable } from "@/features/orders";

export default function OrdersPage() {
  const t = useTranslations("orders");

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <ShoppingCart className="size-6 text-text-secondary" />
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {t("title")}
        </h1>
      </div>
      <OrdersTable />
    </div>
  );
}
