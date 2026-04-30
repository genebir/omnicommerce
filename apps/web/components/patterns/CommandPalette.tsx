"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Warehouse,
  Link2,
  Settings,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface CommandItem {
  id: string;
  label: string;
  icon: LucideIcon;
  section: string;
  action: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const tNav = useTranslations("nav");
  const tCmd = useTranslations("commandPalette");
  const tCommon = useTranslations("common");

  const go = useCallback(
    (path: string) => {
      router.push(path);
      setOpen(false);
    },
    [router],
  );

  const sectionNav = tCmd("sectionNavigate");
  const sectionAct = tCmd("sectionActions");
  const items: CommandItem[] = useMemo(
    () => [
      { id: "dashboard",   label: tNav("dashboard"),  icon: LayoutDashboard, section: sectionNav, action: () => go("/dashboard") },
      { id: "products",    label: tNav("products"),   icon: Package,         section: sectionNav, action: () => go("/products") },
      { id: "orders",      label: tNav("orders"),     icon: ShoppingCart,    section: sectionNav, action: () => go("/orders") },
      { id: "inventory",   label: tNav("inventory"),  icon: Warehouse,       section: sectionNav, action: () => go("/inventory") },
      { id: "channels",    label: tNav("channels"),   icon: Link2,           section: sectionNav, action: () => go("/channels") },
      { id: "settings",    label: tNav("settings"),   icon: Settings,        section: sectionNav, action: () => go("/settings") },
      { id: "new-product", label: tNav("newProduct"), icon: Plus,            section: sectionAct, action: () => go("/products/new") },
      { id: "sync-all",    label: tNav("syncAll"),    icon: RefreshCw,       section: sectionAct, action: () => setOpen(false) },
    ],
    [tNav, sectionNav, sectionAct, go],
  );

  const filtered = query
    ? items.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase()),
      )
    : items;

  const sections = [...new Set(filtered.map((item) => item.section))];

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function handleOpenPalette() {
      setOpen(true);
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("open-command-palette", handleOpenPalette);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("open-command-palette", handleOpenPalette);
    };
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" && filtered[activeIndex]) {
      e.preventDefault();
      filtered[activeIndex].action();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setQuery(""); }}>
      <DialogContent
        className="top-[20%] translate-y-0 gap-0 overflow-hidden rounded-2xl border-border-subtle bg-bg-surface p-0 shadow-2xl sm:max-w-lg"
        onKeyDown={handleKeyDown}
      >
        <VisuallyHidden>
          <DialogTitle>{tCmd("title")}</DialogTitle>
        </VisuallyHidden>

        {/* 검색 입력 */}
        <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
          <Search className="size-5 text-text-tertiary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tCmd("placeholder")}
            aria-label={tCommon("search")}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
            autoFocus
          />
          <kbd className="rounded bg-bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-text-tertiary">
            ESC
          </kbd>
        </div>

        {/* 결과 목록 */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-text-tertiary">
              {tCmd("noResults")}
            </p>
          )}

          {sections.map((section) => (
            <div key={section}>
              <p className="px-3 pb-1 pt-3 text-xs font-medium text-text-tertiary">
                {section}
              </p>
              {filtered
                .filter((item) => item.section === section)
                .map((item) => {
                  const globalIdx = filtered.indexOf(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.action}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                        globalIdx === activeIndex
                          ? "bg-bg-surface-2 text-text-primary"
                          : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
                      )}
                    >
                      <item.icon className="size-4" />
                      {item.label}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
