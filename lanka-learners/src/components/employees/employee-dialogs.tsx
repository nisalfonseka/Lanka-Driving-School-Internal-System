"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  LoaderIcon,
  PencilIcon,
  PowerIcon,
  UserPlusIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createEmployeeAction,
  resetEmployeePasswordAction,
  setEmployeeStatusAction,
  updateEmployeeAction,
} from "@/actions/employees";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  employeeCreateSchema,
  employeeUpdateSchema,
  passwordResetSchema,
  type EmployeeCreateInput,
  type EmployeeUpdateInput,
  type PasswordResetInput,
} from "@/lib/validations/admin";

/** Applies server-side field errors onto the form inputs. */
function applyFieldErrors<T extends Record<string, unknown>>(
  fieldErrors: Record<string, string[]> | undefined,
  setError: (name: keyof T, error: { type: string; message: string }) => void
) {
  if (!fieldErrors) return;
  for (const [field, messages] of Object.entries(fieldErrors)) {
    setError(field as keyof T, { type: "server", message: messages[0] });
  }
}

// ---------------------------------------------------------------------------

export function AddEmployeeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeCreateInput>({
    resolver: zodResolver(employeeCreateSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      mobile: "",
      password: "",
    },
  });

  async function onSubmit(values: EmployeeCreateInput) {
    const result = await createEmployeeAction(values);

    if (!result.ok) {
      applyFieldErrors<EmployeeCreateInput>(result.fieldErrors, setError);
      toast.error(result.error);
      return;
    }

    toast.success("Employee account created");
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <UserPlusIcon className="size-4" />
            Add Employee
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
          <DialogDescription>
            New accounts are always created with the Employee role.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-employee-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <Field
            label="Full Name"
            htmlFor="fullName"
            required
            error={errors.fullName?.message}
          >
            <Input
              id="fullName"
              aria-invalid={Boolean(errors.fullName)}
              {...register("fullName")}
            />
          </Field>

          <Field
            label="Username"
            htmlFor="username"
            required
            error={errors.username?.message}
          >
            <Input
              id="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={Boolean(errors.username)}
              {...register("username")}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" {...register("email")} />
            </Field>

            <Field
              label="Mobile"
              htmlFor="mobile"
              error={errors.mobile?.message}
            >
              <Input id="mobile" inputMode="tel" {...register("mobile")} />
            </Field>
          </div>

          <Field
            label="Password"
            htmlFor="password"
            required
            error={errors.password?.message}
            hint="At least 8 characters, including a letter and a number."
          >
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="pr-10"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
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
          </Field>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="add-employee-form" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create Employee"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

export function EditEmployeeDialog({
  employee,
}: {
  employee: {
    id: string;
    fullName: string;
    email: string | null;
    mobile: string | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeUpdateInput>({
    resolver: zodResolver(employeeUpdateSchema),
    defaultValues: {
      id: employee.id,
      fullName: employee.fullName,
      email: employee.email ?? "",
      mobile: employee.mobile ?? "",
    },
  });

  async function onSubmit(values: EmployeeUpdateInput) {
    const result = await updateEmployeeAction(values);

    if (!result.ok) {
      applyFieldErrors<EmployeeUpdateInput>(result.fieldErrors, setError);
      toast.error(result.error);
      return;
    }

    toast.success("Employee updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="xs">
            <PencilIcon className="size-3" />
            Edit
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>
            The username cannot be changed after the account is created.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-employee-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <Field
            label="Full Name"
            htmlFor={`edit-name-${employee.id}`}
            required
            error={errors.fullName?.message}
          >
            <Input
              id={`edit-name-${employee.id}`}
              aria-invalid={Boolean(errors.fullName)}
              {...register("fullName")}
            />
          </Field>

          <Field
            label="Email"
            htmlFor={`edit-email-${employee.id}`}
            error={errors.email?.message}
          >
            <Input
              id={`edit-email-${employee.id}`}
              type="email"
              {...register("email")}
            />
          </Field>

          <Field
            label="Mobile"
            htmlFor={`edit-mobile-${employee.id}`}
            error={errors.mobile?.message}
          >
            <Input
              id={`edit-mobile-${employee.id}`}
              inputMode="tel"
              {...register("mobile")}
            />
          </Field>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-employee-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

export function ResetPasswordDialog({
  employee,
}: {
  employee: { id: string; fullName: string; username: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetInput>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { id: employee.id, password: "", confirmPassword: "" },
  });

  async function onSubmit(values: PasswordResetInput) {
    const result = await resetEmployeePasswordAction(values);

    if (!result.ok) {
      applyFieldErrors<PasswordResetInput>(result.fieldErrors, setError);
      toast.error(result.error);
      return;
    }

    toast.success(
      `Password reset. ${employee.fullName} must sign in again with the new password.`
    );
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="xs">
            <KeyRoundIcon className="size-3" />
            Reset Password
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Set a temporary password for {employee.fullName} (@
            {employee.username}). Any session they currently have will be signed
            out.
          </DialogDescription>
        </DialogHeader>

        <form
          id="reset-password-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <Field
            label="New Password"
            htmlFor={`reset-pw-${employee.id}`}
            required
            error={errors.password?.message}
            hint="At least 8 characters, including a letter and a number."
          >
            <div className="relative">
              <Input
                id={`reset-pw-${employee.id}`}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="pr-10"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
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
          </Field>

          <Field
            label="Confirm Password"
            htmlFor={`confirm-pw-${employee.id}`}
            required
            error={errors.confirmPassword?.message}
          >
            <Input
              id={`confirm-pw-${employee.id}`}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              {...register("confirmPassword")}
            />
          </Field>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="reset-password-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Resetting…
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

export function ToggleStatusButton({
  employee,
}: {
  employee: {
    id: string;
    fullName: string;
    status: "ACTIVE" | "INACTIVE";
  };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const deactivating = employee.status === "ACTIVE";

  async function toggle() {
    setPending(true);
    try {
      const result = await setEmployeeStatusAction({
        id: employee.id,
        status: deactivating ? "INACTIVE" : "ACTIVE",
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        deactivating
          ? `${employee.fullName} has been deactivated and can no longer sign in.`
          : `${employee.fullName} has been reactivated.`
      );
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant={deactivating ? "destructive" : "outline"}
      size="xs"
      onClick={toggle}
      disabled={pending}
    >
      {pending ? (
        <LoaderIcon className="size-3 animate-spin" />
      ) : (
        <PowerIcon className="size-3" />
      )}
      {deactivating ? "Deactivate" : "Activate"}
    </Button>
  );
}
