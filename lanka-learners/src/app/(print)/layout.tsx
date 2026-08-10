import { requireUser } from "@/lib/auth/session";

/**
 * Bare layout for printable documents — no sidebar or header, so the browser's
 * print output contains only the document itself. Still authenticated.
 */
export default async function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return <div className="min-h-dvh bg-muted/40 p-4 print:bg-white print:p-0">{children}</div>;
}
