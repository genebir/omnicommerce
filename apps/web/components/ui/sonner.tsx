"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        className:
          "!bg-bg-surface !border-border-subtle !text-text-primary !shadow-lg",
        descriptionClassName: "!text-text-secondary",
      }}
      closeButton
    />
  );
}
