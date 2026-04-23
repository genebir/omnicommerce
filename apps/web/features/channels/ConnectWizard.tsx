"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
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
import { useConnectChannel } from "@/lib/hooks";

interface ConnectWizardProps {
  channelCode: string;
  channelName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "credentials" | "verify" | "done";

const channelFields: Record<string, string[]> = {
  cafe24: ["mallId", "accessToken", "refreshToken"],
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

  const fields = channelFields[channelCode] ?? ["apiKeyLabel"];
  const stepNumber = step === "credentials" ? 1 : step === "verify" ? 2 : 3;

  function handleFieldChange(name: string, value: string) {
    setCredentials((prev) => ({ ...prev, [name]: value }));
  }

  async function handleVerify() {
    try {
      await connectChannel.mutateAsync({
        channel_type: channelCode,
        shop_name: credentials["mall_id"] || credentials["client_id"] || channelCode,
        credentials,
      });
      setStep("done");
      toast.success(t("step3DoneDesc", { channel: channelName }));
    } catch {
      toast.error(t("connectError"));
    }
  }

  function handleClose() {
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
            {t("stepOf", { current: stepNumber, total: 3 })}
          </div>
          <DialogTitle className="!text-text-primary">
            {t("connectTitle", { channel: channelName })}
          </DialogTitle>
          <DialogDescription className="!text-text-secondary">
            {step === "credentials" && t("step1ApiKeyDesc", { channel: channelName })}
            {step === "verify" && t("step2VerifyDesc", { channel: channelName })}
            {step === "done" && t("step3DoneDesc", { channel: channelName })}
          </DialogDescription>
        </DialogHeader>

        {/* 진행 표시줄 */}
        <div className="flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= stepNumber ? "bg-accent-iris" : "bg-bg-surface-2"
              }`}
            />
          ))}
        </div>

        {step === "credentials" && (
          <div className="space-y-4">
            {fields.includes("mallId") && (
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
              </div>
            )}
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
            {fields.includes("accessToken") && (
              <div>
                <Label htmlFor="access-token">{t("accessTokenLabel")}</Label>
                <Input
                  id="access-token"
                  name="access_token"
                  type="password"
                  className="font-mono"
                  value={credentials["access_token"] ?? ""}
                  onChange={(e) => handleFieldChange("access_token", e.target.value)}
                />
              </div>
            )}
            {fields.includes("refreshToken") && (
              <div>
                <Label htmlFor="refresh-token">{t("refreshTokenLabel")}</Label>
                <Input
                  id="refresh-token"
                  name="refresh_token"
                  type="password"
                  className="font-mono"
                  value={credentials["refresh_token"] ?? ""}
                  onChange={(e) => handleFieldChange("refresh_token", e.target.value)}
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

        {step === "verify" && (
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
