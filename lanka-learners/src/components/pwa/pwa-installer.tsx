"use client";

import { DownloadIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

/** Registers the static-only service worker and offers the native install UI. */
export function PwaInstaller() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((error: unknown) => {
          console.error("[pwa] service worker registration failed", error);
        });
    }

    if (isStandalone()) return;

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      toast.success("The app was installed successfully.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (choice.outcome === "dismissed") {
      toast.info("You can install the app later from your browser menu.");
    }
  }

  if (!installPrompt || dismissed) return null;

  return (
    <aside
      aria-label="Install application"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-1 rounded-xl border bg-card/95 p-1 text-card-foreground shadow-lg backdrop-blur print:hidden"
    >
      <Button type="button" variant="ghost" size="sm" onClick={install}>
        <DownloadIcon className="size-4" />
        Install app
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss install suggestion"
        onClick={() => setDismissed(true)}
      >
        <XIcon className="size-3.5" />
      </Button>
    </aside>
  );
}
