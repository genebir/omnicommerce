"use client";

import { useState } from "react";
import { Link2, RefreshCw, BarChart3, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const steps = [
  { key: "step1", icon: Link2 },
  { key: "step2", icon: RefreshCw },
  { key: "step3", icon: BarChart3 },
] as const;

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
}

export function OnboardingWizard({ open, onComplete }: OnboardingWizardProps) {
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const [step, setStep] = useState(0);

  function handleNext() {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  }

  const current = steps[step];
  const Icon = current.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onComplete()}>
      <DialogContent className="gap-0 overflow-hidden rounded-2xl border-border-subtle bg-bg-surface p-0 sm:max-w-md">
        <DialogTitle className="sr-only">{t("welcome")}</DialogTitle>

        {/* 상단 일러스트 영역 */}
        <div className="flex flex-col items-center bg-gradient-to-b from-navy-800 to-bg-surface px-8 pb-2 pt-10">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-accent-iris/20">
            <Icon className="size-8 text-accent-iris" />
          </div>
          <h2 className="text-center text-xl font-bold text-text-primary">
            {step === 0 ? t("welcome") : t(`${current.key}Title`)}
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            {step === 0 ? t("welcomeDesc") : t(`${current.key}Desc`)}
          </p>
        </div>

        {/* 스텝 인디케이터 */}
        <div className="flex justify-center gap-2 py-6">
          {steps.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-6 bg-accent-iris" : "w-1.5 bg-border-strong",
              )}
            />
          ))}
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center justify-between border-t border-border-subtle px-6 py-4">
          <button
            type="button"
            onClick={onComplete}
            className="cursor-pointer text-sm text-text-tertiary hover:text-text-secondary"
          >
            {t("skip")}
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-accent-iris px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80"
          >
            {step === steps.length - 1 ? t("start") : tc("next")}
            <ArrowRight className="size-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
