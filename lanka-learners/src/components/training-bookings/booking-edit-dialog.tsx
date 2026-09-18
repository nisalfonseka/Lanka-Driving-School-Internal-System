"use client";

import {
  CheckIcon,
  ClockIcon,
  LoaderIcon,
  PencilIcon,
  PhoneIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";

import {
  deleteBookingAction,
  updateBookingAction,
  updateBookingAttendanceAction,
} from "@/actions/training-bookings";
import { Field } from "@/components/forms/field";
import { SelectField } from "@/components/forms/select-field";
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
  BOOKING_SLOTS,
  SLOT_LABELS,
  type BookingSlot,
} from "@/lib/booking-slots";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Attendance = "PENDING" | "PRESENT" | "ABSENT";

export type BookingRecord = {
  id: string;
  bookingDate: string;
  slot: BookingSlot;
  name: string;
  contactNumber: string;
  attendance: Attendance;
};

const ATTENDANCE_CHOICES: {
  value: Attendance;
  label: string;
  icon: typeof CheckIcon;
  active: string;
}[] = [
  {
    value: "PENDING",
    label: "Pending",
    icon: ClockIcon,
    active: "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  },
  {
    value: "PRESENT",
    label: "Present",
    icon: CheckIcon,
    active:
      "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  {
    value: "ABSENT",
    label: "Absent",
    icon: XIcon,
    active:
      "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
];

const SLOT_OPTIONS = BOOKING_SLOTS.map((slot) => ({
  value: slot,
  label: SLOT_LABELS[slot],
}));

/**
 * Edit a booking. Everyone can mark attendance; owners can also change the
 * details or cancel the booking (which frees the seat).
 */
export function BookingEditDialog({
  booking,
  canEditDetails,
}: {
  booking: BookingRecord;
  canEditDetails: boolean;
}) {
  const router = useRouter();
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [values, setValues] = useState(booking);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function resetState() {
    setValues(booking);
    setErrors({});
    setConfirmDelete(false);
  }

  function set<K extends keyof BookingRecord>(key: K, value: BookingRecord[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  async function save() {
    setPending(true);
    try {
      const result = canEditDetails
        ? await updateBookingAction(values)
        : await updateBookingAttendanceAction({
            id: booking.id,
            attendance: values.attendance,
          });

      if (!result.ok) {
        if (result.fieldErrors) {
          setErrors(
            Object.fromEntries(
              Object.entries(result.fieldErrors).map(([key, messages]) => [
                key,
                messages[0],
              ])
            )
          );
        }
        toast.error(result.error);
        return;
      }

      toast.success("Booking updated");
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      const result = await deleteBookingAction(booking.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Booking cancelled");
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetState();
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
          <DialogTitle>{booking.name}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              {formatDate(booking.bookingDate)} · {SLOT_LABELS[booking.slot]}
            </span>
            <span className="inline-flex items-center gap-1">
              <PhoneIcon className="size-3" />
              {booking.contactNumber}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Attendance</p>
            <div
              role="radiogroup"
              aria-label="Attendance"
              className="grid grid-cols-3 gap-2"
            >
              {ATTENDANCE_CHOICES.map((choice) => {
                const selected = values.attendance === choice.value;
                const Icon = choice.icon;
                return (
                  <button
                    key={choice.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => set("attendance", choice.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      selected
                        ? choice.active
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                    {choice.label}
                  </button>
                );
              })}
            </div>
          </div>

          {canEditDetails ? (
            <div className="space-y-4 border-t pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Date"
                  htmlFor={`${uid}-date`}
                  required
                  error={errors.bookingDate}
                >
                  <Input
                    id={`${uid}-date`}
                    type="date"
                    value={values.bookingDate}
                    aria-invalid={Boolean(errors.bookingDate)}
                    onChange={(event) => set("bookingDate", event.target.value)}
                  />
                </Field>
                <Field label="Time Slot" required error={errors.slot}>
                  <SelectField
                    value={values.slot}
                    onValueChange={(value) => set("slot", value as BookingSlot)}
                    options={SLOT_OPTIONS}
                    invalid={Boolean(errors.slot)}
                  />
                </Field>
              </div>
              <Field
                label="Name"
                htmlFor={`${uid}-name`}
                required
                error={errors.name}
              >
                <Input
                  id={`${uid}-name`}
                  value={values.name}
                  aria-invalid={Boolean(errors.name)}
                  onChange={(event) => set("name", event.target.value)}
                />
              </Field>
              <Field
                label="Contact Number"
                htmlFor={`${uid}-contact`}
                required
                error={errors.contactNumber}
              >
                <Input
                  id={`${uid}-contact`}
                  type="tel"
                  inputMode="tel"
                  value={values.contactNumber}
                  aria-invalid={Boolean(errors.contactNumber)}
                  onChange={(event) => set("contactNumber", event.target.value)}
                />
              </Field>
            </div>
          ) : null}

          {confirmDelete ? (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
            >
              <span>Cancel this booking and free the seat?</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmDelete(false)}
                  disabled={pending}
                >
                  Keep
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={remove}
                  disabled={pending}
                >
                  Yes, cancel it
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="sm:justify-between">
          {canEditDetails && !confirmDelete ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
              disabled={pending}
            >
              <Trash2Icon className="size-4" />
              Cancel booking
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Close
            </Button>
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? (
                <>
                  <LoaderIcon className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
