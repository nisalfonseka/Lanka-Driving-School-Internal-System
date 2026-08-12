"use client";

import { LoaderIcon, LogOutIcon, UserIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ProfileDialog, type ProfileData } from "@/components/layout/profile-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/format";

export function UserMenu({
  fullName,
  username,
  role,
  profile,
}: {
  fullName: string;
  username: string;
  role: "OWNER" | "EMPLOYEE";
  profile: ProfileData;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("logout failed");

      /*
        A full navigation to the sign-in screen. This discards the entire client
        router cache, so no signed-in page content survives the sign-out — which
        a soft router.replace() would leave behind.
      */
      window.location.replace("/");
      return;
    } catch {
      toast.error("Could not sign out. Please try again.");
      setSigningOut(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" className="gap-2 pl-1.5">
              <Avatar className="size-6">
                <AvatarFallback className="text-[10px]">
                  {initials(fullName)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-32 truncate sm:inline">
                {fullName}
              </span>
            </Button>
          }
        />

        <DropdownMenuContent align="end" className="w-56">
          {/* GroupLabel requires a Group ancestor — Base UI throws without it. */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="truncate font-medium">{fullName}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  @{username} · {role === "OWNER" ? "Owner" : "Employee"}
                </span>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setProfileOpen(true)}>
            <UserIcon className="size-4" />
            Profile
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/*
            The dropdown closes on select, so the confirmation dialog is a
            sibling driven by its own state — otherwise it would unmount with
            the menu before the user could answer.
          */}
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <LogOutIcon className="size-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileDialog
        profile={profile}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          // Don't let the dialog be dismissed mid-request.
          if (!signingOut) setConfirmOpen(next);
        }}
      >
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of Lanka Learners?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to enter your username and password again to get
              back in. Any unsaved changes on this page will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={signOut}
              disabled={signingOut}
            >
              {signingOut ? (
                <>
                  <LoaderIcon className="size-4 animate-spin" />
                  Signing out…
                </>
              ) : (
                <>
                  <LogOutIcon className="size-4" />
                  Sign out
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
