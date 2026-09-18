"use client";

import { FileSpreadsheetIcon, FileTextIcon, LoaderCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ExportDownloadButton({
  format,
  week,
  captured,
  disabled = false,
}: {
  format: "pdf" | "csv";
  week: string;
  captured: boolean;
  disabled?: boolean;
}) {
  const [downloading, setDownloading] = useState(false);
  const router = useRouter();
  const Icon = format === "pdf" ? FileTextIcon : FileSpreadsheetIcon;

  async function download() {
    setDownloading(true);
    try {
      const response = await fetch(`/api/client-exports/${format}?week=${week}`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(result?.error || `Could not generate the ${format.toUpperCase()} file.`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1]
        ?? `all-clients-week-${week}.${format}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success(`${format.toUpperCase()} download started`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The download failed.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={format === "pdf" ? "default" : "outline"}
      size="sm"
      disabled={disabled || downloading}
      onClick={() => void download()}
    >
      {downloading ? (
        <LoaderCircleIcon className="size-3.5 animate-spin" />
      ) : (
        <Icon className="size-3.5" />
      )}
      {downloading
        ? "Preparing..."
        : captured
          ? `Download ${format.toUpperCase()} again`
          : `Capture & download ${format.toUpperCase()}`}
    </Button>
  );
}
