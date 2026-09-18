import { NextRequest, NextResponse } from "next/server";

import {
  ForbiddenError,
  requireOwnerAction,
  UnauthorizedError,
} from "@/lib/auth/session";
import { renderWeeklyClientPdf } from "@/lib/client-exports/pdf";
import {
  getOrCaptureWeeklyExport,
  markWeeklyExportDownloaded,
  MissedExportWeekError,
  readStoredSnapshot,
} from "@/lib/client-exports/service";
import { exportWeekKey, parseExportWeekKey } from "@/lib/client-exports/weeks";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const owner = await requireOwnerAction();
    const weekStart = parseExportWeekKey(request.nextUrl.searchParams.get("week"));
    if (!weekStart) {
      return NextResponse.json({ error: "Choose a valid Monday export week." }, { status: 400 });
    }

    const [stored, settings] = await Promise.all([
      getOrCaptureWeeklyExport(weekStart, owner.id),
      getSettings(),
    ]);
    const snapshot = readStoredSnapshot(stored.snapshot);
    const pdf = await renderWeeklyClientPdf(snapshot, settings);

    await markWeeklyExportDownloaded({
      exportId: stored.id,
      weekStart,
      format: "pdf",
      ownerId: owner.id,
      clientCount: snapshot.clients.length,
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="all-clients-week-${exportWeekKey(weekStart)}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof MissedExportWeekError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[client-export] PDF generation failed", error);
    return NextResponse.json(
      { error: "The PDF could not be generated. Please try again." },
      { status: 500 }
    );
  }
}
