"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";
import { loginApi, fetchCurrentUser } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth";

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormValues) {
    try {
      const tokens = await loginApi(data);
      const user = await fetchCurrentUser(tokens.access_token);
      setAuth(user, {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
      toast.success(t("loginSuccess"));
      router.push("/dashboard");
    } catch (e) {
      const message = e instanceof Error ? e.message : t("loginError");
      toast.error(message);
    }
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface p-8">
      <h1 className="mb-2 text-2xl font-bold text-text-primary">{t("login")}</h1>
      <p className="mb-6 text-sm text-text-tertiary">{t("welcomeBack")}</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-xs text-state-error">
              {t("emailInvalid")}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="password">{t("password")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          {errors.password && (
            <p id="password-error" className="mt-1 text-xs text-state-error">
              {t("passwordMin")}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-accent-iris py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80 disabled:opacity-50"
        >
          {isSubmitting ? t("loggingIn") : t("login")}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-text-tertiary">
        {t("noAccount")}{" "}
        <Link href="/signup" className="font-medium text-accent-iris hover:underline">
          {t("signup")}
        </Link>
      </p>
    </div>
  );
}
