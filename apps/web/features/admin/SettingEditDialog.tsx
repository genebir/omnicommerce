"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod/dist/zod.js";
import { z } from "zod/v3";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AdminSetting } from "@/lib/hooks/use-admin-settings";
import { useUpdateSetting } from "@/lib/hooks/use-admin-settings";

const schema = z.object({
  rawValue: z.string().refine((v) => {
    try {
      JSON.parse(v);
      return true;
    } catch {
      return false;
    }
  }, "valueInvalid"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  setting: AdminSetting | null;
  open: boolean;
  onClose: () => void;
}

export function SettingEditDialog({ setting, open, onClose }: Props) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const { mutateAsync, isPending } = useUpdateSetting();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (setting) {
      reset({
        rawValue: setting.is_secret
          ? ""
          : JSON.stringify(setting.value, null, 2),
      });
    }
  }, [setting, reset]);

  const onSubmit = async (data: FormValues) => {
    if (!setting) return;
    try {
      await mutateAsync({ id: setting.id, value: JSON.parse(data.rawValue) });
      toast.success(t("updateSuccess"));
      onClose();
    } catch {
      toast.error(t("updateError"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-[var(--text-secondary)]">{t("editDescription")}</p>

        {setting && (
          <div className="rounded-lg bg-[var(--bg-surface-2)] px-4 py-3 font-mono text-sm text-[var(--text-secondary)]">
            <span className="text-[var(--accent-iris)]">{setting.key}</span>
            <span className="ml-2 text-xs">({setting.scope})</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="rawValue">{t("newValue")}</Label>
            <textarea
              id="rawValue"
              {...register("rawValue")}
              rows={6}
              placeholder={t("valuePlaceholder")}
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface-2)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--ring-focus)] focus:outline-none"
              aria-invalid={!!errors.rawValue}
              aria-describedby={errors.rawValue ? "rawValue-error" : undefined}
            />
            {errors.rawValue && (
              <p id="rawValue-error" className="text-sm text-[var(--state-error)]">
                {t("valueInvalid")}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
