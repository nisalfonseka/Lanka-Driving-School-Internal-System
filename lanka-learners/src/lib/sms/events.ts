export const SMS_EVENT_DEFINITIONS = [
  {
    key: "CLIENT_REGISTERED",
    label: "Client registered",
    description: "Welcome message with admission number, branch and contact details.",
  },
  {
    key: "PAYMENT_RECEIVED",
    label: "Payment received",
    description: "Payment amount, date, method and bill number confirmation.",
  },
  {
    key: "WRITTEN_EXAM_SCHEDULED",
    label: "Written exam scheduled",
    description: "Written exam date, admission number and arrival reminder.",
  },
  {
    key: "WRITTEN_EXAM_RESULT",
    label: "Written exam result",
    description: "New written exam result after it is recorded.",
  },
  {
    key: "PRACTICAL_TRIAL_SCHEDULED",
    label: "Practical trial scheduled",
    description: "Trial date, vehicle classes and arrival reminder.",
  },
  {
    key: "PRACTICAL_TRIAL_RESULT",
    label: "Practical trial result",
    description: "New practical trial result after it is recorded.",
  },
  {
    key: "CLIENT_COMPLETED",
    label: "Client completed",
    description: "Completion confirmation when the client is marked Completed.",
  },
] as const;

export type SmsEvent = (typeof SMS_EVENT_DEFINITIONS)[number]["key"];

export const SMS_EVENT_KEYS = SMS_EVENT_DEFINITIONS.map(
  (event) => event.key
) as SmsEvent[];

export const DEFAULT_SMS_EVENTS = Object.fromEntries(
  SMS_EVENT_KEYS.map((event) => [event, false])
) as Record<SmsEvent, boolean>;
