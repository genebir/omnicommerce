import { cn } from "@/lib/utils";
import { type ComponentProps } from "react";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-sm font-medium text-text-secondary",
        className,
      )}
      {...props}
    />
  );
}
