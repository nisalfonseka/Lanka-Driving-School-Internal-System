/**
 * Rules for the client Documents section. Pure, so the server action that
 * enforces them and the dialog that mirrors them can share one definition.
 */

export const DOCUMENT_FIELDS = [
  "medicalReportNumber",
  "medicalIssueDate",
  "schoolCertificateNumber",
  "dmtBarcodeNumber",
  "learnerPermitNumber",
  "learnerPermitIssueDate",
] as const;

export type DocumentField = (typeof DOCUMENT_FIELDS)[number];

/** Text as trimmed text, dates as YYYY-MM-DD; null when nothing is recorded. */
export type DocumentValues = Record<DocumentField, string | null>;

export const DOCUMENT_LABELS: Record<DocumentField, string> = {
  medicalReportNumber: "Medical report number",
  medicalIssueDate: "Medical issue date",
  schoolCertificateNumber: "School certificate number",
  dmtBarcodeNumber: "DMT barcode number",
  learnerPermitNumber: "Learner permit number",
  learnerPermitIssueDate: "Learner permit issue date",
};

type DocumentRow = {
  medicalReportNumber: string | null;
  medicalIssueDate: Date | null;
  schoolCertificateNumber: string | null;
  dmtBarcodeNumber: string | null;
  learnerPermitNumber: string | null;
  learnerPermitIssueDate: Date | null;
};

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function dateValue(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function toDocumentValues(
  row: DocumentRow | null | undefined
): DocumentValues {
  return {
    medicalReportNumber: clean(row?.medicalReportNumber),
    medicalIssueDate: dateValue(row?.medicalIssueDate),
    schoolCertificateNumber: clean(row?.schoolCertificateNumber),
    dmtBarcodeNumber: clean(row?.dmtBarcodeNumber),
    learnerPermitNumber: clean(row?.learnerPermitNumber),
    learnerPermitIssueDate: dateValue(row?.learnerPermitIssueDate),
  };
}

/** Fields that already hold a value. */
export function filledFields(values: DocumentValues): DocumentField[] {
  return DOCUMENT_FIELDS.filter((field) => clean(values[field]) !== null);
}

/** Fields whose value differs; blank and whitespace-only count as the same. */
export function changedFields(
  current: DocumentValues,
  next: DocumentValues
): DocumentField[] {
  return DOCUMENT_FIELDS.filter(
    (field) => clean(current[field]) !== clean(next[field])
  );
}

/**
 * Fields that already hold a value and that `next` would change or clear. An
 * employee may only fill gaps, so any entry here means their edit is refused.
 */
export function lockedFieldsChanged(
  current: DocumentValues,
  next: DocumentValues
): DocumentField[] {
  const filled = new Set(filledFields(current));
  return changedFields(current, next).filter((field) => filled.has(field));
}
