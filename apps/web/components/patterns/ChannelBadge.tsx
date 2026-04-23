import { cn } from "@/lib/utils";

interface ChannelBadgeProps {
  code: string;
  className?: string;
}

const channelMap: Record<string, { label: string; dotClass: string }> = {
  cafe24: { label: "C24", dotClass: "bg-accent-aurora/70" },
  naver:  { label: "N",   dotClass: "bg-[#58B763]/70" },
  coupang:{ label: "CP",  dotClass: "bg-accent-coral/70" },
};

export function ChannelBadge({ code, className }: ChannelBadgeProps) {
  const channel = channelMap[code] ?? { label: code.toUpperCase(), dotClass: "bg-text-tertiary" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-secondary",
        className,
      )}
    >
      <span className={cn("size-2 rounded-full", channel.dotClass)} />
      {channel.label}
    </span>
  );
}
