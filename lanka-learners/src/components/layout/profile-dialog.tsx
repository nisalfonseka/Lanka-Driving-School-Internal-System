"use client";

import { DetailList } from "@/components/shared/detail-list";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime, humanise, initials } from "@/lib/format";

export type ProfileData = {
  fullName: string;
  username: string;
  email: string | null;
  mobile: string | null;
  role: "OWNER" | "EMPLOYEE";
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  activity: Array<{ id: string; description: string; action: string; createdAt: string }>;
};

export function ProfileDialog({
  profile,
  open,
  onOpenChange,
}: {
  profile: ProfileData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(720px,calc(100dvh-2rem))] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="size-11">
              <AvatarFallback>{initials(profile.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle>{profile.fullName}</DialogTitle>
              <DialogDescription>@{profile.username}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DetailList
          items={[
            { label: "Full Name", value: profile.fullName },
            { label: "Username", value: `@${profile.username}` },
            { label: "Email", value: profile.email ?? "—" },
            { label: "Mobile", value: profile.mobile ?? "—" },
            { label: "Role", value: <StatusBadge value={profile.role} /> },
            { label: "Status", value: <StatusBadge value={profile.status} /> },
            { label: "Last Login", value: profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : "—" },
            { label: "Account Created", value: formatDateTime(profile.createdAt) },
          ]}
        />

        <div className="rounded-xl border">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Recent activity</h3>
          </div>
          {profile.activity.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No recorded activity yet.</p>
          ) : (
            <ul className="divide-y">
              {profile.activity.map((entry) => (
                <li key={entry.id} className="flex gap-3 px-4 py-3">
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
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
