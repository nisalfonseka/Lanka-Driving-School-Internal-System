import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/jwt";
import { isOwnerOnlyPath } from "@/lib/permissions";

/**
 * First line of defence only. (Next.js 16 renamed `middleware` to `proxy`.)
 *
 * This redirects signed-out visitors and keeps employees out of owner-only
 * pages, but it is *not* the security boundary — it cannot check that the
 * account is still active, since it does not touch the database. Every page
 * re-checks with `requireUser` / `requireOwnerPage`, and every mutation
 * re-checks with `requireUserAction` / `requireOwnerAction`.
 */

/** The root path is the sign-in screen, so it must stay reachable signed out. */
const PUBLIC_PATHS = ["/", "/login", "/api/auth/login"];

function securityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  return response;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    return securityHeaders(NextResponse.next());
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySessionToken(token) : null;

  if (!claims) {
    if (pathname.startsWith("/api/")) {
      return securityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    // Sign-in lives at the root.
    const loginUrl = new URL("/", request.url);
    if (pathname !== "/" && pathname !== "/dashboard") {
      loginUrl.searchParams.set("next", pathname);
    }
    return securityHeaders(NextResponse.redirect(loginUrl));
  }

  if (claims.role !== "OWNER" && isOwnerOnlyPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return securityHeaders(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );
    }
    return securityHeaders(
      NextResponse.redirect(new URL("/forbidden", request.url))
    );
  }

  return securityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    // Everything except Next internals, the login API and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
