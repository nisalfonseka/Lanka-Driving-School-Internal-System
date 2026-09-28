import { formatCurrency, formatDate, humanise } from "@/lib/format";

import type { SmsEvent } from "./events";

export type SmsMessageData = {
  businessName: string;
  clientName: string;
  admissionNumber: string;
  amount?: unknown;
  billNumber?: string;
  date?: Date | string;
  result?: string;
  vehicleClasses?: string;
};

/** Keep automated messages short enough for predictable SMS billing. */
export function buildSmsMessage(
  event: SmsEvent,
  data: SmsMessageData
): string {
  const name = data.clientName.trim().split(/\s+/)[0] || data.clientName;
  const suffix = `- ${data.businessName}`;

  switch (event) {
    case "CLIENT_REGISTERED":
      return `Welcome ${name}. Your registration is complete. Admission No: ${data.admissionNumber}. ${suffix}`;
    case "PAYMENT_RECEIVED":
      return `Payment of ${formatCurrency(data.amount)} received. Bill No: ${data.billNumber}. Thank you. ${suffix}`;
    case "WRITTEN_EXAM_SCHEDULED":
      return `Your written exam is scheduled for ${formatDate(data.date)}. Admission No: ${data.admissionNumber}. ${suffix}`;
    case "WRITTEN_EXAM_RESULT":
      return `Your written exam result is ${humanise(data.result)}. Admission No: ${data.admissionNumber}. ${suffix}`;
    case "PRACTICAL_TRIAL_SCHEDULED":
      return `Your practical trial (${data.vehicleClasses}) is scheduled for ${formatDate(data.date)}. Admission No: ${data.admissionNumber}. ${suffix}`;
    case "PRACTICAL_TRIAL_RESULT":
      return `Your practical trial result (${data.vehicleClasses}) is ${humanise(data.result)}. Admission No: ${data.admissionNumber}. ${suffix}`;
    case "CLIENT_COMPLETED":
      return `Congratulations ${name}. Your learner record is now completed. Admission No: ${data.admissionNumber}. ${suffix}`;
  }
}

/** Text.lk expects an international-format Sri Lankan number without '+'. */
export function normaliseSriLankanMobile(value: string): string | null {
  const compact = value.replace(/[\s()-]/g, "");

  if (/^0\d{9}$/.test(compact)) return `94${compact.slice(1)}`;
  if (/^94\d{9}$/.test(compact)) return compact;
  if (/^\+94\d{9}$/.test(compact)) return compact.slice(1);

  return null;
}
