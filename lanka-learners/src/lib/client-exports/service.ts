import "server-only";

import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

import { captureClientSnapshot } from "./snapshot";
import type { ExportFormat, WeeklyClientSnapshot } from "./types";
import { currentExportWeekStart, exportWeekKey } from "./weeks";

export class MissedExportWeekError extends Error {
  constructor() {
    super("This past week was not captured. Historical data cannot be reconstructed safely.");
    this.name = "MissedExportWeekError";
  }
}

export function readStoredSnapshot(value: Prisma.JsonValue): WeeklyClientSnapshot {
  const snapshot = value as unknown as WeeklyClientSnapshot;
  if (
    snapshot?.version !== 1 ||
    typeof snapshot.weekStart !== "string" ||
    typeof snapshot.capturedAt !== "string" ||
    !Array.isArray(snapshot.clients)
  ) {
    throw new Error("The stored client export has an unsupported format.");
  }
  return snapshot;
}

/**
 * The current week is captured lazily on its first download. An older week can
 * only be downloaded if it was genuinely captured during that week.
 */
export async function getOrCaptureWeeklyExport(
  weekStart: Date,
  ownerId: string
) {
  const existing = await prisma.weeklyClientExport.findUnique({
    where: { weekStart },
  });
  if (existing) return existing;

  if (weekStart.getTime() !== currentExportWeekStart().getTime()) {
    throw new MissedExportWeekError();
  }

  const capturedAt = new Date();
  const snapshot = await captureClientSnapshot(weekStart, capturedAt);

  try {
    return await prisma.weeklyClientExport.create({
      data: {
        weekStart,
        capturedAt,
        clientCount: snapshot.clients.length,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        capturedById: ownerId,
      },
    });
  } catch (error) {
    // Two nearly simultaneous first downloads may race. The unique week key
    // chooses the winning immutable snapshot; both responses use that winner.
    const winner = await prisma.weeklyClientExport.findUnique({
      where: { weekStart },
    });
    if (winner) return winner;
    throw error;
  }
}

export async function markWeeklyExportDownloaded(input: {
  exportId: string;
  weekStart: Date;
  format: ExportFormat;
  ownerId: string;
  clientCount: number;
}): Promise<void> {
  const now = new Date();
  const row = await prisma.weeklyClientExport.findUniqueOrThrow({
    where: { id: input.exportId },
    select: {
      pdfFirstDownloadedAt: true,
      csvFirstDownloadedAt: true,
    },
  });

  await prisma.weeklyClientExport.update({
    where: { id: input.exportId },
    data:
      input.format === "pdf"
        ? {
            pdfDownloadCount: { increment: 1 },
            pdfFirstDownloadedAt: row.pdfFirstDownloadedAt ?? now,
            pdfLastDownloadedAt: now,
          }
        : {
            csvDownloadCount: { increment: 1 },
            csvFirstDownloadedAt: row.csvFirstDownloadedAt ?? now,
            csvLastDownloadedAt: now,
          },
  });

  await writeAuditLog({
    userId: input.ownerId,
    action: input.format === "pdf" ? "EXPORT_CLIENTS_PDF" : "EXPORT_CLIENTS_CSV",
    entityType: "ClientExport",
    entityId: exportWeekKey(input.weekStart),
    description: `Downloaded the ${input.format.toUpperCase()} client snapshot for the week of ${exportWeekKey(input.weekStart)} (${input.clientCount} clients).`,
    newData: {
      weekStart: exportWeekKey(input.weekStart),
      format: input.format,
      clientCount: input.clientCount,
    },
  });
}

