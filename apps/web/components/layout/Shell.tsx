"use client";

import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "@/components/patterns/CommandPalette";
import { useSidebarStore } from "@/stores/sidebar";
import { cn } from "@/lib/utils";

export function Shell({ children }: { children: React.ReactNode }) {
  const { collapsed, mobileOpen, setCollapsed, toggleCollapsed, setMobileOpen } =
    useSidebarStore();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1279px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setCollapsed(e.matches);
    };
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [setCollapsed]);

  return (
    <div className="flex min-h-screen bg-bg-canvas">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={toggleCollapsed}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div
        className={cn(
          "flex flex-1 flex-col transition-[margin-left] duration-200 ease-out",
          "max-lg:ml-0",
          collapsed ? "lg:ml-16" : "lg:ml-60",
        )}
      >
        <Topbar onMobileMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-[1440px]">{children}</div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
