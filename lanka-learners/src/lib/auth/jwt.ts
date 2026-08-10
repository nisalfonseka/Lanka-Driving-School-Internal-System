import "server-only";

import { SignJWT, jwtVerify } from "jose";

import type { Role } from "@/generated/prisma/enums";

export const SESSION_COOKIE = "ll_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

/**
 * Minimum claims only. Never put names, emails or anything sensitive in here —
 * a JWT payload is readable by anyone holding the token.
 */
export type SessionClaims = {
  /** User id. */
  sub: string;
  /** Role, so middleware can gate owner-only routes without a DB round trip. */
  role: Role;
  /** Token version — bumped on password reset / deactivation to revoke tokens. */
  tv: number;
};

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET is missing or shorter than 32 characters. Generate one with: openssl rand -base64 48"
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ role: claims.role, tv: claims.tv })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setIssuer("lanka-learners")
    .setAudience("lanka-learners")
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

/** Returns null for any invalid, expired or malformed token. Never throws. */
export async function verifySessionToken(
  token: string
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: "lanka-learners",
      audience: "lanka-learners",
      algorithms: ["HS256"],
    });

    if (
      typeof payload.sub !== "string" ||
      (payload.role !== "OWNER" && payload.role !== "EMPLOYEE") ||
      typeof payload.tv !== "number"
    ) {
      return null;
    }

    return { sub: payload.sub, role: payload.role, tv: payload.tv };
  } catch {
    return null;
  }
}
