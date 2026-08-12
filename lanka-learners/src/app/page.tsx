import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Sign in",
};

const LOGIN_IMAGE =
  "/ChatGPT%20Image%20Aug%2012%2C%202026%2C%2010_01_44%20PM.png";

/**
 * The sign-in screen is the application's front door — there is no public
 * marketing site. Anyone already signed in is sent straight to their dashboard.
 */
export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const settings = await getSettings();

  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1.1fr)_minmax(26rem,0.9fr)]">
      <section className="relative hidden overflow-hidden lg:block">
        <Image
          src={LOGIN_IMAGE}
          alt="Traffic lights on a Sri Lankan road"
          fill
          priority
          sizes="55vw"
          className="object-cover object-[43%_center]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10"
        />
      </section>

      <section className="flex min-h-dvh flex-col px-6 py-8 sm:px-10 lg:px-14">
        <header className="mx-auto flex w-full max-w-sm items-center gap-3">
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
        </header>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <div className="rounded-2xl border bg-card p-6 shadow-xl shadow-foreground/[0.07] sm:p-8">
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

          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            Authorised staff only. All activity is recorded.
            <br />
            Accounts are issued by the system owner.
          </p>
        </div>
      </section>
    </main>
  );
}
