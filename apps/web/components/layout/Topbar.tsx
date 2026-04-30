"use client";

import { useRouter } from "next/navigation";
import { Search, User, Moon, Sun, Menu, Settings, HelpCircle, LogOut, Palette } from "lucide-react";
import { useTranslations } from "next-intl";
import { useThemeStore } from "@/stores/theme";
import { useAuthStore } from "@/stores/auth";
import {
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
} from "@/components/ui/dropdown-menu";
import { NotificationPanel } from "@/components/patterns/NotificationPanel";

interface TopbarProps {
  onMobileMenuOpen: () => void;
}

export function Topbar({ onMobileMenuOpen }: TopbarProps) {
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const t = useTranslations("topbar");
  const tCommon = useTranslations("common");

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border-subtle bg-bg-canvas/80 px-4 backdrop-blur-sm sm:px-6">
      {/* 모바일 메뉴 토글 */}
      <button
        type="button"
        onClick={onMobileMenuOpen}
        className="cursor-pointer rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-surface-2 lg:hidden"
        aria-label={tCommon("menu")}
      >
        <Menu className="size-5" />
      </button>

      {/* 검색 → CommandPalette 열기 */}
      <button
        type="button"
        onClick={() => document.dispatchEvent(new CustomEvent("open-command-palette"))}
        className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg bg-bg-surface px-3 py-1.5 text-sm text-text-tertiary transition-colors hover:bg-bg-surface-2"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">{t("searchPlaceholder")}</span>
        <kbd className="ml-auto hidden rounded bg-bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-text-tertiary sm:inline-block">
          ⌘K
        </kbd>
      </button>

      {/* 동기화 상태 */}
      <div className="hidden items-center gap-1 text-xs text-text-tertiary sm:flex">
        <span className="size-2 rounded-full bg-state-success" />
        <span>{t("syncComplete")}</span>
      </div>

      {/* 테마 토글 */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? t("lightMode") : t("darkMode")}
        title={theme === "dark" ? t("lightMode") : t("darkMode")}
        className="cursor-pointer rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-surface-2 hover:text-text-primary"
      >
        {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </button>

      {/* 알림 */}
      <NotificationPanel
        notifications={[
          {
            id: "1",
            title: "새 주문 접수",
            body: "카페24에서 주문 #ORD-2026-0042",
            read: false,
            createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          },
          {
            id: "2",
            title: "동기화 완료",
            body: "네이버 상품 12개 동기화",
            read: true,
            createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          },
        ]}
      />

      {/* 프로필 드롭다운 */}
      <DropdownMenu
        align="end"
        trigger={
          <button
            type="button"
            aria-label={t("profile")}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-accent-iris/20 text-xs font-bold text-accent-iris transition-colors hover:bg-accent-iris/30"
          >
            {user?.name?.[0]?.toUpperCase() ?? <User className="size-4" />}
          </button>
        }
      >
        {user && (
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-text-primary">{user.name}</p>
            <p className="text-xs text-text-tertiary">{user.email}</p>
          </div>
        )}
        <DropdownSeparator />
        <DropdownItem icon={<Settings className="size-4" />}>
          {t("accountSettings")}
        </DropdownItem>
        <DropdownItem icon={<Palette className="size-4" />} onClick={toggleTheme}>
          {t("appearance")}
        </DropdownItem>
        <DropdownItem icon={<HelpCircle className="size-4" />}>
          {t("help")}
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem icon={<LogOut className="size-4" />} destructive onClick={handleLogout}>
          {t("logout")}
        </DropdownItem>
      </DropdownMenu>
    </header>
  );
}
