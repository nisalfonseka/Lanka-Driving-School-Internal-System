import { BookOpenIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { LectureDialog } from "@/components/lectures/lecture-dialog";
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
import { searchLectures } from "@/lib/queries/operations";
import {
  flattenSearchParams,
  readDate,
  readEnum,
  readPage,
  readText,
} from "@/lib/search-params";

export const metadata: Metadata = { title: "Lectures" };

const STATUSES = ["PRESENT", "ABSENT"] as const;

export default async function LecturesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  // Employees get a read-only list; only owners may correct existing records.
  const canEdit = canEditRecords(user.role);

  const params = flattenSearchParams(await searchParams);

  const { rows, total, presentCount, page, pageSize } = await searchLectures({
    q: readText(params.q),
    clientId: readText(params.clientId, 40),
    from: readDate(params.from),
    to: readDate(params.to),
    page: readPage(params.page),
    extra: { status: readEnum(params.status, STATUSES) },
  });

  const clients = await getClientOptions();

  return (
    <>
      <PageHeader
        title="Lecture Attendance"
        description={
          total > 0
            ? `${presentCount} present of ${total} matching records.`
            : "Record and review lecture attendance."
        }
        actions={
          <LectureDialog clients={clients} defaultClientId={params.clientId} />
        }
      />

      <Card className="overflow-hidden p-0">
        <RecordFilters
          basePath="/lectures"
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
              key: "status",
              label: "Status",
              type: "select",
              options: [
                { value: "", label: "All statuses" },
                { value: "PRESENT", label: "Present" },
                { value: "ABSENT", label: "Absent" },
              ],
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={BookOpenIcon}
            title="No attendance records found"
            description="Record lecture attendance to get started, or widen your search."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Admission No.</TableHead>
                  <TableHead>NIC</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Entered By</TableHead>
                  {canEdit ? (
                    <TableHead className="text-right">Action</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((lecture) => (
                  <TableRow key={lecture.id}>
                    <TableCell>{formatDate(lecture.attendanceDate)}</TableCell>

                    <TableCell className="font-medium">
                      <Link
                        href={`/clients/${lecture.client.id}`}
                        className="hover:underline"
                      >
                        {lecture.client.fullName}
                      </Link>
                    </TableCell>

                    <TableCell className="tabular">
                      {lecture.client.admissionNumber}
                    </TableCell>

                    <TableCell className="tabular text-muted-foreground">
                      {lecture.client.idNumber}
                    </TableCell>

                    <TableCell>
                      <StatusBadge value={lecture.status} />
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {lecture.updatedBy?.fullName ??
                        lecture.createdBy?.fullName ??
                        "—"}
                    </TableCell>

                    {canEdit ? (
                      <TableCell className="text-right">
                        <LectureDialog
                          lecture={{
                            id: lecture.id,
                            clientId: lecture.client.id,
                            clientLabel: `${lecture.client.fullName} · ${lecture.client.admissionNumber}`,
                            attendanceDate: lecture.attendanceDate,
                            status: lecture.status,
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
          basePath="/lectures"
          params={params}
        />
      </Card>
    </>
  );
}
