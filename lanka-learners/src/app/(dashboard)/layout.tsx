import Image from "next/image";
import Link from "next/link";

import { MobileNav } from "@/components/layout/mobile-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
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

  return (
    <div className="flex min-h-dvh">
      {/*
        Sticky and exactly one viewport tall. Without `h-dvh` the aside would
        stretch to the height of the whole document, so on a long page its
        footer would sit far below the fold and the nav would scroll away.
        `self-start` stops the flex container from stretching it back.
      */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col self-start border-r bg-sidebar lg:flex">
        <Link
          href="/dashboard"
          className="flex h-14 items-center gap-2 border-b px-4 transition-colors hover:bg-sidebar-accent/50"
        >
          <Image
            src="/logo.png"
            alt=""
            width={28}
            height={28}
            priority
            className="size-7 shrink-0 rounded-md object-contain"
          />
          <span className="truncate text-sm font-semibold tracking-tight">
            {settings.systemName}
          </span>
        </Link>

        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav role={user.role} />
        </div>

        <div className="border-t p-3">
          <Badge variant="secondary" className="w-full justify-center">
            {user.role === "OWNER" ? "Owner Access" : "Employee Access"}
          </Badge>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-header sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden">
          <MobileNav role={user.role} systemName={settings.systemName} />

          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2 lg:hidden"
          >
            <Image
              src="/logo.png"
              alt=""
              width={24}
              height={24}
              className="size-6 shrink-0 rounded object-contain"
            />
            <span className="truncate text-sm font-semibold">
              {settings.systemName}
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <UserMenu
              fullName={user.fullName}
              username={user.username}
              role={user.role}
            />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
