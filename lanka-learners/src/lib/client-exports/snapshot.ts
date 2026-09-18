import "server-only";

import { prisma } from "@/lib/db";

import type { ClientExportSnapshot, WeeklyClientSnapshot } from "./types";

const iso = (value: Date): string => value.toISOString();
const optionalIso = (value: Date | null): string | null =>
  value ? value.toISOString() : null;
const actor = (value: { fullName: string } | null) => ({
  fullName: value?.fullName ?? null,
});

/** Captures every client profile and all records linked from that profile. */
export async function captureClientSnapshot(
  weekStart: Date,
  capturedAt: Date
): Promise<WeeklyClientSnapshot> {
  const clients = await prisma.client.findMany({
    orderBy: [{ admissionNumber: "asc" }, { fullName: "asc" }],
    include: {
      createdBy: { select: { fullName: true } },
      updatedBy: { select: { fullName: true } },
      vehicleClasses: {
        orderBy: { vehicleClass: { code: "asc" } },
        include: { vehicleClass: { select: { code: true, name: true } } },
      },
      document: true,
      previousLicense: {
        include: {
          vehicleClasses: {
            orderBy: { vehicleClass: { code: "asc" } },
            include: { vehicleClass: { select: { code: true, name: true } } },
          },
        },
      },
      writtenExams: {
        orderBy: { examDate: "asc" },
        include: {
          createdBy: { select: { fullName: true } },
          updatedBy: { select: { fullName: true } },
        },
      },
      trials: {
        orderBy: { trialDate: "asc" },
        include: {
          createdBy: { select: { fullName: true } },
          updatedBy: { select: { fullName: true } },
        },
      },
      lectureAttendance: {
        orderBy: { attendanceDate: "asc" },
        include: {
          createdBy: { select: { fullName: true } },
          updatedBy: { select: { fullName: true } },
        },
      },
      practicalTraining: {
        orderBy: { trainingDate: "asc" },
        include: {
          createdBy: { select: { fullName: true } },
          updatedBy: { select: { fullName: true } },
          vehicleClasses: {
            orderBy: { vehicleClass: { code: "asc" } },
            include: { vehicleClass: { select: { code: true, name: true } } },
          },
        },
      },
      payments: {
        orderBy: { paymentDate: "asc" },
        include: {
          createdBy: { select: { fullName: true } },
          updatedBy: { select: { fullName: true } },
        },
      },
    },
  });

  const serialised: ClientExportSnapshot[] = clients.map((client) => ({
    id: client.id,
    idNumber: client.idNumber,
    admissionNumber: client.admissionNumber,
    profilePhoto: client.profilePhoto,
    fullName: client.fullName,
    dateOfBirth: iso(client.dateOfBirth),
    address: client.address,
    mobileMain: client.mobileMain,
    mobileBackup: client.mobileBackup,
    mobileWhatsapp: client.mobileWhatsapp,
    registeredDate: iso(client.registeredDate),
    scheduleType: client.scheduleType,
    totalAgreedFee: client.totalAgreedFee.toString(),
    status: client.status,
    createdAt: iso(client.createdAt),
    updatedAt: iso(client.updatedAt),
    createdBy: actor(client.createdBy),
    updatedBy: actor(client.updatedBy),
    vehicleClasses: client.vehicleClasses.map(({ vehicleClass }) => vehicleClass),
    document: client.document
      ? {
          medicalReportNumber: client.document.medicalReportNumber,
          medicalIssueDate: optionalIso(client.document.medicalIssueDate),
          schoolCertificateNumber: client.document.schoolCertificateNumber,
          dmtBarcodeNumber: client.document.dmtBarcodeNumber,
          learnerPermitNumber: client.document.learnerPermitNumber,
          learnerPermitIssueDate: optionalIso(client.document.learnerPermitIssueDate),
        }
      : null,
    previousLicense: client.previousLicense
      ? {
          licenseNumber: client.previousLicense.licenseNumber,
          issueDate: optionalIso(client.previousLicense.issueDate),
          vehicleClasses: client.previousLicense.vehicleClasses.map(
            ({ vehicleClass }) => vehicleClass
          ),
        }
      : null,
    writtenExams: client.writtenExams.map((record) => ({
      examDate: iso(record.examDate),
      dmtBarcode: record.dmtBarcode,
      result: record.result,
      createdAt: iso(record.createdAt),
      updatedAt: iso(record.updatedAt),
      createdBy: actor(record.createdBy),
      updatedBy: actor(record.updatedBy),
    })),
    trials: client.trials.map((record) => ({
      trialDate: iso(record.trialDate),
      dmtBarcode: record.dmtBarcode,
      result: record.result,
      resultNotes: record.resultNotes,
      createdAt: iso(record.createdAt),
      updatedAt: iso(record.updatedAt),
      createdBy: actor(record.createdBy),
      updatedBy: actor(record.updatedBy),
    })),
    lectures: client.lectureAttendance.map((record) => ({
      attendanceDate: iso(record.attendanceDate),
      status: record.status,
      createdAt: iso(record.createdAt),
      updatedAt: iso(record.updatedAt),
      createdBy: actor(record.createdBy),
      updatedBy: actor(record.updatedBy),
    })),
    trainings: client.practicalTraining.map((record) => ({
      trainingDate: iso(record.trainingDate),
      status: record.status,
      notes: record.notes,
      vehicleClasses: record.vehicleClasses.map(({ vehicleClass }) => vehicleClass),
      createdAt: iso(record.createdAt),
      updatedAt: iso(record.updatedAt),
      createdBy: actor(record.createdBy),
      updatedBy: actor(record.updatedBy),
    })),
    payments: client.payments.map((record) => ({
      paymentDate: iso(record.paymentDate),
      billNumber: record.billNumber,
      amount: record.amount.toString(),
      paymentType: record.paymentType,
      description: record.description,
      createdAt: iso(record.createdAt),
      updatedAt: iso(record.updatedAt),
      createdBy: actor(record.createdBy),
      updatedBy: actor(record.updatedBy),
    })),
  }));

  return {
    version: 1,
    weekStart: weekStart.toISOString(),
    capturedAt: capturedAt.toISOString(),
    clients: serialised,
  };
}

