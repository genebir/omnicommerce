"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Store, Bell, Shield, Globe, Palette, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/theme";
import { useChangePassword } from "@/lib/hooks";

interface SettingsSection {
  key: string;
  icon: LucideIcon;
}

const sections: SettingsSection[] = [
  { key: "general", icon: Store },
  { key: "notifications", icon: Bell },
  { key: "security", icon: Shield },
  { key: "language", icon: Globe },
  { key: "appearance", icon: Palette },
];

const LOCALE_KEY = "omni:locale";

export function SettingsContent() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("general");
  const { theme, setTheme } = useThemeStore();
  const changePassword = useChangePassword();
  const pwFormRef = useRef<HTMLFormElement>(null);

  function handleLocaleChange(locale: string) {
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000`;
    localStorage.setItem(LOCALE_KEY, locale);
    router.refresh();
    toast.success(t("languageChanged"));
  }

  const currentLocale =
    typeof document !== "undefined"
      ? document.cookie
          .split("; ")
          .find((c) => c.startsWith("NEXT_LOCALE="))
          ?.split("=")[1] ?? "ko"
      : "ko";

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <nav className="space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                activeSection === section.key
                  ? "bg-bg-surface-2 font-medium text-text-primary"
                  : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
              )}
            >
              <Icon className="size-4" />
              {t(`section${section.key.charAt(0).toUpperCase()}${section.key.slice(1)}`)}
            </button>
          );
        })}
      </nav>

      <div className="space-y-6">
        {activeSection === "general" && (
          <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">
              {t("sectionGeneral")}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                  {t("storeName")}
                </label>
                <input
                  type="text"
                  placeholder={t("storeNamePlaceholder")}
                  className="w-full rounded-lg border border-border-strong bg-bg-canvas px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-ring-focus"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                  {t("storeUrl")}
                </label>
                <input
                  type="url"
                  placeholder="https://"
                  className="w-full rounded-lg border border-border-strong bg-bg-canvas px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-ring-focus"
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === "notifications" && (
          <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">
              {t("sectionNotifications")}
            </h2>
            <div className="space-y-3">
              {(["orderNotif", "syncNotif", "stockNotif"] as const).map((key) => (
                <label
                  key={key}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-bg-surface-2"
                >
                  <span className="text-sm text-text-secondary">{t(key)}</span>
                  <div className="relative">
                    <input type="checkbox" defaultChecked className="peer sr-only" />
                    <div className="h-5 w-9 rounded-full bg-border-strong transition-colors peer-checked:bg-accent-iris" />
                    <div className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {activeSection === "security" && (
          <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">
              {t("sectionSecurity")}
            </h2>
            <form
              ref={pwFormRef}
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const current = (form.elements.namedItem("currentPw") as HTMLInputElement).value;
                const newPw = (form.elements.namedItem("newPw") as HTMLInputElement).value;
                const confirmPw = (form.elements.namedItem("confirmPw") as HTMLInputElement).value;
                if (newPw.length < 8) {
                  toast.error(t("passwordMinLength"));
                  return;
                }
                if (newPw !== confirmPw) {
                  toast.error(t("passwordMismatch"));
                  return;
                }
                try {
                  await changePassword.mutateAsync({
                    current_password: current,
                    new_password: newPw,
                  });
                  toast.success(t("passwordChanged"));
                  form.reset();
                } catch {
                  toast.error(t("passwordChangeError"));
                }
              }}
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                  {t("currentPassword")}
                </label>
                <input
                  name="currentPw"
                  type="password"
                  required
                  className="w-full rounded-lg border border-border-strong bg-bg-canvas px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring-focus"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                  {t("newPassword")}
                </label>
                <input
                  name="newPw"
                  type="password"
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-border-strong bg-bg-canvas px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring-focus"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                  {t("confirmNewPassword")}
                </label>
                <input
                  name="confirmPw"
                  type="password"
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-border-strong bg-bg-canvas px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring-focus"
                />
              </div>
              <button
                type="submit"
                disabled={changePassword.isPending}
                className="rounded-xl bg-accent-iris px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80 disabled:opacity-50"
              >
                {changePassword.isPending ? "..." : t("changePassword")}
              </button>
            </form>
          </div>
        )}

        {activeSection === "language" && (
          <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">
              {t("sectionLanguage")}
            </h2>
            <div className="space-y-2">
              {[
                { code: "ko", label: "한��어" },
                { code: "en", label: "English" },
              ].map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLocaleChange(lang.code)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm transition-colors",
                    currentLocale === lang.code
                      ? "bg-accent-iris/10 text-accent-iris"
                      : "text-text-secondary hover:bg-bg-surface-2",
                  )}
                >
                  <span>{lang.label}</span>
                  {currentLocale === lang.code && <Check className="size-4" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeSection === "appearance" && (
          <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">
              {t("sectionAppearance")}
            </h2>
            <div className="space-y-2">
              {[
                { value: "dark" as const, label: t("darkTheme") },
                { value: "light" as const, label: t("lightTheme") },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm transition-colors",
                    theme === opt.value
                      ? "bg-accent-iris/10 text-accent-iris"
                      : "text-text-secondary hover:bg-bg-surface-2",
                  )}
                >
                  <span>{opt.label}</span>
                  {theme === opt.value && <Check className="size-4" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
