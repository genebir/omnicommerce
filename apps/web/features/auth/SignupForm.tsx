"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupSchema, type SignupFormValues } from "@/lib/validations/auth";
import { registerApi } from "@/lib/api/auth";

export function SignupForm() {
  const t = useTranslations("auth");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(data: SignupFormValues) {
    try {
      await registerApi({
        email: data.email,
        password: data.password,
        name: data.email.split("@")[0],
      });
      toast.success(t("signupSuccess"));
      router.push("/login");
    } catch (e) {
      const message = e instanceof Error ? e.message : t("signupError");
      toast.error(message);
    }
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface p-8">
      <h1 className="mb-2 text-2xl font-bold text-text-primary">{t("signup")}</h1>
      <p className="mb-6 text-sm text-text-tertiary">{t("createAccount")}</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="name">{t("name")}</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "signup-name-error" : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p id="signup-name-error" className="mt-1 text-xs text-state-error">
              {t("nameRequired")}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "signup-email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p id="signup-email-error" className="mt-1 text-xs text-state-error">
              {t("emailInvalid")}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="password">{t("password")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "signup-password-error" : undefined}
            {...register("password")}
          />
          {errors.password && (
            <p id="signup-password-error" className="mt-1 text-xs text-state-error">
              {t("passwordMin")}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="password-confirm">{t("passwordConfirm")}</Label>
          <Input
            id="password-confirm"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.passwordConfirm}
            aria-describedby={errors.passwordConfirm ? "signup-confirm-error" : undefined}
            {...register("passwordConfirm")}
          />
          {errors.passwordConfirm && (
            <p id="signup-confirm-error" className="mt-1 text-xs text-state-error">
              {t("passwordMismatch")}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-accent-iris py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80 disabled:opacity-50"
        >
          {isSubmitting ? t("submitting") : t("submit")}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-text-tertiary">
        {t("hasAccount")}{" "}
        <Link href="/login" className="font-medium text-accent-iris hover:underline">
          {t("login")}
        </Link>
      </p>
    </div>
  );
}
