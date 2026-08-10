import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit";
import { destroySession, getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();

  if (user) {
    await writeAuditLog({
      userId: user.id,
      action: "LOGOUT",
      entityType: "User",
      entityId: user.id,
      description: `${user.fullName} signed out`,
    });
  }

  await destroySession();

  return NextResponse.json({ ok: true });
}
