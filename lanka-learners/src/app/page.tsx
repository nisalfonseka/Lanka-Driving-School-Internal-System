import {
  BarChart3Icon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Sign in",
};

const HIGHLIGHTS = [
  {
    icon: UsersIcon,
    title: "Learner records",
    description:
      "Registrations, documents, examinations and training in one place.",
  },
  {
    icon: BarChart3Icon,
    title: "Fees and expenses",
    description: "Track payments, outstanding balances and running costs.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Accountable by design",
    description: "Every important action is recorded against a staff member.",
  },
];

/**
 * The sign-in screen is the application's front door — there is no public
 * marketing site. Anyone already signed in is sent straight to their dashboard.
 */
export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const settings = await getSettings();

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* ---------------------------------------------- Brand panel ---- */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 lg:flex">
        {/* Very subtle depth — no gradients competing with the content. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-primary/5 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full bg-accent/40 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <Image
            src="/logo.png"
            alt=""
            width={44}
            height={44}
            priority
            className="size-11 rounded-lg object-contain"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">
              {settings.systemName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Internal Management System
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Everything your driving school runs on, in one system.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Clients, lectures, practical training, examinations and finance —
            recorded accurately and available to the people who need them.
          </p>

          <ul className="mt-8 space-y-5">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-sm">
                  <item.icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground">
          © {new Date().getFullYear()} {settings.businessName}
        </p>
      </section>

      {/* ------------------------------------------------ Form panel --- */}
      <section className="flex flex-col justify-center bg-background px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo repeats on small screens, where the brand panel is hidden. */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <Image
              src="/logo.png"
              alt=""
              width={64}
              height={64}
              priority
              className="size-16 rounded-xl object-contain"
            />
            <h1 className="mt-4 text-lg font-semibold tracking-tight">
              {settings.systemName}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {settings.businessName}
            </p>
          </div>

          <div className="mb-6 hidden lg:block">
            <h2 className="text-xl font-semibold tracking-tight">
              Sign in to your account
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your staff credentials to continue.
            </p>
          </div>

          <LoginForm />

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Authorised staff only. All activity is recorded.
            <br />
            Accounts are issued by the system owner.
          </p>
        </div>
      </section>
    </main>
  );
}
