import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import path from "node:path";

import type { AppSettings } from "@/lib/settings";

import {
  ageAtSnapshot,
  classList,
  clientFinancials,
  countTrainingsWithStatus,
  exportDate,
  exportEnum,
  exportMoney,
  trainingStatusText,
} from "./presentation";
import type { ClientExportSnapshot, WeeklyClientSnapshot } from "./types";
import { exportWeekLabel } from "./weeks";

Font.register({
  family: "Noto Sans Sinhala",
  fonts: [
    {
      src: path.join(
        process.cwd(),
        "node_modules/@openfonts/noto-sans-sinhala_all/files/noto-sans-sinhala-all-400.woff"
      ),
      fontWeight: 400,
    },
    {
      src: path.join(
        process.cwd(),
        "node_modules/@openfonts/noto-sans-sinhala_all/files/noto-sans-sinhala-all-600.woff"
      ),
      fontWeight: 600,
    },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const colours = {
  ink: "#17202a",
  muted: "#667085",
  border: "#d8dde5",
  soft: "#f5f7fa",
  accent: "#2f5d50",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingHorizontal: 27,
    paddingBottom: 25,
    fontFamily: "Noto Sans Sinhala",
    fontSize: 7.2,
    lineHeight: 1.35,
    color: colours.ink,
    backgroundColor: colours.white,
  },
  topLine: { height: 3, backgroundColor: colours.accent, marginBottom: 10 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
  },
  businessName: { fontSize: 11, fontWeight: 600 },
  reportName: {
    marginTop: 2,
    color: colours.muted,
    fontSize: 7,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  headerMeta: { alignItems: "flex-end", maxWidth: 230 },
  headerMetaStrong: { fontSize: 8, fontWeight: 600 },
  headerMetaText: { marginTop: 2, color: colours.muted, fontSize: 6.7 },
  identityBar: {
    marginTop: 10,
    padding: 9,
    backgroundColor: colours.soft,
    borderLeftWidth: 3,
    borderLeftColor: colours.accent,
  },
  clientName: { fontSize: 13, fontWeight: 600, lineHeight: 1.25 },
  clientKey: { marginTop: 3, color: colours.muted, fontSize: 7.2 },
  status: {
    position: "absolute",
    right: 9,
    top: 9,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colours.border,
    color: colours.accent,
    fontSize: 6.5,
    fontWeight: 600,
  },
  columns: { flexDirection: "row", gap: 8, marginTop: 8 },
  column: { flex: 1, gap: 7 },
  section: {
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  sectionTitle: {
    paddingVertical: 4,
    paddingHorizontal: 7,
    backgroundColor: colours.soft,
    color: colours.accent,
    fontSize: 6.5,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.65,
  },
  fieldGrid: { flexDirection: "row", flexWrap: "wrap", padding: 3 },
  field: { width: "50%", paddingVertical: 3, paddingHorizontal: 4 },
  fieldWide: { width: "100%", paddingVertical: 3, paddingHorizontal: 4 },
  label: { color: colours.muted, fontSize: 5.8, marginBottom: 1 },
  value: { fontSize: 7, fontWeight: 400 },
  missing: { fontSize: 7, color: "#8a94a3" },
  footer: {
    position: "absolute",
    left: 27,
    right: 27,
    bottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: colours.border,
    color: colours.muted,
    fontSize: 5.8,
  },
});

function Field({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string | number | null | undefined;
  wide?: boolean;
}) {
  const text = value === null || value === undefined || value === ""
    ? "Not provided"
    : String(value);
  return (
    <View style={wide ? styles.fieldWide : styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={text === "Not provided" ? styles.missing : styles.value}>{text}</Text>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.fieldGrid}>{children}</View>
    </View>
  );
}

function latestRecord<T>(records: T[]): T | undefined {
  return records.at(-1);
}

function countStatus(records: { status: string }[], status: string): number {
  return records.filter((record) => record.status === status).length;
}

function countResult(records: { result: string }[], result: string): number {
  return records.filter((record) => record.result === result).length;
}

function ClientPage({
  client,
  snapshot,
  settings,
  index,
}: {
  client: ClientExportSnapshot;
  snapshot: WeeklyClientSnapshot;
  settings: AppSettings;
  index: number;
}) {
  const finances = clientFinancials(client);
  const latestExam = latestRecord(client.writtenExams);
  const latestTrial = latestRecord(client.trials);
  const latestTraining = latestRecord(client.trainings);
  const age = ageAtSnapshot(client.dateOfBirth, snapshot.capturedAt);
  const weekStart = new Date(snapshot.weekStart);

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.topLine} />
      <View style={styles.header}>
        <View>
          <Text style={styles.businessName}>{settings.businessName}</Text>
          <Text style={styles.reportName}>Weekly complete client snapshot</Text>
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.headerMetaStrong}>{exportWeekLabel(weekStart)}</Text>
          <Text style={styles.headerMetaText}>
            Captured {exportDate(snapshot.capturedAt)} | All registered clients
          </Text>
        </View>
      </View>

      <View style={styles.identityBar}>
        <Text style={styles.clientName}>{client.fullName}</Text>
        <Text style={styles.clientKey}>
          Admission {client.admissionNumber} | NIC {client.idNumber}
        </Text>
        <Text style={styles.status}>{exportEnum(client.status)}</Text>
      </View>

      <View style={styles.columns}>
        <View style={styles.column}>
          <Section title="Personal and contact details">
            <Field label="Full name" value={client.fullName} wide />
            <Field label="NIC / ID number" value={client.idNumber} />
            <Field label="Date of birth" value={exportDate(client.dateOfBirth)} />
            <Field label="Age at snapshot" value={age === null ? null : `${age} years`} />
            <Field label="Main mobile" value={client.mobileMain} />
            <Field label="Backup mobile" value={client.mobileBackup} />
            <Field label="WhatsApp" value={client.mobileWhatsapp} />
            <Field label="Address" value={client.address} wide />
            <Field label="Profile photo" value={client.profilePhoto ? "Uploaded" : null} />
          </Section>

          <Section title="Registration and licence">
            <Field label="Admission number" value={client.admissionNumber} />
            <Field label="Registered date" value={exportDate(client.registeredDate)} />
            <Field label="Training type" value={exportEnum(client.scheduleType)} />
            <Field label="Status" value={exportEnum(client.status)} />
            <Field label="Requested vehicle classes" value={classList(client.vehicleClasses)} wide />
            <Field label="Previous licence number" value={client.previousLicense?.licenseNumber} />
            <Field label="Previous licence issue date" value={exportDate(client.previousLicense?.issueDate)} />
            <Field
              label="Previous licence classes"
              value={classList(client.previousLicense?.vehicleClasses ?? [])}
              wide
            />
          </Section>

          <Section title="Record metadata">
            <Field label="Registered by" value={client.createdBy.fullName} />
            <Field label="Created at" value={exportDate(client.createdAt)} />
            <Field label="Last updated by" value={client.updatedBy.fullName} />
            <Field label="Last profile update" value={exportDate(client.updatedAt)} />
          </Section>
        </View>

        <View style={styles.column}>
          <Section title="Documents and permits">
            <Field label="Medical report number" value={client.document?.medicalReportNumber} />
            <Field label="Medical issue date" value={exportDate(client.document?.medicalIssueDate)} />
            <Field label="School certificate number" value={client.document?.schoolCertificateNumber} />
            <Field label="DMT barcode number" value={client.document?.dmtBarcodeNumber} />
            <Field label="Learner permit number" value={client.document?.learnerPermitNumber} />
            <Field
              label="Learner permit issue date"
              value={exportDate(client.document?.learnerPermitIssueDate)}
            />
          </Section>

          <Section title="Fees and payments">
            <Field label="Total agreed fee" value={exportMoney(finances.agreed)} />
            <Field label="Total paid" value={exportMoney(finances.paid)} />
            <Field label="Remaining balance" value={exportMoney(finances.remaining)} />
            <Field label="Payment records" value={client.payments.length} />
            <Field
              label="Latest payment"
              value={
                latestRecord(client.payments)
                  ? `${exportDate(latestRecord(client.payments)?.paymentDate)} | ${exportMoney(latestRecord(client.payments)?.amount ?? 0)}`
                  : null
              }
              wide
            />
          </Section>

          <Section title="Exams and trials">
            <Field label="Written exam attempts" value={client.writtenExams.length} />
            <Field label="Written exam passes" value={countResult(client.writtenExams, "PASS")} />
            <Field
              label="Latest written exam"
              value={latestExam ? `${exportDate(latestExam.examDate)} | ${exportEnum(latestExam.result)}` : null}
              wide
            />
            <Field label="Trial attempts" value={client.trials.length} />
            <Field label="Trial passes" value={countResult(client.trials, "PASS")} />
            <Field
              label="Latest trial"
              value={
                latestTrial
                  ? [
                      exportDate(latestTrial.trialDate),
                      latestTrial.vehicleClass?.code,
                      exportEnum(latestTrial.result),
                    ]
                      .filter(Boolean)
                      .join(" | ")
                  : null
              }
              wide
            />
          </Section>

          <Section title="Attendance and training">
            <Field label="Lecture records" value={client.lectures.length} />
            <Field label="Lecture present" value={countStatus(client.lectures, "PRESENT")} />
            <Field label="Lecture absent" value={countStatus(client.lectures, "ABSENT")} />
            <Field label="Practical training records" value={client.trainings.length} />
            <Field label="Training completed" value={countTrainingsWithStatus(client.trainings, "COMPLETED")} />
            <Field label="Training absent" value={countTrainingsWithStatus(client.trainings, "ABSENT")} />
            <Field
              label="Latest training"
              value={
                latestTraining
                  ? `${exportDate(latestTraining.trainingDate)} | ${trainingStatusText(latestTraining)}`
                  : null
              }
              wide
            />
          </Section>
        </View>
      </View>

      <View style={styles.footer} fixed>
        <Text>Sensitive owner-only export | Snapshot ID: {snapshot.weekStart.slice(0, 10)}</Text>
        <Text>
          Client {index + 1} of {snapshot.clients.length} | Page {index + 1} of {snapshot.clients.length}
        </Text>
      </View>
    </Page>
  );
}

function EmptyPage({ snapshot, settings }: { snapshot: WeeklyClientSnapshot; settings: AppSettings }) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.topLine} />
      <Text style={styles.businessName}>{settings.businessName}</Text>
      <Text style={styles.reportName}>Weekly complete client snapshot</Text>
      <View style={[styles.identityBar, { marginTop: 20 }]}> 
        <Text style={styles.clientName}>No clients were registered</Text>
        <Text style={styles.clientKey}>
          The snapshot for {exportWeekLabel(new Date(snapshot.weekStart))} contains zero client records.
        </Text>
      </View>
    </Page>
  );
}

function WeeklyClientPdf({
  snapshot,
  settings,
}: {
  snapshot: WeeklyClientSnapshot;
  settings: AppSettings;
}) {
  return (
    <Document
      title={`Complete client snapshot - ${snapshot.weekStart.slice(0, 10)}`}
      author={settings.businessName}
      subject="Owner-only weekly export of all client profiles"
      creator="Lanka Learners"
    >
      {snapshot.clients.length === 0 ? (
        <EmptyPage snapshot={snapshot} settings={settings} />
      ) : (
        snapshot.clients.map((client, index) => (
          <ClientPage
            key={client.id}
            client={client}
            snapshot={snapshot}
            settings={settings}
            index={index}
          />
        ))
      )}
    </Document>
  );
}

export async function renderWeeklyClientPdf(
  snapshot: WeeklyClientSnapshot,
  settings: AppSettings
): Promise<Buffer> {
  return renderToBuffer(<WeeklyClientPdf snapshot={snapshot} settings={settings} />);
}
