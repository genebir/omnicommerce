"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, ClipboardCopy, ExternalLink, Loader2, Zap, AlertCircle } from "lucide-react";
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
import {
  useConnectChannel,
  useConnectedChannels,
  useCafe24OAuthUrl,
  useCafe24RedirectUri,
  useConnectCafe24Manual,
} from "@/lib/hooks";

interface ConnectWizardProps {
  channelCode: string;
  channelName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "credentials" | "verify" | "done";
type Cafe24Mode = "oauth" | "manual";

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
  const [cafe24Mode, setCafe24Mode] = useState<Cafe24Mode>("oauth");

  const connectChannel = useConnectChannel();
  const getCafe24OAuthUrl = useCafe24OAuthUrl();
  const connectCafe24Manual = useConnectCafe24Manual();
  const { data: redirectUriData } = useCafe24RedirectUri();
  const { data: connectedChannels, refetch: refetchChannels } = useConnectedChannels();

  const popupRef = useRef<Window | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const isCafe24 = channelCode === "cafe24";
  const fields = channelFields[channelCode] ?? [];
  const stepNumber = step === "credentials" ? 1 : step === "verify" ? 2 : 3;
  const totalSteps = isCafe24 && cafe24Mode === "oauth" ? 2 : 3;
  const oauthReady = redirectUriData?.configured ?? false;

  useEffect(() => {
    if (!isPolling) return;
    const id = setInterval(async () => {
      if (popupRef.current?.closed) {
        clearInterval(id);
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
    return () => clearInterval(id);
  }, [isPolling, channelName, refetchChannels, t]);

  function handleFieldChange(name: string, value: string) {
    setCredentials((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCafe24OAuth() {
    const mallId = credentials["mall_id"] ?? "";
    if (!mallId.trim()) return;
    try {
      const result = await getCafe24OAuthUrl.mutateAsync(mallId.trim());
      const popup = window.open(
        result.data.url,
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

  async function handleCafe24ManualConnect() {
    const mallId = credentials["mall_id"] ?? "";
    const accessToken = credentials["access_token"] ?? "";
    if (!mallId.trim() || !accessToken.trim()) return;
    try {
      await connectCafe24Manual.mutateAsync({
        mall_id: mallId.trim(),
        access_token: accessToken.trim(),
        refresh_token: credentials["refresh_token"] ?? "",
      });
      setStep("done");
      toast.success(t("step3DoneDesc", { channel: channelName }));
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
      setCafe24Mode("oauth");
    }, 300);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[540px] max-w-lg flex-col !bg-bg-surface !text-text-primary !ring-border-subtle">
        <DialogHeader className="shrink-0">
          <div className="mb-1 text-xs font-medium text-text-tertiary">
            {t("stepOf", { current: stepNumber, total: totalSteps })}
          </div>
          <DialogTitle className="!text-text-primary">
            {t("connectTitle", { channel: channelName })}
          </DialogTitle>
          <DialogDescription className="!text-text-secondary">
            {step === "credentials" &&
              (isCafe24
                ? cafe24Mode === "oauth"
                  ? t("cafe24Step1Desc")
                  : t("manualDesc")
                : t("step1ApiKeyDesc", { channel: channelName }))}
            {step === "verify" &&
              (isCafe24 ? t("waitingForAuth") : t("step2VerifyDesc", { channel: channelName }))}
            {step === "done" && t("step3DoneDesc", { channel: channelName })}
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 flex gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= stepNumber ? "bg-accent-iris" : "bg-bg-surface-2"
              }`}
            />
          ))}
        </div>

        {/* 콘텐츠 영역 — 고정 높이 모달 안에서 스크롤 허용 */}
        <div className="flex min-h-0 flex-1 flex-col">

          {/* ── Cafe24 연결 화면 ── */}
          {isCafe24 && step === "credentials" && (
            <div className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex-1 space-y-4">
                <div className="flex gap-1 rounded-xl bg-bg-surface-2 p-1">
                  {(["oauth", "manual"] as Cafe24Mode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setCafe24Mode(mode)}
                      className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        cafe24Mode === mode
                          ? "bg-bg-surface text-text-primary shadow-sm"
                          : "text-text-tertiary hover:text-text-secondary"
                      }`}
                    >
                      {mode === "oauth" ? t("oauthTab") : t("manualTab")}
                    </button>
                  ))}
                </div>

                <div>
                  <Label htmlFor="mall-id">{t("mallIdLabel")}</Label>
                  <Input
                    id="mall-id"
                    placeholder={t("mallIdPlaceholder")}
                    className="font-mono"
                    value={credentials["mall_id"] ?? ""}
                    onChange={(e) => handleFieldChange("mall_id", e.target.value)}
                  />
                  <p className="mt-1.5 text-xs text-text-tertiary">{t("cafe24MallIdHint")}</p>
                </div>

                {cafe24Mode === "oauth" && (
                  <RedirectUriPanel
                    redirectUri={redirectUriData?.redirect_uri ?? null}
                    configured={oauthReady}
                    t={t}
                  />
                )}

                {cafe24Mode === "manual" && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="access-token">{t("accessTokenLabel")}</Label>
                      <Input
                        id="access-token"
                        placeholder={t("accessTokenPlaceholder")}
                        className="font-mono text-xs"
                        value={credentials["access_token"] ?? ""}
                        onChange={(e) => handleFieldChange("access_token", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="refresh-token">{t("refreshTokenLabel")}</Label>
                      <Input
                        id="refresh-token"
                        placeholder={t("refreshTokenPlaceholder")}
                        className="font-mono text-xs"
                        value={credentials["refresh_token"] ?? ""}
                        onChange={(e) => handleFieldChange("refresh_token", e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="shrink-0 flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="cursor-pointer rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2"
                >
                  {tc("cancel")}
                </button>
                {cafe24Mode === "oauth" ? (
                  <button
                    type="button"
                    onClick={handleCafe24OAuth}
                    disabled={
                      !credentials["mall_id"]?.trim() ||
                      !oauthReady ||
                      getCafe24OAuthUrl.isPending
                    }
                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-accent-iris px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {getCafe24OAuthUrl.isPending && <Loader2 className="size-4 animate-spin" />}
                    <ExternalLink className="size-4" />
                    {t("authorizeWithCafe24")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCafe24ManualConnect}
                    disabled={
                      !credentials["mall_id"]?.trim() ||
                      !credentials["access_token"]?.trim() ||
                      connectCafe24Manual.isPending
                    }
                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-accent-iris px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {connectCafe24Manual.isPending && <Loader2 className="size-4 animate-spin" />}
                    {t("manualConnectBtn")}
                  </button>
                )}
              </div>
            </div>
          )}

          {isCafe24 && step === "verify" && (
            <div className="flex flex-1 flex-col justify-between py-2">
              <div className="flex flex-1 flex-col items-center justify-center gap-4">
                <Loader2 className="size-12 animate-spin text-accent-iris" />
                <div className="text-center">
                  <p className="text-sm font-medium text-text-primary">{t("waitingForAuth")}</p>
                  <p className="mt-1 text-xs text-text-tertiary">{t("waitingForAuthHint")}</p>
                </div>
              </div>
              <div className="shrink-0 flex justify-end pt-4">
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

          {!isCafe24 && step === "credentials" && (
            <div className="flex flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto">
                {fields.includes("clientId") && (
                  <div>
                    <Label htmlFor="client-id">{t("clientIdLabel")}</Label>
                    <Input id="client-id" className="font-mono" value={credentials["client_id"] ?? ""} onChange={(e) => handleFieldChange("client_id", e.target.value)} />
                  </div>
                )}
                {fields.includes("clientSecret") && (
                  <div>
                    <Label htmlFor="client-secret">{t("clientSecretLabel")}</Label>
                    <Input id="client-secret" type="password" className="font-mono" value={credentials["client_secret"] ?? ""} onChange={(e) => handleFieldChange("client_secret", e.target.value)} />
                  </div>
                )}
                {fields.includes("accessKey") && (
                  <div>
                    <Label htmlFor="access-key">{t("accessKeyLabel")}</Label>
                    <Input id="access-key" className="font-mono" value={credentials["access_key"] ?? ""} onChange={(e) => handleFieldChange("access_key", e.target.value)} />
                  </div>
                )}
                {fields.includes("secretKey") && (
                  <div>
                    <Label htmlFor="secret-key">{t("secretKeyLabel")}</Label>
                    <Input id="secret-key" type="password" className="font-mono" value={credentials["secret_key"] ?? ""} onChange={(e) => handleFieldChange("secret_key", e.target.value)} />
                  </div>
                )}
                {fields.includes("vendorId") && (
                  <div>
                    <Label htmlFor="vendor-id">{t("vendorIdLabel")}</Label>
                    <Input id="vendor-id" className="font-mono" value={credentials["vendor_id"] ?? ""} onChange={(e) => handleFieldChange("vendor_id", e.target.value)} />
                  </div>
                )}
              </div>
              <div className="shrink-0 flex justify-end gap-3 pt-4">
                <button type="button" onClick={handleClose} className="cursor-pointer rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2">{tc("cancel")}</button>
                <button type="button" onClick={() => setStep("verify")} className="cursor-pointer rounded-xl bg-accent-iris px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80">{tc("next")}</button>
              </div>
            </div>
          )}

          {!isCafe24 && step === "verify" && (
            <div className="flex flex-1 flex-col justify-between py-2">
              <div className="flex flex-1 flex-col items-center justify-center gap-4">
                {connectChannel.isPending ? (
                  <>
                    <Loader2 className="size-12 animate-spin text-accent-iris" />
                    <p className="text-sm text-text-secondary">{t("verifying")}</p>
                  </>
                ) : (
                  <p className="text-sm text-text-secondary">{t("step2VerifyDesc", { channel: channelName })}</p>
                )}
              </div>
              <div className="shrink-0 flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setStep("credentials")} disabled={connectChannel.isPending} className="cursor-pointer rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50">{tc("back")}</button>
                <button type="button" onClick={handleVerify} disabled={connectChannel.isPending} className="cursor-pointer rounded-xl bg-accent-iris px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80 disabled:cursor-not-allowed disabled:opacity-50">{t("verify")}</button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-1 flex-col justify-between py-2">
              <div className="flex flex-1 flex-col items-center justify-center gap-4">
                <CheckCircle className="size-12 text-state-success" />
                <p className="text-sm text-text-secondary">{t("step3DoneDesc", { channel: channelName })}</p>
              </div>
              <div className="shrink-0 flex justify-end pt-4">
                <button type="button" onClick={handleClose} className="cursor-pointer rounded-xl bg-accent-iris px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80">{t("complete")}</button>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}

function RedirectUriPanel({
  redirectUri,
  configured,
  t,
}: {
  redirectUri: string | null;
  configured: boolean;
  t: (key: string) => string;
}) {
  function copy() {
    if (!redirectUri) return;
    navigator.clipboard.writeText(redirectUri);
    toast.success(t("tunnelCopied"));
  }

  if (configured && redirectUri) {
    return (
      <div className="rounded-xl border border-accent-iris/30 bg-accent-iris/5 p-3 text-xs">
        <div className="mb-2 flex items-center gap-1.5 font-medium text-accent-iris">
          <Zap className="size-3.5" />
          {t("tunnelPermanent")}
        </div>
        <p className="mb-1.5 text-text-secondary">{t("tunnelRedirectUri")}:</p>
        <div className="flex items-center gap-2 rounded-lg bg-bg-base px-2.5 py-2">
          <code className="min-w-0 flex-1 break-all text-[11px] leading-relaxed text-text-primary">
            {redirectUri}
          </code>
          <button type="button" onClick={copy} className="shrink-0 cursor-pointer text-text-tertiary hover:text-text-primary">
            <ClipboardCopy className="size-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-text-tertiary">{t("tunnelStep2")}</p>
        <a href="https://developers.cafe24.com/" target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-0.5 text-accent-iris hover:underline">
          {t("tunnelSetupLink")} <ExternalLink className="size-2.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-state-warning/30 bg-state-warning/5 p-3 text-xs">
      <div className="mb-1.5 flex items-center gap-1.5 font-medium text-state-warning">
        <AlertCircle className="size-3.5" />
        Redirect URI 미설정
      </div>
      <p className="text-text-secondary">
        <code className="rounded bg-bg-surface-2 px-1 py-0.5 text-[11px]">CAFE24_REDIRECT_URI</code>에 Cloudflare Worker URL을 설정해야 OAuth를 사용할 수 있습니다.
      </p>
      <a href="https://developers.cafe24.com/" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-0.5 text-accent-iris hover:underline">
        설정 방법 보기 <ExternalLink className="size-2.5" />
      </a>
    </div>
  );
}
