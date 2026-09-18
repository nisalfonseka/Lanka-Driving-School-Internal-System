/**
 * Turns raw audit-log records into plain language for non-technical owners.
 * Pure helpers — safe on server and client.
 */

import { formatCurrency, formatDate, humanise } from "@/lib/format";

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Signed in",
  LOGOUT: "Signed out",
  CREATE_CLIENT: "Registered a client",
  UPDATE_CLIENT: "Updated a client",
  CREATE_EXAM: "Added a written exam",
  UPDATE_EXAM: "Corrected a written exam",
  UPDATE_EXAM_RESULT: "Added a written exam result",
  CREATE_TRIAL: "Added a practical trial",
  UPDATE_TRIAL: "Corrected a practical trial",
  UPDATE_TRIAL_RESULT: "Added a practical trial result",
  CREATE_LECTURE_ATTENDANCE: "Recorded lecture attendance",
  UPDATE_LECTURE_ATTENDANCE: "Corrected lecture attendance",
  UPDATE_LECTURE_RESULT: "Updated lecture attendance",
  CREATE_PRACTICAL_TRAINING: "Added practical training",
  UPDATE_PRACTICAL_TRAINING: "Corrected practical training",
  UPDATE_TRAINING_RESULT: "Updated practical training status",
  CREATE_PAYMENT: "Received a payment",
  UPDATE_PAYMENT: "Corrected a payment",
  CREATE_EXPENSE: "Added an expense",
  UPDATE_EXPENSE: "Corrected an expense",
  CREATE_EMPLOYEE: "Added an employee",
  UPDATE_EMPLOYEE: "Updated an employee",
  DEACTIVATE_EMPLOYEE: "Deactivated an employee",
  ACTIVATE_EMPLOYEE: "Activated an employee",
  RESET_EMPLOYEE_PASSWORD: "Reset an employee's password",
  CREATE_VEHICLE_CLASS: "Added a vehicle class",
  UPDATE_VEHICLE_CLASS: "Updated a vehicle class",
  UPDATE_SETTINGS: "Changed system settings",
  CREATE_TRAINING_BOOKING: "Added a training booking",
  UPDATE_TRAINING_BOOKING: "Updated a training booking",
  UPDATE_BOOKING_ATTENDANCE: "Marked booking attendance",
  DELETE_TRAINING_BOOKING: "Cancelled a training booking",
  EXPORT_CLIENTS_PDF: "Downloaded a client PDF",
  EXPORT_CLIENTS_CSV: "Downloaded a client CSV",
};

const ENTITY_LABELS: Record<string, string> = {
  Client: "Client",
  WrittenExam: "Written exam",
  TrialExam: "Practical trial",
  LectureAttendance: "Lecture",
  PracticalTraining: "Practical training",
  ClientPayment: "Payment",
  CompanyExpense: "Expense",
  User: "Employee",
  VehicleClass: "Vehicle class",
  SystemSetting: "Settings",
  TrainingBooking: "Training booking",
  ClientExport: "Weekly client export",
};

const FIELD_LABELS: Record<string, string> = {
  fullName: "Full name",
  idNumber: "NIC / ID number",
  admissionNumber: "Admission number",
  address: "Address",
  mobileMain: "Main mobile",
  mobileBackup: "Backup mobile",
  mobileWhatsapp: "WhatsApp",
  scheduleType: "Training type",
  totalAgreedFee: "Agreed fee",
  status: "Status",
  examDate: "Exam date",
  trialDate: "Trial date",
  attendanceDate: "Lecture date",
  trainingDate: "Training date",
  paymentDate: "Payment date",
  expenseDate: "Expense date",
  dmtBarcode: "DMT barcode",
  attendance: "Attendance",
  result: "Result",
  resultNotes: "Notes",
  notes: "Notes",
  vehicleClasses: "Vehicle classes",
  billNumber: "Bill number",
  amount: "Amount",
  paymentType: "Payment type",
  description: "Description",
  category: "Category",
  subCategory: "Fuel type",
  username: "Username",
  email: "Email",
  mobile: "Mobile",
  role: "Role",
  code: "Code",
  name: "Name",
  key: "Setting",
  value: "Value",
  bookingDate: "Booking date",
  timeSlot: "Time slot",
  contactNumber: "Contact number",
};

const MONEY_FIELDS = new Set(["amount", "totalAgreedFee"]);

/** Internal identifiers mean nothing to a reader, so they are never shown. */
function isHiddenField(key: string): boolean {
  return key === "id" || /Ids?$/.test(key);
}

export function describeAction(action: string): string {
  return ACTION_LABELS[action] ?? humanise(action);
}

export function describeEntity(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? humanise(entityType);
}

export function fieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  // camelCase → "Camel case"
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/;
const ENUM_VALUE = /^[A-Z][A-Z0-9_]+$/;

export function formatFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";

  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (MONEY_FIELDS.has(key)) return formatCurrency(value);

  if (Array.isArray(value)) {
    return value.length === 0
      ? "—"
      : value.map((item) => formatFieldValue(key, item)).join(", ");
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([nestedKey]) => !isHiddenField(nestedKey))
      .map(
        ([nestedKey, nested]) =>
          `${fieldLabel(nestedKey)}: ${formatFieldValue(nestedKey, nested)}`
      )
      .join(", ");
  }

  const text = String(value);
  if (ISO_DATE.test(text)) return formatDate(text);
  if (ENUM_VALUE.test(text) && key !== "code" && !key.endsWith("Number")) {
    return humanise(text);
  }
  return text;
}

export type ChangeRow = {
  key: string;
  label: string;
  before: string;
  after: string;
  changed: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Lines up the before/after snapshots field by field. For a create there is no
 * "before", so every row simply shows the recorded value.
 */
export function buildChangeRows(oldData: unknown, newData: unknown): ChangeRow[] {
  const before = asRecord(oldData);
  const after = asRecord(newData);
  if (!before && !after) return [];

  const keys = [
    ...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
  ].filter((key) => !isHiddenField(key));

  return keys.map((key) => {
    const beforeText = before ? formatFieldValue(key, before[key]) : "—";
    const afterText = after ? formatFieldValue(key, after[key]) : "—";
    return {
      key,
      label: fieldLabel(key),
      before: beforeText,
      after: afterText,
      changed: Boolean(before && after) && beforeText !== afterText,
    };
  });
}

/** "Chrome on Windows" rather than a raw user-agent string. */
export function describeDevice(userAgent: string | null): string | null {
  if (!userAgent) return null;

  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\/|Opera/.test(userAgent)
      ? "Opera"
      : /Chrome\//.test(userAgent)
        ? "Chrome"
        : /Firefox\//.test(userAgent)
          ? "Firefox"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : "Web browser";

  const os = /iPhone|iPad|iPod/.test(userAgent)
    ? "iPhone / iPad"
    : /Android/.test(userAgent)
      ? "Android"
      : /Windows/.test(userAgent)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(userAgent)
          ? "Mac"
          : /Linux/.test(userAgent)
            ? "Linux"
            : null;

  return os ? `${browser} on ${os}` : browser;
}
