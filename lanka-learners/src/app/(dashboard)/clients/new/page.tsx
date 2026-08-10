import type { Metadata } from "next";

import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth/session";
import { getActiveVehicleClasses } from "@/lib/queries/clients";

export const metadata: Metadata = { title: "Register New Client" };

export default async function NewClientPage() {
  // Both owners and employees may register clients.
  await requireUser();
  const vehicleClasses = await getActiveVehicleClasses();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Register New Client"
        description="Record a new learner's personal details, registration, documents and licence history."
      />

      <ClientForm mode="create" vehicleClasses={vehicleClasses} />
    </div>
  );
}
