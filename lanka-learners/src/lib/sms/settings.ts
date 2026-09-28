import "server-only";

import { unstable_cache } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";

import {
  DEFAULT_SMS_EVENTS,
  SMS_EVENT_KEYS,
  type SmsEvent,
} from "./events";

export type SmsSettings = {
  enabled: boolean;
  senderId: string;
  events: Record<SmsEvent, boolean>;
};

const SMS_ENABLED_KEY = "sms.enabled";
const SMS_SENDER_ID_KEY = "sms.senderId";
const eventKey = (event: SmsEvent) => `sms.event.${event}`;

const readSmsSettings = unstable_cache(
  async (): Promise<SmsSettings> => {
    const keys = [
      SMS_ENABLED_KEY,
      SMS_SENDER_ID_KEY,
      ...SMS_EVENT_KEYS.map(eventKey),
    ];
    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: keys } },
    });
    const stored = new Map(rows.map((row) => [row.key, row.value]));

    return {
      enabled: stored.get(SMS_ENABLED_KEY) === "true",
      senderId: stored.get(SMS_SENDER_ID_KEY) ?? "",
      events: Object.fromEntries(
        SMS_EVENT_KEYS.map((event) => [
          event,
          stored.get(eventKey(event)) === "true",
        ])
      ) as Record<SmsEvent, boolean>,
    };
  },
  ["sms-settings"],
  { tags: [CACHE_TAGS.settings], revalidate: 3600 }
);

export async function getSmsSettings(): Promise<SmsSettings> {
  try {
    return await readSmsSettings();
  } catch {
    return { enabled: false, senderId: "", events: DEFAULT_SMS_EVENTS };
  }
}

export function smsSettingsRows(settings: SmsSettings) {
  return [
    { key: SMS_ENABLED_KEY, value: String(settings.enabled) },
    { key: SMS_SENDER_ID_KEY, value: settings.senderId },
    ...SMS_EVENT_KEYS.map((event) => ({
      key: eventKey(event),
      value: String(settings.events[event]),
    })),
  ];
}
