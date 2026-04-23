import { LayoutDashboard } from "lucide-react";
import { useTranslations } from "next-intl";
import { DashboardContent } from "@/features/dashboard/DashboardContent";

export default function DashboardPage() {
  const t = useTranslations("dashboard");

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <LayoutDashboard className="size-6 text-text-secondary" />
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {t("title")}
        </h1>
      </div>
      <DashboardContent />
    </div>
  );
}
