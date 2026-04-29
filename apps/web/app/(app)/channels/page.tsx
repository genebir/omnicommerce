"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Link2, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ChannelList, SyncIssuePanel } from "@/features/channels";
import { useSyncIssues } from "@/lib/hooks";

type Tab = "channels" | "sync-issues";

function SyncIssuesBadge() {
  const { data } = useSyncIssues();
  if (!data || data.total === 0) return null;
  return (
    <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-state-warn text-[10px] font-bold text-white">
      {data.total > 99 ? "99+" : data.total}
    </span>
  );
}

export default function ChannelsPage() {
  const t = useTranslations("channels");
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("channels");

  useEffect(() => {
    const cafe24Status = searchParams.get("cafe24");
    if (cafe24Status === "connected") {
      toast.success(t("step3DoneDesc", { channel: "Cafe24" }));
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      router.replace("/channels");
    } else if (cafe24Status === "error") {
      const reason = searchParams.get("reason");
      const desc = searchParams.get("desc");
      if (reason === "invalid_scope") {
        toast.error(t("connectErrorInvalidScope"), {
          description: t("connectErrorInvalidScopeDesc"),
          duration: 12000,
        });
      } else if (reason && desc) {
        toast.error(`${t("connectError")} (${reason})`, {
          description: desc,
          duration: 8000,
        });
      } else if (reason) {
        toast.error(`${t("connectError")} (${reason})`);
      } else {
        toast.error(t("connectError"));
      }
      router.replace("/channels");
    }
  }, [searchParams, router, queryClient, t]);

  // 대시보드 "동기화 이슈" 카드에서 넘어온 경우 자동으로 sync-issues 탭 활성
  useEffect(() => {
    if (searchParams.get("tab") === "sync-issues") {
      setActiveTab("sync-issues");
    }
  }, [searchParams]);

  const tabs: { id: Tab; label: React.ReactNode }[] = [
    { id: "channels", label: t("title") },
    {
      id: "sync-issues",
      label: (
        <span className="flex items-center">
          {t("syncIssues")}
          <SyncIssuesBadge />
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link2 className="size-6 text-text-secondary" />
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {t("title")}
        </h1>
      </div>

      {/* 탭 */}
      <div className="mb-6 flex gap-1 border-b border-border-subtle">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`cursor-pointer px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-accent-iris text-accent-iris"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "channels" && <ChannelList />}
      {activeTab === "sync-issues" && <SyncIssuePanel />}
    </div>
  );
}
