import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-sm", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={item.label} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="size-3.5 text-text-tertiary" />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-text-tertiary transition-colors hover:text-text-secondary"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-text-primary" : "text-text-tertiary"}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
