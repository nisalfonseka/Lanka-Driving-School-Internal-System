import "server-only";

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

import { prisma } from "@/lib/db";

import { burnTimingBudget, verifyPassword } from "./password";

/**
 * Passport is used purely as the credential-verification layer. There is no
 * Express server and no Passport session — the strategy's verify callback runs,
 * and on success the caller mints a stateless JWT. That keeps the app
 * deployable to serverless infrastructure.
 */

export type AuthenticatedUser = {
  id: string;
  username: string;
  fullName: string;
  role: "OWNER" | "EMPLOYEE";
  tokenVersion: number;
};

export type AuthFailureReason = "INVALID_CREDENTIALS" | "ACCOUNT_INACTIVE";

export type AuthResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; reason: AuthFailureReason };

const localStrategy = new LocalStrategy(
  { usernameField: "username", passwordField: "password", session: false },
  async (username, password, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { username: username.trim().toLowerCase() },
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          status: true,
          tokenVersion: true,
          passwordHash: true,
        },
      });

      if (!user) {
        // Equalise response time so the endpoint cannot enumerate usernames.
        await burnTimingBudget(password);
        return done(null, false, { message: "INVALID_CREDENTIALS" });
      }

      const passwordMatches = await verifyPassword(password, user.passwordHash);
      if (!passwordMatches) {
        return done(null, false, { message: "INVALID_CREDENTIALS" });
      }

      // Checked after the password so a wrong password never reveals that an
      // account exists but is deactivated.
      if (user.status !== "ACTIVE") {
        return done(null, false, { message: "ACCOUNT_INACTIVE" });
      }

      const authenticated: AuthenticatedUser = {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        tokenVersion: user.tokenVersion,
      };

      return done(null, authenticated);
    } catch (error) {
      return done(error as Error);
    }
  }
);

passport.use("local", localStrategy);

/**
 * Runs the Local Strategy outside Express.
 *
 * `Object.create` gives each attempt its own object whose prototype is the
 * shared strategy, so the success/fail/error hooks are per-request and
 * concurrent logins cannot clobber each other.
 */
export function authenticateLocal(
  username: string,
  password: string
): Promise<AuthResult> {
  return new Promise((resolve, reject) => {
    const attempt = Object.create(localStrategy) as LocalStrategy & {
      success: (user: AuthenticatedUser) => void;
      fail: (info: { message?: string } | number, status?: number) => void;
      error: (err: Error) => void;
    };

    attempt.success = (user) => resolve({ ok: true, user });

    attempt.fail = (info) => {
      const message =
        typeof info === "object" && info !== null ? info.message : undefined;
      resolve({
        ok: false,
        reason:
          message === "ACCOUNT_INACTIVE"
            ? "ACCOUNT_INACTIVE"
            : "INVALID_CREDENTIALS",
      });
    };

    attempt.error = (err) => reject(err);

    // The strategy only reads `body` from the request object.
    attempt.authenticate({ body: { username, password } } as never);
  });
}
