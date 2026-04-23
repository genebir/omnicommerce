import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
}

export function StatCard({ label, value, icon: Icon, trend }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-tertiary">{label}</p>
        <Icon className="size-4 text-text-tertiary" />
      </div>
      <p className="mt-2 font-mono text-3xl font-bold text-text-primary">
        {value}
      </p>
      {trend && (
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            trend.positive ? "text-state-success" : "text-state-error",
          )}
        >
          {trend.positive ? "+" : ""}{trend.value}%
        </p>
      )}
    </div>
  );
}
