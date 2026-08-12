"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircleIcon, EyeIcon, EyeOffIcon, LoaderIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "", rememberMe: false },
  });
  const rememberMe = watch("rememberMe");

  async function onSubmit(values: LoginInput) {
    setFormError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        redirectTo?: string;
      };

      if (!response.ok || !data.ok) {
        setFormError(data.error ?? "Unable to sign in. Please try again.");
        return;
      }

      const next = searchParams.get("next");
      const destination =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : (data.redirectTo ?? "/dashboard");

      /*
        A full navigation rather than router.replace().

        Two reasons: calling replace() and refresh() together races — the
        refresh re-renders the current (sign-in) route and discards the pending
        navigation — and a hard load guarantees the client router cache is
        rebuilt from scratch with the new session cookie.
      */
      window.location.replace(destination);
      return;
    } catch {
      setFormError("Could not reach the server. Check your connection.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          <span>{formError}</span>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          aria-invalid={Boolean(errors.username)}
          {...register("username")}
        />
        {errors.username ? (
          <p className="text-xs text-destructive">{errors.username.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="pr-10"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOffIcon className="size-4" />
            ) : (
              <EyeIcon className="size-4" />
            )}
          </button>
        </div>
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2 pt-0.5">
        <Checkbox
          id="remember-me"
          checked={rememberMe}
          onCheckedChange={(checked) =>
            setValue("rememberMe", checked, { shouldDirty: true })
          }
        />
        <Label
          htmlFor="remember-me"
          className="cursor-pointer text-sm font-normal text-muted-foreground"
        >
          Remember me on this device
        </Label>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <LoaderIcon className="size-4 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
