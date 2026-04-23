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
  label: string;
  colorClass: string;
  animate?: boolean;
}> = {
  synced:  { icon: Check,          label: "동기화 완료",  colorClass: "text-state-success" },
  syncing: { icon: Loader2,        label: "동기화 중",    colorClass: "text-accent-iris", animate: true },
  pending: { icon: AlertTriangle,  label: "대기",         colorClass: "text-state-warn" },
  failed:  { icon: X,              label: "실패",         colorClass: "text-state-error" },
};

export function SyncStatus({ status, lastSyncedAt, error, className }: SyncStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs", config.colorClass, className)}
      title={error ?? lastSyncedAt ?? config.label}
    >
      <Icon className={cn("size-3.5", config.animate && "animate-spin")} />
      <span>{config.label}</span>
    </span>
  );
}
