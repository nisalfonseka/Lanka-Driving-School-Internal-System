import { formatCurrency, formatDate, humanise } from "@/lib/format";

import type { SmsEvent } from "./events";

export type SmsMessageData = {
  businessName: string;
  businessPhone?: string;
  businessWebsite?: string;
  clientName: string;
  admissionNumber: string;
  branchName?: string;
  amount?: unknown;
  billNumber?: string;
  date?: Date | string;
  paymentMethod?: string;
  paymentType?: string;
  result?: string;
  vehicleClasses?: string;
};

function compactWebsite(value: string | undefined): string | null {
  const website = value?.trim();
  if (!website) return null;
  return website.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function commonLines(data: SmsMessageData): string[] {
  const website = compactWebsite(data.businessWebsite);
  return [
    data.branchName ? `Branch: ${data.branchName}` : null,
    website ? `Information: ${website}` : null,
    data.businessPhone?.trim()
      ? `Inquiries: ${data.businessPhone.trim()}`
      : null,
  ].filter((line): line is string => Boolean(line));
}

function message(
  data: SmsMessageData,
  eventLines: Array<string | null | undefined>,
  closing = "Thank you."
): string {
  const name = data.clientName.trim().split(/\s+/)[0] || data.clientName;
  return [
    `Hi ${name},`,
    ...eventLines,
    `Admission No: ${data.admissionNumber}`,
    ...commonLines(data),
    closing,
    `- ${data.businessName}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

/** Plain ASCII and compact lines keep multipart SMS billing predictable. */
export function buildSmsMessage(
  event: SmsEvent,
  data: SmsMessageData
): string {
  switch (event) {
    case "CLIENT_REGISTERED":
      return message(
        data,
        [`Welcome to ${data.businessName}!`, "Registration: Complete"],
        "Thank you and drive safely!"
      );
    case "PAYMENT_RECEIVED":
      return message(data, [
        "Payment received successfully.",
        data.billNumber ? `Bill No: ${data.billNumber}` : null,
        data.date ? `Payment Date: ${formatDate(data.date)}` : null,
        `Amount: ${formatCurrency(data.amount)}`,
        data.paymentType
          ? `Payment Type: ${humanise(data.paymentType)}`
          : null,
        data.paymentMethod
          ? `Payment Method: ${humanise(data.paymentMethod)}`
          : null,
      ]);
    case "WRITTEN_EXAM_SCHEDULED":
      return message(
        data,
        ["Written Exam Scheduled", `Date: ${formatDate(data.date)}`],
        "Please arrive on time with the required documents."
      );
    case "WRITTEN_EXAM_RESULT":
      return message(data, [
        "Written Exam Result",
        `Result: ${humanise(data.result)}`,
      ]);
    case "PRACTICAL_TRIAL_SCHEDULED":
      return message(
        data,
        [
          "Practical Trial Scheduled",
          data.vehicleClasses
            ? `Vehicle Class: ${data.vehicleClasses}`
            : null,
          `Date: ${formatDate(data.date)}`,
        ],
        "Please arrive on time with the required documents."
      );
    case "PRACTICAL_TRIAL_RESULT":
      return message(data, [
        "Practical Trial Result",
        data.vehicleClasses
          ? `Vehicle Class: ${data.vehicleClasses}`
          : null,
        `Result: ${humanise(data.result)}`,
      ]);
    case "CLIENT_COMPLETED":
      return message(
        data,
        ["Congratulations!", "Your learner record is now complete."],
        "Thank you and drive safely!"
      );
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
