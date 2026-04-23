"use client";

import { Bell, CheckCheck, Inbox } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
} from "@/components/ui/dropdown-menu";
import { formatRelative } from "@/lib/utils/format";

interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkAllRead?: () => void;
}

export function NotificationPanel({
  notifications,
  onMarkAllRead,
}: NotificationPanelProps) {
  const t = useTranslations("topbar");
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu
      align="end"
      trigger={
        <button
          type="button"
          aria-label={t("notifications")}
          title={t("notifications")}
          className="relative rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-surface-2 hover:text-text-primary"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-state-error text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      }
    >
      <div className="w-72">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownLabel>{t("notifications")}</DropdownLabel>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="flex items-center gap-1 text-xs text-accent-iris hover:underline"
            >
              <CheckCheck className="size-3" />
              {t("markAllRead")}
            </button>
          )}
        </div>
        <DropdownSeparator />
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-text-tertiary">
            <Inbox className="size-8" />
            <p className="text-xs">{t("noNotifications")}</p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownItem key={notification.id}>
                <div className="flex w-full flex-col gap-0.5">
                  <div className="flex items-start gap-2">
                    {!notification.read && (
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-iris" />
                    )}
                    <span className="text-sm font-medium text-text-primary">
                      {notification.title}
                    </span>
                  </div>
                  <p className="text-xs text-text-tertiary">
                    {notification.body}
                  </p>
                  <span className="text-xs text-text-tertiary">
                    {formatRelative(notification.createdAt)}
                  </span>
                </div>
              </DropdownItem>
            ))}
          </div>
        )}
      </div>
    </DropdownMenu>
  );
}
