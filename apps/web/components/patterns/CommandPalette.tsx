"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

  const go = useCallback(
    (path: string) => {
      router.push(path);
      setOpen(false);
    },
    [router],
  );

  const items: CommandItem[] = [
    { id: "dashboard",    label: "대시보드",        icon: LayoutDashboard, section: "이동", action: () => go("/dashboard") },
    { id: "products",     label: "상품",            icon: Package,         section: "이동", action: () => go("/products") },
    { id: "orders",       label: "주문",            icon: ShoppingCart,    section: "이동", action: () => go("/orders") },
    { id: "inventory",    label: "재고",            icon: Warehouse,       section: "이동", action: () => go("/inventory") },
    { id: "channels",     label: "채널 연결",       icon: Link2,           section: "이동", action: () => go("/channels") },
    { id: "settings",     label: "설정",            icon: Settings,        section: "이동", action: () => go("/settings") },
    { id: "new-product",  label: "상품 등록",       icon: Plus,            section: "동작", action: () => go("/products/new") },
    { id: "sync-all",     label: "전체 동기화",     icon: RefreshCw,       section: "동작", action: () => setOpen(false) },
  ];

  const filtered = query
    ? items.filter((item) => item.label.includes(query))
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
          <DialogTitle>명령어 팔레트</DialogTitle>
        </VisuallyHidden>

        {/* 검색 입력 */}
        <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
          <Search className="size-5 text-text-tertiary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색 또는 명령어..."
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
              결과가 없습니다
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
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
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
