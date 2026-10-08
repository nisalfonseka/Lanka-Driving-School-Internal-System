"use client";

import { LoaderIcon, MessageSquareTextIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { updateSmsSettingsAction } from "@/actions/settings";
import { Field } from "@/components/forms/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  SMS_EVENT_DEFINITIONS,
  type SmsEvent,
} from "@/lib/sms/events";
import type { SmsSettings } from "@/lib/sms/settings";

export function SmsSettingsForm({
  defaults,
  tokenConfigured,
}: {
  defaults: SmsSettings;
  tokenConfigured: boolean;
}) {
  const [enabled, setEnabled] = useState(defaults.enabled);
  const [senderId, setSenderId] = useState(defaults.senderId);
  const [events, setEvents] = useState(defaults.events);
  const [senderError, setSenderError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setEvent(event: SmsEvent, checked: boolean) {
    setEvents((current) => ({ ...current, [event]: checked }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSenderError(undefined);
    setIsSubmitting(true);

    const result = await updateSmsSettingsAction({
      enabled,
      senderId,
      events,
    });

    setIsSubmitting(false);
    if (!result.ok) {
      setSenderError(result.fieldErrors?.senderId?.[0]);
      toast.error(result.error);
      return;
    }

    toast.success("SMS notification settings saved");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Alert>
        <MessageSquareTextIcon />
        <AlertTitle className="flex flex-wrap items-center gap-2">
          Text.lk connection
          <Badge variant={tokenConfigured ? "secondary" : "destructive"}>
            {tokenConfigured ? "API token configured" : "API token missing"}
          </Badge>
        </AlertTitle>
        <AlertDescription>
          The API token is kept on the server. Notifications do not block a
          registration or other system action if Text.lk is unavailable. Each
          message includes the learner, admission number, branch, business
          contact and website where available.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Enable automatic SMS</p>
          <p className="text-xs text-muted-foreground">
            The event switches below only send while this master switch is on.
          </p>
        </div>
        <Switch
          aria-label="Enable automatic SMS"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>

      <Field
        label="Text.lk Sender ID"
        htmlFor="smsSenderId"
        error={senderError}
        hint="Enter the sender ID approved in your Text.lk account."
        required={enabled}
      >
        <Input
          id="smsSenderId"
          value={senderId}
          onChange={(event) => setSenderId(event.target.value)}
          placeholder="Your approved sender ID"
          maxLength={20}
          aria-invalid={Boolean(senderError)}
        />
      </Field>

      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-medium">Notification events</h3>
          <p className="text-xs text-muted-foreground">
            Choose exactly which successful client actions send a message.
          </p>
        </div>

        <div className="divide-y rounded-lg border">
          {SMS_EVENT_DEFINITIONS.map((definition) => (
            <label
              key={definition.key}
              className="flex cursor-pointer items-center justify-between gap-4 p-4"
            >
              <span>
                <span className="block text-sm font-medium">
                  {definition.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {definition.description}
                </span>
              </span>
              <Switch
                aria-label={definition.label}
                checked={events[definition.key]}
                onCheckedChange={(checked) =>
                  setEvent(definition.key, checked)
                }
              />
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <LoaderIcon className="size-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save SMS Settings"
        )}
      </Button>
    </form>
  );
}
