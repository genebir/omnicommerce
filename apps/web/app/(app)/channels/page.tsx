import { Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChannelList } from "@/features/channels";

export default function ChannelsPage() {
  const t = useTranslations("channels");

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <Link2 className="size-6 text-text-secondary" />
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {t("title")}
        </h1>
      </div>
      <ChannelList />
    </div>
  );
}
