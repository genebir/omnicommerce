"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ChannelList } from "@/features/channels";

export default function ChannelsPage() {
  const t = useTranslations("channels");
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    const cafe24Status = searchParams.get("cafe24");
    if (cafe24Status === "connected") {
      toast.success(t("step3DoneDesc", { channel: "Cafe24" }));
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      router.replace("/channels");
    } else if (cafe24Status === "error") {
      toast.error(t("connectError"));
      router.replace("/channels");
    }
  }, [searchParams, router, queryClient, t]);

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
