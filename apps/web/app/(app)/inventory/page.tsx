import { Warehouse } from "lucide-react";
import { useTranslations } from "next-intl";
import { InventoryTable } from "@/features/inventory";

export default function InventoryPage() {
  const t = useTranslations("inventory");

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <Warehouse className="size-6 text-text-secondary" />
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {t("title")}
        </h1>
      </div>
      <InventoryTable />
    </div>
  );
}
