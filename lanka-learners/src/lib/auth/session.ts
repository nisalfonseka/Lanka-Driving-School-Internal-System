import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  verifySessionToken,
} from "./jwt";

export type SessionUser = {
  id: string;
  fullName: string;
  username: string;
  email: string | null;
  role: "OWNER" | "EMPLOYEE";
};

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "You must be signed in to perform this action.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function createSession(user: {
  id: string;
  role: "OWNER" | "EMPLOYEE";
  tokenVersion: number;
}): Promise<void> {
  const token = await signSessionToken({
    sub: user.id,
    role: user.role,
    tv: user.tokenVersion,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Resolves the signed-in user, or null.
 *
 * The token is verified cryptographically *and* revalidated against the
 * database: a user who was deactivated or had their password reset since the
 * token was issued is rejected immediately, because `tokenVersion` no longer
 * matches. Cached per request so a page with many guards hits the DB once.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifySessionToken(token);
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      role: true,
      status: true,
      tokenVersion: true,
    },
  });

  if (!user) return null;
  if (user.status !== "ACTIVE") return null;
  if (user.tokenVersion !== claims.tv) return null;

  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    role: user.role,
  };
});

/** For Server Components: redirects to the sign-in screen (the root) when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

/** For Server Components: 404s employees out of owner-only pages. */
export async function requireOwnerPage(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/forbidden");
  return user;
}

/**
 * For Server Actions and Route Handlers. Throws instead of redirecting so the
 * caller can turn it into a 403 / error result.
 */
export async function requireUserAction(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireOwnerAction(): Promise<SessionUser> {
  const user = await requireUserAction();
  if (user.role !== "OWNER") throw new ForbiddenError();
  return user;
}
