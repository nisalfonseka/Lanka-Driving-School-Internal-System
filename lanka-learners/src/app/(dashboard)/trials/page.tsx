import { CarIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { RecordFilters } from "@/components/shared/record-filters";
import { StatusBadge } from "@/components/shared/status-badge";
import { TrialDialog } from "@/components/trials/trial-dialog";
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
import { getClientOptions } from "@/lib/queries/clients";
import { searchTrials } from "@/lib/queries/operations";
import {
  flattenSearchParams,
  readDate,
  readEnum,
  readPage,
  readText,
} from "@/lib/search-params";

export const metadata: Metadata = { title: "Practical Trials" };

const RESULTS = ["PASS", "FAIL", "ABSENT", "PENDING"] as const;

export default async function TrialsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  // Employees get a read-only list; only owners may correct existing records.
  const canEdit = canEditRecords(user.role);

  const params = flattenSearchParams(await searchParams);

  const { rows, total, page, pageSize } = await searchTrials({
    q: readText(params.q),
    clientId: readText(params.clientId, 40),
    from: readDate(params.from),
    to: readDate(params.to),
    page: readPage(params.page),
    extra: { result: readEnum(params.result, RESULTS) },
  });

  const clients = await getClientOptions();

  return (
    <>
      <PageHeader
        title="Practical Trials"
        description="Record practical trial attempts, results and examiner notes."
        actions={
          <TrialDialog clients={clients} defaultClientId={params.clientId} />
        }
      />

      <Card className="overflow-hidden p-0">
        <RecordFilters
          basePath="/trials"
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
              key: "result",
              label: "Result",
              type: "select",
              options: [
                { value: "", label: "All results" },
                { value: "PENDING", label: "Pending" },
                { value: "PASS", label: "Pass" },
                { value: "FAIL", label: "Fail" },
                { value: "ABSENT", label: "Absent" },
              ],
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={CarIcon}
            title="No trial records found"
            description="Add a practical trial to get started, or widen your search."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Admission No.</TableHead>
                  <TableHead>DMT Barcode</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Entered By</TableHead>
                  {canEdit ? (
                    <TableHead className="text-right">Action</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((trial) => (
                  <TableRow key={trial.id}>
                    <TableCell>{formatDate(trial.trialDate)}</TableCell>

                    <TableCell className="font-medium">
                      <Link
                        href={`/clients/${trial.client.id}`}
                        className="hover:underline"
                      >
                        {trial.client.fullName}
                      </Link>
                    </TableCell>

                    <TableCell className="tabular">
                      {trial.client.admissionNumber}
                    </TableCell>

                    <TableCell className="tabular text-muted-foreground">
                      {trial.dmtBarcode ?? "—"}
                    </TableCell>

                    <TableCell>
                      <StatusBadge value={trial.result} />
                    </TableCell>

                    <TableCell className="max-w-40 truncate text-muted-foreground">
                      {trial.resultNotes ?? "—"}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {trial.updatedBy?.fullName ??
                        trial.createdBy?.fullName ??
                        "—"}
                    </TableCell>

                    {canEdit ? (
                      <TableCell className="text-right">
                        <TrialDialog
                          trial={{
                            id: trial.id,
                            clientId: trial.client.id,
                            clientLabel: `${trial.client.fullName} · ${trial.client.admissionNumber}`,
                            trialDate: trial.trialDate,
                            dmtBarcode: trial.dmtBarcode,
                            result: trial.result,
                            resultNotes: trial.resultNotes,
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
          basePath="/trials"
          params={params}
        />
      </Card>
    </>
  );
}
