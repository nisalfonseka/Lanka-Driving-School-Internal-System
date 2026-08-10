import { ClipboardListIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ExamDialog } from "@/components/exams/exam-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { RecordFilters } from "@/components/shared/record-filters";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { searchExams } from "@/lib/queries/operations";
import {
  flattenSearchParams,
  readDate,
  readEnum,
  readPage,
  readText,
} from "@/lib/search-params";

export const metadata: Metadata = { title: "Written Exams" };

const RESULTS = ["PASS", "FAIL", "ABSENT", "PENDING"] as const;

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  // Employees get a read-only list; only owners may correct existing records.
  const canEdit = canEditRecords(user.role);

  const params = flattenSearchParams(await searchParams);

  const { rows, total, page, pageSize } = await searchExams({
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
        title="Written Exams"
        description="Record exam sittings, attendance and results. A client may have several attempts."
        actions={
          <ExamDialog clients={clients} defaultClientId={params.clientId} />
        }
      />

      <Card className="overflow-hidden p-0">
        <RecordFilters
          basePath="/exams"
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
            icon={ClipboardListIcon}
            title="No exam records found"
            description="Add a written exam to get started, or widen your search."
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
                  <TableHead>Attendance</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Entered By</TableHead>
                  {canEdit ? (
                    <TableHead className="text-right">Action</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell>{formatDate(exam.examDate)}</TableCell>

                    <TableCell className="font-medium">
                      <Link
                        href={`/clients/${exam.client.id}`}
                        className="hover:underline"
                      >
                        {exam.client.fullName}
                      </Link>
                    </TableCell>

                    <TableCell className="tabular">
                      {exam.client.admissionNumber}
                    </TableCell>

                    <TableCell className="tabular text-muted-foreground">
                      {exam.dmtBarcode ?? "—"}
                    </TableCell>

                    <TableCell>
                      <StatusBadge value={exam.attendance} />
                    </TableCell>

                    <TableCell>
                      <StatusBadge value={exam.result} />
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {exam.updatedBy?.fullName ?? exam.createdBy?.fullName ?? "—"}
                    </TableCell>

                    {/* Employees see a read-only list; only owners can correct. */}
                    {canEdit ? (
                      <TableCell className="text-right">
                        <ExamDialog
                          exam={{
                            id: exam.id,
                            clientId: exam.client.id,
                            clientLabel: `${exam.client.fullName} · ${exam.client.admissionNumber}`,
                            examDate: exam.examDate,
                            dmtBarcode: exam.dmtBarcode,
                            attendance: exam.attendance,
                            result: exam.result,
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
          basePath="/exams"
          params={params}
        />
      </Card>
    </>
  );
}
