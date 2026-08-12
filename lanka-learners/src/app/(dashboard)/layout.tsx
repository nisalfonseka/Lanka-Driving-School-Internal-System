import Image from "next/image";
import Link from "next/link";

import { BackButton } from "@/components/layout/back-button";
import { DashboardNavButton } from "@/components/layout/dashboard-nav-button";
import { SriLankaClock } from "@/components/layout/sri-lanka-clock";
import { TodaySummaryDialog } from "@/components/layout/today-summary-dialog";
import { UserMenu } from "@/components/layout/user-menu";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getDashboardStats } from "@/lib/queries/dashboard";
import { getSettings } from "@/lib/settings";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side gate. Middleware already redirected anonymous visitors, but
  // this also catches accounts deactivated since the token was issued.
  const user = await requireUser();
  const settings = await getSettings();
  const [stats, profileRecord, activity] = await Promise.all([
    getDashboardStats(),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        fullName: true,
        username: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, description: true, action: true, createdAt: true },
    }),
  ]);

  if (!profileRecord) return null;

  const profile = {
    ...profileRecord,
    role: profileRecord.role as "OWNER" | "EMPLOYEE",
    lastLoginAt: profileRecord.lastLoginAt?.toISOString() ?? null,
    createdAt: profileRecord.createdAt.toISOString(),
    activity: activity.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    })),
  };

  return (
    <div className="min-h-dvh bg-muted/25">
      <header className="app-header sticky top-0 z-20 border-b-2 border-primary/20 bg-sidebar text-sidebar-foreground shadow-[0_3px_0_var(--accent)] backdrop-blur print:hidden">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <BackButton />
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2.5 rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Image
              src="/logo.png"
              alt=""
              width={32}
              height={32}
              priority
              className="size-8 shrink-0 rounded-lg object-contain"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight">
                {settings.systemName}
              </span>
              <span className="hidden truncate text-[11px] text-sidebar-foreground/70 sm:block">
                Staff workspace
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <SriLankaClock />
            <TodaySummaryDialog stats={stats} />
            <DashboardNavButton />
            <UserMenu
              fullName={user.fullName}
              username={user.username}
              role={user.role}
              profile={profile}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}
