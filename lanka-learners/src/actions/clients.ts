"use server";

import { revalidatePath } from "next/cache";

import { fail, ok, runAction, type ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAction, requireUserAction } from "@/lib/auth/session";
import { toUtcDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { uploadClientPhoto } from "@/lib/storage";
import { clientFormSchema } from "@/lib/validations/client";

/**
 * Client mutations.
 *
 * Employees may register new clients but may never modify an existing one —
 * that rule is enforced here, on the server, not by hiding the Edit button.
 */

type ClientPayload = Record<string, unknown>;

function parseClientForm(payload: ClientPayload) {
  const parsed = clientFormSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { success: false as const, fieldErrors };
  }
  return { success: true as const, data: parsed.data };
}

/** Rejects vehicle class ids that do not exist or are deactivated. */
async function assertVehicleClassesExist(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const count = await prisma.vehicleClass.count({
    where: { id: { in: ids }, status: "ACTIVE" },
  });
  return count === ids.length;
}

export async function createClientAction(
  payload: ClientPayload
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    // Both roles may register clients — but the caller must be signed in.
    const user = await requireUserAction();

    const parsed = parseClientForm(payload);
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", parsed.fieldErrors);
    }

    const data = parsed.data;

    const allIds = [
      ...data.vehicleClassIds,
      ...(data.hasPreviousLicense ? data.previousLicenseClassIds : []),
    ];
    if (!(await assertVehicleClassesExist(allIds))) {
      return fail("One or more selected vehicle classes are not available.");
    }

    const client = await prisma.client.create({
      data: {
        idNumber: data.idNumber,
        admissionNumber: data.admissionNumber,
        profilePhoto: data.profilePhoto ?? null,
        fullName: data.fullName,
        dateOfBirth: toUtcDateOnly(data.dateOfBirth),
        address: data.address,
        mobileMain: data.mobileMain,
        mobileBackup: data.mobileBackup ?? null,
        mobileWhatsapp: data.mobileWhatsapp ?? null,
        registeredDate: toUtcDateOnly(data.registeredDate),
        scheduleType: data.scheduleType,
        totalAgreedFee: data.totalAgreedFee,
        status: data.status,
        createdById: user.id,
        updatedById: user.id,

        vehicleClasses: {
          create: data.vehicleClassIds.map((vehicleClassId) => ({
            vehicleClassId,
          })),
        },

        document: {
          create: {
            medicalReportNumber: data.medicalReportNumber ?? null,
            medicalIssueDate: data.medicalIssueDate
              ? toUtcDateOnly(data.medicalIssueDate)
              : null,
            schoolCertificateNumber: data.schoolCertificateNumber ?? null,
            dmtBarcodeNumber: data.dmtBarcodeNumber ?? null,
            learnerPermitIssueDate: data.learnerPermitIssueDate
              ? toUtcDateOnly(data.learnerPermitIssueDate)
              : null,
          },
        },

        ...(data.hasPreviousLicense && data.previousLicenseNumber
          ? {
              previousLicense: {
                create: {
                  licenseNumber: data.previousLicenseNumber,
                  issueDate: data.previousLicenseIssueDate
                    ? toUtcDateOnly(data.previousLicenseIssueDate)
                    : null,
                  vehicleClasses: {
                    create: data.previousLicenseClassIds.map(
                      (vehicleClassId) => ({ vehicleClassId })
                    ),
                  },
                },
              },
            }
          : {}),
      },
      select: { id: true, fullName: true, admissionNumber: true },
    });

    await writeAuditLog({
      userId: user.id,
      action: "CREATE_CLIENT",
      entityType: "Client",
      entityId: client.id,
      description: `Registered client ${client.fullName} (${client.admissionNumber})`,
      newData: {
        fullName: data.fullName,
        idNumber: data.idNumber,
        admissionNumber: data.admissionNumber,
        scheduleType: data.scheduleType,
        totalAgreedFee: data.totalAgreedFee,
      },
    });

    revalidatePath("/clients");
    revalidatePath("/dashboard");

    return ok({ id: client.id });
  });
}

export async function updateClientAction(
  clientId: string,
  payload: ClientPayload
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    // Only owners may correct an existing client record.
    const user = await requireOwnerAction();

    const parsed = parseClientForm(payload);
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", parsed.fieldErrors);
    }

    const data = parsed.data;

    const existing = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        vehicleClasses: true,
        document: true,
        previousLicense: { include: { vehicleClasses: true } },
      },
    });

    if (!existing) return fail("That client no longer exists.");

    const allIds = [
      ...data.vehicleClassIds,
      ...(data.hasPreviousLicense ? data.previousLicenseClassIds : []),
    ];
    if (!(await assertVehicleClassesExist(allIds))) {
      return fail("One or more selected vehicle classes are not available.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id: clientId },
        data: {
          idNumber: data.idNumber,
          admissionNumber: data.admissionNumber,
          profilePhoto: data.profilePhoto ?? null,
          fullName: data.fullName,
          dateOfBirth: toUtcDateOnly(data.dateOfBirth),
          address: data.address,
          mobileMain: data.mobileMain,
          mobileBackup: data.mobileBackup ?? null,
          mobileWhatsapp: data.mobileWhatsapp ?? null,
          registeredDate: toUtcDateOnly(data.registeredDate),
          scheduleType: data.scheduleType,
          totalAgreedFee: data.totalAgreedFee,
          status: data.status,
          updatedById: user.id,
        },
      });

      // Replace the vehicle-class set.
      await tx.clientVehicleClass.deleteMany({ where: { clientId } });
      await tx.clientVehicleClass.createMany({
        data: data.vehicleClassIds.map((vehicleClassId) => ({
          clientId,
          vehicleClassId,
        })),
      });

      await tx.clientDocument.upsert({
        where: { clientId },
        create: {
          clientId,
          medicalReportNumber: data.medicalReportNumber ?? null,
          medicalIssueDate: data.medicalIssueDate
            ? toUtcDateOnly(data.medicalIssueDate)
            : null,
          schoolCertificateNumber: data.schoolCertificateNumber ?? null,
          dmtBarcodeNumber: data.dmtBarcodeNumber ?? null,
          learnerPermitIssueDate: data.learnerPermitIssueDate
            ? toUtcDateOnly(data.learnerPermitIssueDate)
            : null,
        },
        update: {
          medicalReportNumber: data.medicalReportNumber ?? null,
          medicalIssueDate: data.medicalIssueDate
            ? toUtcDateOnly(data.medicalIssueDate)
            : null,
          schoolCertificateNumber: data.schoolCertificateNumber ?? null,
          dmtBarcodeNumber: data.dmtBarcodeNumber ?? null,
          learnerPermitIssueDate: data.learnerPermitIssueDate
            ? toUtcDateOnly(data.learnerPermitIssueDate)
            : null,
        },
      });

      if (data.hasPreviousLicense && data.previousLicenseNumber) {
        const licence = await tx.previousLicense.upsert({
          where: { clientId },
          create: {
            clientId,
            licenseNumber: data.previousLicenseNumber,
            issueDate: data.previousLicenseIssueDate
              ? toUtcDateOnly(data.previousLicenseIssueDate)
              : null,
          },
          update: {
            licenseNumber: data.previousLicenseNumber,
            issueDate: data.previousLicenseIssueDate
              ? toUtcDateOnly(data.previousLicenseIssueDate)
              : null,
          },
        });

        await tx.previousLicenseClass.deleteMany({
          where: { previousLicenseId: licence.id },
        });
        await tx.previousLicenseClass.createMany({
          data: data.previousLicenseClassIds.map((vehicleClassId) => ({
            previousLicenseId: licence.id,
            vehicleClassId,
          })),
        });
      } else if (existing.previousLicense) {
        // The licence was unticked — remove it and its classes.
        await tx.previousLicense.delete({ where: { clientId } });
      }
    });

    await writeAuditLog({
      userId: user.id,
      action: "UPDATE_CLIENT",
      entityType: "Client",
      entityId: clientId,
      description: `Updated client ${data.fullName} (${data.admissionNumber})`,
      oldData: {
        fullName: existing.fullName,
        idNumber: existing.idNumber,
        admissionNumber: existing.admissionNumber,
        address: existing.address,
        mobileMain: existing.mobileMain,
        scheduleType: existing.scheduleType,
        totalAgreedFee: existing.totalAgreedFee,
        status: existing.status,
      },
      newData: {
        fullName: data.fullName,
        idNumber: data.idNumber,
        admissionNumber: data.admissionNumber,
        address: data.address,
        mobileMain: data.mobileMain,
        scheduleType: data.scheduleType,
        totalAgreedFee: data.totalAgreedFee,
        status: data.status,
      },
    });

    revalidatePath("/clients");
    revalidatePath(`/clients/${clientId}`);

    return ok({ id: clientId });
  });
}

/**
 * Uploads a profile photo and returns its URL. Kept separate from the form
 * submit so a storage outage cannot block a client registration.
 */
export async function uploadClientPhotoAction(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  return runAction(async () => {
    await requireUserAction();

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return fail("No image was provided.");
    }

    const result = await uploadClientPhoto(file);
    if (!result.ok) return fail(result.error);

    return ok({ url: result.url });
  });
}
