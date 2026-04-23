import { cn } from "@/lib/utils";
import { type ComponentProps } from "react";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-border-strong bg-bg-canvas px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary",
        "focus:outline-none focus:ring-2 focus:ring-ring-focus",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-state-error aria-[invalid=true]:focus:ring-state-error",
        className,
      )}
      {...props}
    />
  );
}
