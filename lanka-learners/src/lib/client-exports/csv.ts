import {
  ageAtSnapshot,
  classList,
  clientFinancials,
} from "./presentation";
import type { WeeklyClientSnapshot } from "./types";

const COLUMNS = [
  "snapshot_week_start",
  "snapshot_captured_at",
  "client_id",
  "admission_number",
  "full_name",
  "nic_id_number",
  "date_of_birth",
  "age_at_snapshot",
  "address",
  "main_mobile",
  "backup_mobile",
  "whatsapp_mobile",
  "profile_photo_url",
  "registered_date",
  "training_type",
  "client_status",
  "vehicle_classes",
  "medical_report_number",
  "medical_issue_date",
  "school_certificate_number",
  "dmt_barcode_number",
  "learner_permit_number",
  "learner_permit_issue_date",
  "previous_license_number",
  "previous_license_issue_date",
  "previous_license_classes",
  "total_agreed_fee_lkr",
  "total_paid_lkr",
  "remaining_balance_lkr",
  "written_exam_count",
  "trial_count",
  "lecture_count",
  "practical_training_count",
  "payment_count",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "written_exams_json",
  "trials_json",
  "lectures_json",
  "practical_training_json",
  "payments_json",
] as const;

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function renderWeeklyClientCsv(snapshot: WeeklyClientSnapshot): string {
  const rows: string[][] = [Array.from(COLUMNS)];

  for (const client of snapshot.clients) {
    const finances = clientFinancials(client);
    const age = ageAtSnapshot(client.dateOfBirth, snapshot.capturedAt);
    rows.push([
      snapshot.weekStart.slice(0, 10),
      snapshot.capturedAt,
      client.id,
      client.admissionNumber,
      client.fullName,
      client.idNumber,
      client.dateOfBirth.slice(0, 10),
      age ?? "",
      client.address,
      client.mobileMain,
      client.mobileBackup ?? "",
      client.mobileWhatsapp ?? "",
      client.profilePhoto ?? "",
      client.registeredDate.slice(0, 10),
      client.scheduleType,
      client.status,
      classList(client.vehicleClasses),
      client.document?.medicalReportNumber ?? "",
      client.document?.medicalIssueDate?.slice(0, 10) ?? "",
      client.document?.schoolCertificateNumber ?? "",
      client.document?.dmtBarcodeNumber ?? "",
      client.document?.learnerPermitNumber ?? "",
      client.document?.learnerPermitIssueDate?.slice(0, 10) ?? "",
      client.previousLicense?.licenseNumber ?? "",
      client.previousLicense?.issueDate?.slice(0, 10) ?? "",
      classList(client.previousLicense?.vehicleClasses ?? []),
      finances.agreed.toFixed(2),
      finances.paid.toFixed(2),
      finances.remaining.toFixed(2),
      client.writtenExams.length,
      client.trials.length,
      client.lectures.length,
      client.trainings.length,
      client.payments.length,
      client.createdAt,
      client.createdBy.fullName ?? "",
      client.updatedAt,
      client.updatedBy.fullName ?? "",
      JSON.stringify(client.writtenExams),
      JSON.stringify(client.trials),
      JSON.stringify(client.lectures),
      JSON.stringify(client.trainings),
      JSON.stringify(client.payments),
    ].map(String));
  }

  // UTF-8 BOM makes Sinhala content open correctly in Microsoft Excel.
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

