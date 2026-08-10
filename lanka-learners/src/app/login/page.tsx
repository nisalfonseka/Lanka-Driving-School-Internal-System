import { redirect } from "next/navigation";

/**
 * Sign-in now lives at the application root. This route is kept so existing
 * bookmarks and any links to /login still work.
 */
export default async function LoginRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = Array.isArray(params.next) ? params.next[0] : params.next;

  // Only forward a safe, app-relative path.
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;

  redirect(safeNext ? `/?next=${encodeURIComponent(safeNext)}` : "/");
}
