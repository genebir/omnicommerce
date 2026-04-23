import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { SettingsContent } from "@/features/settings";

export default function SettingsPage() {
  const t = useTranslations("settings");

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <Settings className="size-6 text-text-secondary" />
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {t("title")}
        </h1>
      </div>
      <SettingsContent />
    </div>
  );
}
