import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Sign in",
};

/**
 * The sign-in screen is the application's front door — there is no public
 * marketing site. Anyone already signed in is sent straight to their dashboard.
 */
export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const settings = await getSettings();

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-muted/45 px-4 py-8 sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-primary/[0.04]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/15" />
      <div aria-hidden className="pointer-events-none absolute -top-40 -right-28 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full bg-chart-2/10 blur-3xl" />

      <section className="relative w-full max-w-[26rem]">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-xl shadow-foreground/[0.08]">
          <div className="border-b bg-muted/45 px-6 py-7 sm:px-8">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt=""
                width={48}
                height={48}
                priority
                className="size-12 shrink-0 rounded-xl object-contain"
              />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold tracking-tight text-foreground">
                  {settings.systemName}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {settings.businessName}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-7 sm:px-8 sm:py-8">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Sign in to your account
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              Enter your staff credentials to continue.
            </p>

            <div className="mt-6">
              <LoginForm />
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          Authorised staff only. All activity is recorded.
          <br />
          Accounts are issued by the system owner.
        </p>
      </section>
    </main>
  );
}
