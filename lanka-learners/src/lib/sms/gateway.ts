import "server-only";

import { prisma } from "@/lib/db";

import type { SmsEvent } from "./events";
import { normaliseSriLankanMobile } from "./messages";
import { getSmsSettings } from "./settings";

const TEXT_LK_SEND_URL = "https://app.text.lk/api/v3/sms/send";

type SmsNotification = {
  event: SmsEvent;
  recipient: string;
  message: string;
  entityType?: string;
  entityId?: string;
};

type ProviderResponse = {
  status?: string;
  message?: string;
  data?: { uid?: string; id?: string };
};

function providerMessageId(value: ProviderResponse): string | null {
  return value.data?.uid ?? value.data?.id ?? null;
}

async function writeDeliveryLog(
  input: SmsNotification & {
    recipient: string;
    status: "SENT" | "FAILED" | "SKIPPED";
    providerMessageId?: string | null;
    error?: string | null;
  }
) {
  try {
    await prisma.smsDeliveryLog.create({
      data: {
        event: input.event,
        recipient: input.recipient,
        message: input.message,
        status: input.status,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        providerMessageId: input.providerMessageId ?? null,
        error: input.error?.slice(0, 500) ?? null,
        sentAt: input.status === "SENT" ? new Date() : null,
      },
    });
  } catch (error) {
    console.error("[sms] failed to write delivery log", error);
  }
}

/**
 * Sends one configured event notification. This function deliberately never
 * throws: an SMS outage must not roll back a client, payment, exam or trial.
 */
export async function sendSmsNotification(
  input: SmsNotification
): Promise<void> {
  const settings = await getSmsSettings();
  if (!settings.enabled || !settings.events[input.event]) return;

  const recipient = normaliseSriLankanMobile(input.recipient);
  if (!recipient) {
    await writeDeliveryLog({
      ...input,
      recipient: input.recipient,
      status: "SKIPPED",
      error: "Invalid Sri Lankan mobile number",
    });
    return;
  }

  const token = process.env.TEXT_LK_API_TOKEN?.trim();
  if (!token || !settings.senderId) {
    await writeDeliveryLog({
      ...input,
      recipient,
      status: "SKIPPED",
      error: !token
        ? "TEXT_LK_API_TOKEN is not configured"
        : "Text.lk sender ID is not configured",
    });
    return;
  }

  try {
    const body = new URLSearchParams({
      recipient,
      sender_id: settings.senderId,
      type: "plain",
      message: input.message,
    });
    const response = await fetch(TEXT_LK_SEND_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as ProviderResponse;
    const providerStatus = payload.status?.toLowerCase();
    const successful =
      response.ok &&
      !["error", "failed", "failure"].includes(providerStatus ?? "");

    if (!successful) {
      throw new Error(payload.message || `Text.lk returned HTTP ${response.status}`);
    }

    await writeDeliveryLog({
      ...input,
      recipient,
      status: "SENT",
      providerMessageId: providerMessageId(payload),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown SMS error";
    console.error(`[sms] ${input.event} delivery failed: ${message}`);
    await writeDeliveryLog({
      ...input,
      recipient,
      status: "FAILED",
      error: message,
    });
  }
}
