"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConnectChannel, useConnectedChannels, useCafe24OAuthUrl } from "@/lib/hooks";

interface ConnectWizardProps {
  channelCode: string;
  channelName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "credentials" | "verify" | "done";

const channelFields: Record<string, string[]> = {
  cafe24: [],
  naver: ["clientId", "clientSecret"],
  coupang: ["accessKey", "secretKey", "vendorId"],
};

export function ConnectWizard({
  channelCode,
  channelName,
  open,
  onOpenChange,
}: ConnectWizardProps) {
  const t = useTranslations("channels");
  const tc = useTranslations("common");
  const [step, setStep] = useState<Step>("credentials");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const connectChannel = useConnectChannel();
  const getCafe24OAuthUrl = useCafe24OAuthUrl();
  const { data: connectedChannels, refetch: refetchChannels } = useConnectedChannels();
  const popupRef = useRef<Window | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const isCafe24 = channelCode === "cafe24";
  const fields = channelFields[channelCode] ?? [];
  const stepNumber = step === "credentials" ? 1 : step === "verify" ? 2 : 3;
  const totalSteps = isCafe24 ? 2 : 3;

  // Cafe24 OAuth 완료 감지 — 폴링
  useEffect(() => {
    if (!isPolling) return;

    const intervalId = setInterval(async () => {
      if (popupRef.current?.closed) {
        clearInterval(intervalId);
        setIsPolling(false);
        return;
      }
      const result = await refetchChannels();
      const connected = result.data?.some((ch) => ch.channel_type === "cafe24");
      if (connected) {
        popupRef.current?.close();
        setIsPolling(false);
        setStep("done");
        toast.success(t("step3DoneDesc", { channel: channelName }));
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [isPolling, channelName, refetchChannels, t]);

  function handleFieldChange(name: string, value: string) {
    setCredentials((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCafe24OAuth() {
    const mallId = credentials["mall_id"] ?? "";
    if (!mallId.trim()) return;
    try {
      const result = await getCafe24OAuthUrl.mutateAsync(mallId.trim());
      const oauthUrl = result.data.url;
      const popup = window.open(
        oauthUrl,
        "cafe24-oauth",
        "width=620,height=760,left=200,top=100,resizable=yes",
      );
      popupRef.current = popup;
      setStep("verify");
      setIsPolling(true);
    } catch {
      toast.error(t("connectError"));
    }
  }

  async function handleVerify() {
    try {
      await connectChannel.mutateAsync({
        channel_type: channelCode,
        shop_name: credentials["client_id"] || credentials["access_key"] || channelCode,
        credentials,
      });
      setStep("done");
      toast.success(t("step3DoneDesc", { channel: channelName }));
    } catch {
      toast.error(t("connectError"));
    }
  }

  function handleClose() {
    popupRef.current?.close();
    setIsPolling(false);
    onOpenChange(false);
    setTimeout(() => {
      setStep("credentials");
      setCredentials({});
    }, 300);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-md !bg-bg-surface !text-text-primary !ring-border-subtle">
        <DialogHeader>
          <div className="mb-1 text-xs font-medium text-text-tertiary">
            {t("stepOf", { current: stepNumber, total: totalSteps })}
          </div>
          <DialogTitle className="!text-text-primary">
            {t("connectTitle", { channel: channelName })}
          </DialogTitle>
          <DialogDescription className="!text-text-secondary">
            {step === "credentials" && (isCafe24 ? t("cafe24Step1Desc") : t("step1ApiKeyDesc", { channel: channelName }))}
            {step === "verify" && (isCafe24 ? t("waitingForAuth") : t("step2VerifyDesc", { channel: channelName }))}
            {step === "done" && t("step3DoneDesc", { channel: channelName })}
          </DialogDescription>
        </DialogHeader>

        {/* 진행 표시줄 */}
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= stepNumber ? "bg-accent-iris" : "bg-bg-surface-2"
              }`}
            />
          ))}
        </div>

        {/* ── Cafe24 OAuth 플로우 ── */}
        {isCafe24 && step === "credentials" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="mall-id">{t("mallIdLabel")}</Label>
              <Input
                id="mall-id"
                name="mall_id"
                placeholder={t("mallIdPlaceholder")}
                className="font-mono"
                value={credentials["mall_id"] ?? ""}
                onChange={(e) => handleFieldChange("mall_id", e.target.value)}
              />
              <p className="mt-1.5 text-xs text-text-tertiary">{t("cafe24MallIdHint")}</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="cursor-pointer rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2"
              >
                {tc("cancel")}
              </button>
              <button
                type="button"
                onClick={handleCafe24OAuth}
                disabled={!credentials["mall_id"]?.trim() || getCafe24OAuthUrl.isPending}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-accent-iris px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {getCafe24OAuthUrl.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ExternalLink className="size-4" />
                )}
                {t("authorizeWithCafe24")}
              </button>
            </div>
          </div>
        )}

        {isCafe24 && step === "verify" && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="size-12 animate-spin text-accent-iris" />
              <div className="text-center">
                <p className="text-sm font-medium text-text-primary">{t("waitingForAuth")}</p>
                <p className="mt-1 text-xs text-text-tertiary">{t("waitingForAuthHint")}</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="cursor-pointer rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2"
              >
                {tc("cancel")}
              </button>
            </div>
          </div>
        )}

        {/* ── 일반 채널 자격증명 입력 ── */}
        {!isCafe24 && step === "credentials" && (
          <div className="space-y-4">
            {fields.includes("clientId") && (
              <div>
                <Label htmlFor="client-id">{t("clientIdLabel")}</Label>
                <Input
                  id="client-id"
                  name="client_id"
                  className="font-mono"
                  value={credentials["client_id"] ?? ""}
                  onChange={(e) => handleFieldChange("client_id", e.target.value)}
                />
              </div>
            )}
            {fields.includes("clientSecret") && (
              <div>
                <Label htmlFor="client-secret">{t("clientSecretLabel")}</Label>
                <Input
                  id="client-secret"
                  name="client_secret"
                  type="password"
                  className="font-mono"
                  value={credentials["client_secret"] ?? ""}
                  onChange={(e) => handleFieldChange("client_secret", e.target.value)}
                />
              </div>
            )}
            {fields.includes("accessKey") && (
              <div>
                <Label htmlFor="access-key">{t("accessKeyLabel")}</Label>
                <Input
                  id="access-key"
                  name="access_key"
                  className="font-mono"
                  value={credentials["access_key"] ?? ""}
                  onChange={(e) => handleFieldChange("access_key", e.target.value)}
                />
              </div>
            )}
            {fields.includes("secretKey") && (
              <div>
                <Label htmlFor="secret-key">{t("secretKeyLabel")}</Label>
                <Input
                  id="secret-key"
                  name="secret_key"
                  type="password"
                  className="font-mono"
                  value={credentials["secret_key"] ?? ""}
                  onChange={(e) => handleFieldChange("secret_key", e.target.value)}
                />
              </div>
            )}
            {fields.includes("vendorId") && (
              <div>
                <Label htmlFor="vendor-id">{t("vendorIdLabel")}</Label>
                <Input
                  id="vendor-id"
                  name="vendor_id"
                  className="font-mono"
                  value={credentials["vendor_id"] ?? ""}
                  onChange={(e) => handleFieldChange("vendor_id", e.target.value)}
                />
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="cursor-pointer rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2"
              >
                {tc("cancel")}
              </button>
              <button
                type="button"
                onClick={() => setStep("verify")}
                className="cursor-pointer rounded-xl bg-accent-iris px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80"
              >
                {tc("next")}
              </button>
            </div>
          </div>
        )}

        {!isCafe24 && step === "verify" && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4">
              {connectChannel.isPending ? (
                <>
                  <Loader2 className="size-12 animate-spin text-accent-iris" />
                  <p className="text-sm text-text-secondary">{t("verifying")}</p>
                </>
              ) : (
                <p className="text-sm text-text-secondary">
                  {t("step2VerifyDesc", { channel: channelName })}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep("credentials")}
                disabled={connectChannel.isPending}
                className="cursor-pointer rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {tc("back")}
              </button>
              <button
                type="button"
                onClick={handleVerify}
                disabled={connectChannel.isPending}
                className="cursor-pointer rounded-xl bg-accent-iris px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("verify")}
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4">
              <CheckCircle className="size-12 text-state-success" />
              <p className="text-sm text-text-secondary">
                {t("step3DoneDesc", { channel: channelName })}
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="cursor-pointer rounded-xl bg-accent-iris px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80"
              >
                {t("complete")}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
