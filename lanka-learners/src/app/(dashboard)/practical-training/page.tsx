import { CarIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { TrainingDialog } from "@/components/practical-training/training-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { RecordFilters } from "@/components/shared/record-filters";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  readPage,
  readText,
} from "@/lib/search-params";

export const metadata: Metadata = { title: "Practical Training" };

export default async function PracticalTrainingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  // Employees get a read-only list; only owners may correct existing records.
  const canEdit = canEditRecords(user.role);

  const params = flattenSearchParams(await searchParams);
  const vehicleClasses = await getActiveVehicleClasses();

  // Only accept a vehicle class id that actually exists.
  const vehicleClassId = vehicleClasses.some(
    (option) => option.id === params.vehicleClassId
  )
    ? params.vehicleClassId
    : undefined;

  const { rows, total, page, pageSize, summary } = await searchTrainings({
    q: readText(params.q),
    clientId: readText(params.clientId, 40),
    from: readDate(params.from),
    to: readDate(params.to),
    page: readPage(params.page),
    extra: { vehicleClassId },
  });

  const clients = await getClientOptions();

  return (
    <>
      <PageHeader
        title="Practical Training"
        description="Record training days. One day may cover several vehicle classes."
        actions={
          <TrainingDialog
            clients={clients}
            vehicleClasses={vehicleClasses}
            defaultClientId={params.clientId}
          />
        }
      />

      {/* Totals reflect the whole filtered set, not just this page. */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Total Training Days
            </p>
            <p className="tabular mt-0.5 text-2xl font-semibold">
              {summary.totalDays}
            </p>
          </div>

          {summary.byClass.length > 0 ? (
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Days by Vehicle Class
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {summary.byClass.map((row) => (
                  <Badge key={row.code} variant="secondary">
                    {row.code}: {row.days}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

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
                  <TableHead>Vehicle Classes</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Entered By</TableHead>
                  {canEdit ? (
                    <TableHead className="text-right">Action</TableHead>
                  ) : null}
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
                      <div className="flex flex-wrap gap-1">
                        {training.vehicleClasses.map((link) => (
                          <Badge key={link.id} variant="outline">
                            {link.vehicleClass.code}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell className="max-w-40 truncate text-muted-foreground">
                      {training.notes ?? "—"}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {training.updatedBy?.fullName ??
                        training.createdBy?.fullName ??
                        "—"}
                    </TableCell>

                    {canEdit ? (
                      <TableCell className="text-right">
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
                      </TableCell>
                    ) : null}
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
