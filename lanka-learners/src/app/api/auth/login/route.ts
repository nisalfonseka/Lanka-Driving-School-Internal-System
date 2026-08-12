import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit";
import { authenticateLocal } from "@/lib/auth/passport";
import {
  checkLoginRateLimit,
  clearLoginAttempts,
  recordFailedLogin,
} from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Login: Route Handler → Passport Local Strategy → verify password → JWT →
 * HttpOnly cookie. No password, hash or token is ever returned in the body.
 */
export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter your username and password." },
      { status: 400 }
    );
  }

  const { username, password, rememberMe = false } = parsed.data;

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rateKey = `${ip}:${username.toLowerCase()}`;

  const limit = checkLoginRateLimit(rateKey);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Too many failed attempts. Try again in ${Math.ceil(
          limit.retryAfterSeconds / 60
        )} minute(s).`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const result = await authenticateLocal(username, password);

    if (!result.ok) {
      recordFailedLogin(rateKey);

      if (result.reason === "ACCOUNT_INACTIVE") {
        return NextResponse.json(
          {
            error:
              "This account has been deactivated. Contact the owner for access.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    clearLoginAttempts(rateKey);

    await createSession(
      {
        id: result.user.id,
        role: result.user.role,
        tokenVersion: result.user.tokenVersion,
      },
      { rememberMe }
    );

    await prisma.user.update({
      where: { id: result.user.id },
      data: { lastLoginAt: new Date() },
    });

    await writeAuditLog({
      userId: result.user.id,
      action: "LOGIN",
      entityType: "User",
      entityId: result.user.id,
      description: `${result.user.fullName} signed in`,
    });

    return NextResponse.json({
      ok: true,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    console.error("[auth/login] unexpected error", error);
    return NextResponse.json(
      { error: "Sign in is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
