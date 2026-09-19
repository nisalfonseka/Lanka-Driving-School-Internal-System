import { CarIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ClassStatusBadges } from "@/components/practical-training/class-status-badges";
import { ClassStatusDialog } from "@/components/practical-training/class-status-dialog";
import { TrainingDialog } from "@/components/practical-training/training-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { RecordFilters } from "@/components/shared/record-filters";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth/session";
import { canEditRecords } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { getActiveVehicleClasses, getClientOptions } from "@/lib/queries/clients";
import { searchTrainings } from "@/lib/queries/operations";
import {
  flattenSearchParams,
  readDate,
  readEnum,
  readPage,
  readText,
} from "@/lib/search-params";

export const metadata: Metadata = { title: "Practical Training" };

const STATUSES = ["PENDING", "COMPLETED", "ABSENT", "CANCELLED"] as const;

export default async function PracticalTrainingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  // Everyone can add results; only owners may correct a whole record.
  const canEdit = canEditRecords(user.role);

  const params = flattenSearchParams(await searchParams);
  // Started now so it runs alongside the search instead of after it.
  const clientsPromise = getClientOptions();
  const vehicleClasses = await getActiveVehicleClasses();

  // Only accept a vehicle class id that actually exists.
  const vehicleClassId = vehicleClasses.some(
    (option) => option.id === params.vehicleClassId
  )
    ? params.vehicleClassId
    : undefined;

  const { rows, total, page, pageSize } = await searchTrainings({
    q: readText(params.q),
    clientId: readText(params.clientId, 40),
    from: readDate(params.from),
    to: readDate(params.to),
    page: readPage(params.page),
    extra: { vehicleClassId, status: readEnum(params.status, STATUSES) },
  });

  const clients = await clientsPromise;

  return (
    <>
      <PageHeader
        title="Practical Training"
        description="Record training days. One day may cover several vehicle classes, each with its own status."
        actions={
          <TrainingDialog
            clients={clients}
            vehicleClasses={vehicleClasses}
            defaultClientId={params.clientId}
          />
        }
      />

      <Card className="overflow-hidden p-0">
        <RecordFilters
          basePath="/practical-training"
          filters={[
            {
              key: "q",
              label: "Client",
              type: "text",
              placeholder: "Name, NIC or admission no…",
            },
            { key: "from", label: "From", type: "date" },
            { key: "to", label: "To", type: "date" },
            {
              key: "vehicleClassId",
              label: "Vehicle Class",
              type: "select",
              options: [
                { value: "", label: "All classes" },
                ...vehicleClasses.map((option) => ({
                  value: option.id,
                  label: option.code,
                })),
              ],
            },
            {
              key: "status",
              label: "Class Status",
              type: "select",
              options: [
                { value: "", label: "All statuses" },
                { value: "PENDING", label: "Pending" },
                { value: "COMPLETED", label: "Completed" },
                { value: "ABSENT", label: "Absent" },
                { value: "CANCELLED", label: "Cancelled" },
              ],
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={CarIcon}
            title="No training records found"
            description="Add a training day to get started, or widen your search."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Admission No.</TableHead>
                  <TableHead>Class Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Entered By</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((training) => (
                  <TableRow key={training.id}>
                    <TableCell>{formatDate(training.trainingDate)}</TableCell>

                    <TableCell className="font-medium">
                      <Link
                        href={`/clients/${training.client.id}`}
                        className="hover:underline"
                      >
                        {training.client.fullName}
                      </Link>
                    </TableCell>

                    <TableCell className="tabular">
                      {training.client.admissionNumber}
                    </TableCell>

                    <TableCell>
                      <ClassStatusBadges links={training.vehicleClasses} />
                    </TableCell>

                    <TableCell className="max-w-40 truncate text-muted-foreground">
                      {training.notes ?? "—"}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {training.updatedBy?.fullName ??
                        training.createdBy?.fullName ??
                        "—"}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <ClassStatusDialog
                          id={training.id}
                          clientName={training.client.fullName}
                          date={training.trainingDate}
                          notes={training.notes}
                          classes={training.vehicleClasses.map((link) => ({
                            vehicleClassId: link.vehicleClassId,
                            code: link.vehicleClass.code,
                            status: link.status,
                          }))}
                        />
                        {/* Only owners may correct the full record. */}
                        {canEdit ? (
                          <TrainingDialog
                            vehicleClasses={vehicleClasses}
                            training={{
                              id: training.id,
                              clientId: training.client.id,
                              clientLabel: `${training.client.fullName} · ${training.client.admissionNumber}`,
                              trainingDate: training.trainingDate,
                              vehicleClassIds: training.vehicleClasses.map(
                                (link) => link.vehicleClassId
                              ),
                              notes: training.notes,
                            }}
                          />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath="/practical-training"
          params={params}
        />
      </Card>
    </>
  );
}
