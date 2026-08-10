import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireOwnerPage } from "@/lib/auth/session";
import { toDateInputValue, toNumber } from "@/lib/format";
import { getActiveVehicleClasses, getClientProfile } from "@/lib/queries/clients";

export const metadata: Metadata = { title: "Edit Client" };

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Owner-only. An employee who navigates here directly is sent to /forbidden,
  // and the update action would reject them regardless.
  await requireOwnerPage();

  const { id } = await params;
  const profile = await getClientProfile(id);
  if (!profile) notFound();

  const { client } = profile;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Edit Client"
        description={`${client.fullName} · ${client.admissionNumber}`}
      />

      <ClientForm
        mode="edit"
        clientId={client.id}
        vehicleClasses={await getActiveVehicleClasses()}
        defaultValues={{
          profilePhoto: client.profilePhoto ?? "",
          fullName: client.fullName,
          idNumber: client.idNumber,
          dateOfBirth: toDateInputValue(client.dateOfBirth),
          address: client.address,
          mobileMain: client.mobileMain,
          mobileBackup: client.mobileBackup ?? "",
          mobileWhatsapp: client.mobileWhatsapp ?? "",
          admissionNumber: client.admissionNumber,
          registeredDate: toDateInputValue(client.registeredDate),
          scheduleType: client.scheduleType,
          vehicleClassIds: client.vehicleClasses.map(
            (link) => link.vehicleClassId
          ),
          totalAgreedFee: toNumber(client.totalAgreedFee),
          status: client.status,
          medicalReportNumber: client.document?.medicalReportNumber ?? "",
          medicalIssueDate: toDateInputValue(client.document?.medicalIssueDate),
          schoolCertificateNumber:
            client.document?.schoolCertificateNumber ?? "",
          dmtBarcodeNumber: client.document?.dmtBarcodeNumber ?? "",
          learnerPermitIssueDate: toDateInputValue(
            client.document?.learnerPermitIssueDate
          ),
          hasPreviousLicense: Boolean(client.previousLicense),
          previousLicenseNumber: client.previousLicense?.licenseNumber ?? "",
          previousLicenseIssueDate: toDateInputValue(
            client.previousLicense?.issueDate
          ),
          previousLicenseClassIds:
            client.previousLicense?.vehicleClasses.map(
              (link) => link.vehicleClassId
            ) ?? [],
        }}
      />
    </div>
  );
}
