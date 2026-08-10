import type { Metadata } from "next";

import { DetailList } from "@/components/shared/detail-list";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDateTime, humanise } from "@/lib/format";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await requireUser();

  const user = await prisma.user.findUnique({
    where: { id: session.id },
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
  });

  if (!user) return null;

  const recentActivity = await prisma.auditLog.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Profile"
        description="Your account details and recent activity."
      />

      <Card>
        <CardContent className="p-4 md:p-6">
          <DetailList
            items={[
              { label: "Full Name", value: user.fullName },
              { label: "Username", value: `@${user.username}` },
              { label: "Email", value: user.email ?? "—" },
              { label: "Mobile", value: user.mobile ?? "—" },
              {
                label: "Role",
                value: <StatusBadge value={user.role} />,
              },
              {
                label: "Status",
                value: <StatusBadge value={user.status} />,
              },
              {
                label: "Last Login",
                value: user.lastLoginAt
                  ? formatDateTime(user.lastLoginAt)
                  : "—",
              },
              {
                label: "Account Created",
                value: formatDateTime(user.createdAt),
              },
            ]}
          />

          <p className="mt-6 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            Contact the system owner to change your password or update your
            account details.
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b p-4">
          <h2 className="text-sm font-semibold">Your Recent Activity</h2>
        </div>

        {recentActivity.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No recorded activity yet.
          </p>
        ) : (
          <ul className="divide-y">
            {recentActivity.map((entry) => (
              <li key={entry.id} className="flex gap-3 p-4">
                <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <p className="text-sm">{entry.description}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {humanise(entry.action)} · {formatDateTime(entry.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
