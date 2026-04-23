"use client";

import { useState } from "react";
import { Store, Globe, ShoppingBag, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChannelCard } from "./ChannelCard";
import { ConnectWizard } from "./ConnectWizard";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useChannelTypes, useConnectedChannels, useDisconnectChannel } from "@/lib/hooks";

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  cafe24: Store,
  naver: Globe,
  coupang: ShoppingBag,
};

export function ChannelList() {
  const t = useTranslations("channels");
  const tc = useTranslations("common");
  const { data: channelTypes, isLoading: typesLoading } = useChannelTypes();
  const { data: connectedChannels } = useConnectedChannels();
  const disconnectChannel = useDisconnectChannel();
  const [wizardChannel, setWizardChannel] = useState<{
    code: string;
    name: string;
  } | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  if (typesLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  const types = channelTypes ?? [];
  const connected = connectedChannels ?? [];
  const connectedMap = new Map(
    connected.map((c) => [c.channel_type, c]),
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {types.map((ch) => {
          const conn = connectedMap.get(ch.code);
          return (
            <ChannelCard
              key={ch.code}
              code={ch.code}
              name={ch.name}
              icon={CHANNEL_ICONS[ch.code] ?? Store}
              connected={!!conn}
              productCount={conn?.product_count}
              orderCount={conn?.order_count}
              onConnect={() => setWizardChannel({ code: ch.code, name: ch.name })}
              onDisconnect={
                conn
                  ? () => setDisconnectTarget({ id: conn.id, name: ch.name })
                  : undefined
              }
            />
          );
        })}
      </div>

      {wizardChannel && (
        <ConnectWizard
          channelCode={wizardChannel.code}
          channelName={wizardChannel.name}
          open
          onOpenChange={(open) => {
            if (!open) setWizardChannel(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!disconnectTarget}
        onOpenChange={(open) => !open && setDisconnectTarget(null)}
        title={t("disconnectTitle")}
        description={t("disconnectConfirm", { channel: disconnectTarget?.name ?? "" })}
        confirmLabel={t("disconnect")}
        cancelLabel={tc("cancel")}
        destructive
        loading={disconnectChannel.isPending}
        onConfirm={async () => {
          if (!disconnectTarget) return;
          await disconnectChannel.mutateAsync(disconnectTarget.id);
          toast.success(t("disconnectSuccess"));
          setDisconnectTarget(null);
        }}
      />
    </>
  );
}
