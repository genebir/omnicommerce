"use client";

import { useTranslations } from "next-intl";
import { Check, Loader2, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "synced" | "syncing" | "pending" | "failed";

interface SyncStatusProps {
  status: Status;
  lastSyncedAt?: string;
  error?: string;
  className?: string;
}

const statusConfig: Record<Status, {
  icon: typeof Check;
  colorClass: string;
  animate?: boolean;
}> = {
  synced:  { icon: Check,          colorClass: "text-state-success" },
  syncing: { icon: Loader2,        colorClass: "text-accent-iris", animate: true },
  pending: { icon: AlertTriangle,  colorClass: "text-state-warn" },
  failed:  { icon: X,              colorClass: "text-state-error" },
};

export function SyncStatus({ status, lastSyncedAt, error, className }: SyncStatusProps) {
  const t = useTranslations("sync");
  const config = statusConfig[status];
  const Icon = config.icon;
  const label = t(status);

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs", config.colorClass, className)}
      title={error ?? lastSyncedAt ?? label}
    >
      <Icon className={cn("size-3.5", config.animate && "animate-spin")} />
      <span>{label}</span>
    </span>
  );
}
