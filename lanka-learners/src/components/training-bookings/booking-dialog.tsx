"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import {
  createBookingAction,
  getSlotAvailabilityAction,
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
import { bookingCreateSchema } from "@/lib/validations/operations";

type FormValues = {
  bookingDate: string;
  slot: BookingSlot | "";
  name: string;
  contactNumber: string;
};

/**
 * "Add booking". The slot list shows how many seats are left for the chosen
 * date and disables full slots; the server re-checks on save.
 */
export function BookingDialog({
  defaultDate,
  defaultSlot,
  variant = "primary",
}: {
  defaultDate: string;
  defaultSlot?: BookingSlot;
  /** "slot" renders the small inline "Book" button used in empty table cells. */
  variant?: "primary" | "slot";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [availability, setAvailability] = useState<Record<
    BookingSlot,
    number
  > | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  // Several of these dialogs live on one page, so ids must be unique.
  const uid = useId();
  const formId = `${uid}-form`;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // The slot starts empty (""), which the schema rejects with a friendly message.
    resolver: zodResolver(bookingCreateSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      bookingDate: defaultDate,
      slot: defaultSlot ?? "",
      name: "",
      contactNumber: "",
    },
  });

  // Debounced: typing a date fires onChange per segment; look up once it settles.
  const availabilityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleAvailability(date: string) {
    if (availabilityTimer.current) clearTimeout(availabilityTimer.current);
    availabilityTimer.current = setTimeout(() => {
      void loadAvailability(date);
    }, 300);
  }

  const loadAvailability = useCallback(
    async (date: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        setAvailability(null);
        return;
      }
      setLoadingSlots(true);
      const result = await getSlotAvailabilityAction(date);
      setLoadingSlots(false);
      if (!result.ok) {
        setAvailability(null);
        return;
      }
      setAvailability(result.data);
      // Clear a chosen slot that is full on the newly picked date.
      const current = getValues("slot");
      if (current && result.data[current] === 0) setValue("slot", "");
    },
    [getValues, setValue]
  );

  const slotOptions = BOOKING_SLOTS.map((slot) => {
    const left = availability?.[slot];
    const suffix =
      left === undefined ? "" : left === 0 ? " · Full" : ` · ${left} left`;
    return {
      value: slot,
      label: `${SLOT_LABELS[slot]}${suffix}`,
      disabled: left === 0,
    };
  });

  async function onSubmit(values: FormValues) {
    const result = await createBookingAction(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          setError(field as keyof FormValues, {
            type: "server",
            message: messages[0],
          });
        }
      }
      toast.error(result.error);
      // The slot may have filled up meanwhile — refresh the counts.
      void loadAvailability(values.bookingDate);
      return;
    }

    toast.success("Booking added");
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          reset({
            bookingDate: defaultDate,
            slot: defaultSlot ?? "",
            name: "",
            contactNumber: "",
          });
          void loadAvailability(defaultDate);
        }
      }}
    >
      <DialogTrigger
        render={
          variant === "slot" ? (
            <Button
              variant="ghost"
              size="xs"
              className="text-primary hover:bg-primary/10 hover:text-primary"
            >
              <PlusIcon className="size-3" />
              Book
            </Button>
          ) : (
            <Button>
              <PlusIcon className="size-4" />
              Add Booking
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Training Booking</DialogTitle>
          <DialogDescription>
            Each time slot takes up to two people.
          </DialogDescription>
        </DialogHeader>

        <form
          id={formId}
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Date"
              htmlFor={`${uid}-date`}
              required
              error={errors.bookingDate?.message}
            >
              <Input
                id={`${uid}-date`}
                type="date"
                aria-invalid={Boolean(errors.bookingDate)}
                {...register("bookingDate")}
                onInput={(event) =>
                  scheduleAvailability(event.currentTarget.value)
                }
              />
            </Field>

            <Field
              label="Time Slot"
              required
              error={errors.slot?.message}
              hint={loadingSlots ? "Checking availability…" : undefined}
            >
              <Controller
                control={control}
                name="slot"
                render={({ field }) => (
                  <SelectField
                    value={field.value}
                    onValueChange={field.onChange}
                    options={slotOptions}
                    placeholder="Select a slot…"
                    invalid={Boolean(errors.slot)}
                  />
                )}
              />
            </Field>
          </div>

          <Field
            label="Name"
            htmlFor={`${uid}-name`}
            required
            error={errors.name?.message}
          >
            <Input
              id={`${uid}-name`}
              autoComplete="off"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </Field>

          <Field
            label="Contact Number"
            htmlFor={`${uid}-contact`}
            required
            error={errors.contactNumber?.message}
          >
            <Input
              id={`${uid}-contact`}
              type="tel"
              inputMode="tel"
              placeholder="0771234567"
              autoComplete="off"
              aria-invalid={Boolean(errors.contactNumber)}
              {...register("contactNumber")}
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
          <Button type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Add Booking"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
