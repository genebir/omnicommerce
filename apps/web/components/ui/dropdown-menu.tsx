"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
}

export function DropdownMenu({
  trigger,
  children,
  align = "end",
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div role="button" tabIndex={0} onClick={() => setOpen((v) => !v)} onKeyDown={(e) => e.key === "Enter" && setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            "absolute top-full z-50 mt-2 min-w-[200px] rounded-xl border border-border-subtle bg-bg-surface p-1 shadow-lg",
            align === "end" ? "right-0" : "left-0",
          )}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  icon?: React.ReactNode;
}

export function DropdownItem({
  children,
  onClick,
  destructive,
  icon,
}: DropdownItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
        destructive
          ? "text-state-error hover:bg-state-error/10"
          : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-border-subtle" />;
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 py-1.5 text-xs font-medium text-text-tertiary">
      {children}
    </p>
  );
}
