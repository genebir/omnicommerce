"use client";

import { useState, useEffect } from "react";
import { Loader2, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// 주요 국내 택배사 목록
const CARRIERS = [
  "CJ대한통운",
  "한진택배",
  "롯데택배",
  "우체국택배",
  "로젠택배",
  "편의점택배(CU)",
  "편의점택배(GS25)",
  "카카오T",
  "쿠팡로켓",
  "직접배송",
];

export interface TrackingInfo {
  tracking_company: string | null;
  tracking_number: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** 상태 전환 없이 운송장만 수정하는 경우 true */
  editOnly?: boolean;
  initialValues?: TrackingInfo;
  loading?: boolean;
  /** 운송장 포함 확인 */
  onConfirmWithTracking: (info: TrackingInfo) => void;
  /** 운송장 없이 진행 (editOnly=false일 때만) */
  onConfirmWithoutTracking?: () => void;
}

export function TrackingDialog({
  open,
  onOpenChange,
  editOnly = false,
  initialValues,
  loading = false,
  onConfirmWithTracking,
  onConfirmWithoutTracking,
}: Props) {
  const t = useTranslations("orders");
  const tc = useTranslations("common");

  const [company, setCompany] = useState(initialValues?.tracking_company ?? "");
  const [number, setNumber] = useState(initialValues?.tracking_number ?? "");

  useEffect(() => {
    if (open) {
      setCompany(initialValues?.tracking_company ?? "");
      setNumber(initialValues?.tracking_number ?? "");
    }
  }, [open, initialValues]);

  const hasTracking = company.trim() !== "" && number.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Truck className="size-5 text-accent-aurora" />
            <DialogTitle>
              {editOnly ? t("trackingEditTitle") : t("trackingDialogTitle")}
            </DialogTitle>
          </div>
          {!editOnly && (
            <p className="text-sm text-text-tertiary">{t("trackingDialogDesc")}</p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* 택배사 */}
          <div className="space-y-1.5">
            <Label htmlFor="carrier">{t("trackingCompany")}</Label>
            <div className="flex gap-2">
              <select
                id="carrier"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="flex-1 cursor-pointer rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-iris focus:outline-none"
              >
                <option value="">{t("trackingCompanyPlaceholder")}</option>
                {CARRIERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Input
                placeholder="직접 입력"
                value={CARRIERS.includes(company) ? "" : company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-32"
              />
            </div>
          </div>

          {/* 운송장 번호 */}
          <div className="space-y-1.5">
            <Label htmlFor="tracking-number">{t("trackingNumber")}</Label>
            <Input
              id="tracking-number"
              placeholder={t("trackingNumberPlaceholder")}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {!editOnly && onConfirmWithoutTracking && (
            <button
              type="button"
              onClick={onConfirmWithoutTracking}
              disabled={loading}
              className="cursor-pointer text-sm text-text-tertiary underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("trackingShipWithoutTracking")}
            </button>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="cursor-pointer rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2 disabled:opacity-50"
            >
              {tc("cancel")}
            </button>
            <Button
              onClick={() =>
                onConfirmWithTracking({
                  tracking_company: company.trim() || null,
                  tracking_number: number.trim() || null,
                })
              }
              disabled={!hasTracking || loading}
              className="min-w-32"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : editOnly ? (
                tc("save")
              ) : (
                t("trackingShipWithTracking")
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
