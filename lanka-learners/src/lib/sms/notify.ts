import "server-only";

import { getSettings } from "@/lib/settings";

import type { SmsEvent } from "./events";
import { sendSmsNotification } from "./gateway";
import { buildSmsMessage, type SmsMessageData } from "./messages";

type ClientEventNotification = Omit<SmsMessageData, "businessName"> & {
  event: SmsEvent;
  recipient: string;
  entityType?: string;
  entityId?: string;
};

export async function notifyClientBySms(
  input: ClientEventNotification
): Promise<void> {
  const settings = await getSettings();
  const { event, recipient, entityType, entityId, ...messageData } = input;

  await sendSmsNotification({
    event,
    recipient,
    message: buildSmsMessage(event, {
      ...messageData,
      businessName: settings.businessName,
      businessPhone: settings.businessPhone,
      businessWebsite: settings.businessWebsite,
    }),
    entityType,
    entityId,
  });
}
