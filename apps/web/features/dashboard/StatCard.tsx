import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
  urgent?: boolean;
  trend?: {
    value: number;
    positive: boolean;
  };
}

export function StatCard({ label, value, icon: Icon, href, urgent, trend }: StatCardProps) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-tertiary">{label}</p>
        <Icon
          className={cn(
            "size-4",
            urgent && Number(value) > 0 ? "text-state-warn" : "text-text-tertiary",
          )}
        />
      </div>
      <p
        className={cn(
          "mt-2 font-mono text-3xl font-bold",
          urgent && Number(value) > 0 ? "text-state-warn" : "text-text-primary",
        )}
      >
        {value}
      </p>
      {trend && (
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            trend.positive ? "text-state-success" : "text-state-error",
          )}
        >
          {trend.positive ? "+" : ""}
          {trend.value}%
        </p>
      )}
      {href && (
        <p className="mt-2 text-xs text-text-tertiary group-hover:text-accent-iris transition-colors">
          자세히 보기 →
        </p>
      )}
    </>
  );

  const baseClass = cn(
    "rounded-2xl border border-border-subtle bg-bg-surface p-6",
    urgent && Number(value) > 0 && "border-state-warn/30 bg-state-warn/5",
  );

  if (href) {
    return (
      <Link href={href} className={cn(baseClass, "group block transition-colors hover:border-accent-iris/30 hover:bg-bg-surface-2")}>
        {content}
      </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
