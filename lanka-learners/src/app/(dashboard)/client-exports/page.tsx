import {
  ArchiveIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  Clock3Icon,
  DatabaseIcon,
} from "lucide-react";
import type { Metadata } from "next";

import { ExportDownloadButton } from "@/components/client-exports/export-download-button";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
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
import { requireOwnerPage } from "@/lib/auth/session";
import {
  currentExportWeekStart,
  EXPORT_WEEKS_PER_PAGE,
  exportWeekKey,
  exportWeekLabel,
  exportWeekPage,
  exportWeekStart,
  weeksBetweenInclusive,
} from "@/lib/client-exports/weeks";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Client Exports" };

function readPage(value: string | string[] | undefined): number {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function ClientExportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOwnerPage();

  const params = await searchParams;
  const requestedPage = readPage(params.page);
  const currentWeek = currentExportWeekStart();
  const [oldestClient, oldestExport] = await Promise.all([
    prisma.client.aggregate({ _min: { registeredDate: true } }),
    prisma.weeklyClientExport.aggregate({ _min: { weekStart: true } }),
  ]);
  const oldestCandidate = oldestClient._min.registeredDate
    ? exportWeekStart(oldestClient._min.registeredDate)
    : currentWeek;
  const oldestWeek = oldestExport._min.weekStart && oldestExport._min.weekStart < oldestCandidate
    ? oldestExport._min.weekStart
    : oldestCandidate;
  const totalWeeks = weeksBetweenInclusive(oldestWeek, currentWeek);
  const totalPages = Math.max(1, Math.ceil(totalWeeks / EXPORT_WEEKS_PER_PAGE));
  const page = Math.min(requestedPage, totalPages);
  const visibleWeeks = exportWeekPage(page).filter((week) => week >= oldestWeek);

  const stored = visibleWeeks.length === 0
    ? []
    : await prisma.weeklyClientExport.findMany({
        where: { weekStart: { in: visibleWeeks } },
        include: { capturedBy: { select: { fullName: true } } },
      });
  const storedByWeek = new Map(stored.map((row) => [exportWeekKey(row.weekStart), row]));
  const currentStored = storedByWeek.get(exportWeekKey(currentWeek));

  return (
    <>
      <PageHeader
        title="Weekly Client Exports"
        description="Owner-only, week-by-week snapshots of every client profile."
      />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Card size="sm">
          <CardContent className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarDaysIcon className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current export week</p>
              <p className="mt-1 font-medium">{exportWeekLabel(currentWeek)}</p>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <DatabaseIcon className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current week snapshot</p>
              <p className="mt-1 font-medium">
                {currentStored ? `${currentStored.clientCount} clients captured` : "Not captured yet"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ArchiveIcon className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saved weekly snapshots</p>
              <p className="mt-1 font-medium">{stored.length} shown on this page</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-5 border-l-4 border-l-primary py-0">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">How weekly snapshots work</p>
          <p className="mt-1 leading-relaxed">
            The first PDF or CSV download during a week saves an immutable snapshot of all client profiles.
            Both formats then use that same data for the week. A new week captures every client again, including
            profile fields completed since the previous snapshot. The PDF keeps one complete profile per page;
            the CSV also carries full exam, trial, attendance, training, and payment history. Missed past weeks are
            not reconstructed.
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Week</TableHead>
              <TableHead>Snapshot</TableHead>
              <TableHead>PDF</TableHead>
              <TableHead>CSV</TableHead>
              <TableHead className="text-right">Downloads</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleWeeks.map((week) => {
              const key = exportWeekKey(week);
              const record = storedByWeek.get(key);
              const isCurrent = key === exportWeekKey(currentWeek);
              const canDownload = isCurrent || Boolean(record);

              return (
                <TableRow key={key}>
                  <TableCell>
                    <div className="font-medium">{exportWeekLabel(week)}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {isCurrent ? "Current week" : `Week starting ${formatDate(week)}`}
                    </div>
                  </TableCell>

                  <TableCell>
                    {record ? (
                      <div>
                        <Badge variant="outline" className="text-primary">
                          <CheckCircle2Icon className="size-3" /> Captured
                        </Badge>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {record.clientCount} clients · {formatDateTime(record.capturedAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          by {record.capturedBy?.fullName ?? "Owner"}
                        </p>
                      </div>
                    ) : isCurrent ? (
                      <Badge variant="outline">
                        <Clock3Icon className="size-3" /> Ready to capture
                      </Badge>
                    ) : (
                      <div>
                        <Badge variant="outline">Not captured</Badge>
                        <p className="mt-1 text-xs text-muted-foreground">Historical data unavailable</p>
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1.5">
                      <ExportDownloadButton
                        format="pdf"
                        week={key}
                        captured={Boolean(record)}
                        disabled={!canDownload}
                      />
                      <p className="text-xs text-muted-foreground">
                        {record?.pdfLastDownloadedAt
                          ? `Last: ${formatDateTime(record.pdfLastDownloadedAt)}`
                          : "Not downloaded"}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1.5">
                      <ExportDownloadButton
                        format="csv"
                        week={key}
                        captured={Boolean(record)}
                        disabled={!canDownload}
                      />
                      <p className="text-xs text-muted-foreground">
                        {record?.csvLastDownloadedAt
                          ? `Last: ${formatDateTime(record.csvLastDownloadedAt)}`
                          : "Not downloaded"}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell className="text-right tabular">
                    <p>PDF {record?.pdfDownloadCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">CSV {record?.csvDownloadCount ?? 0}</p>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Pagination
          page={page}
          pageSize={EXPORT_WEEKS_PER_PAGE}
          total={totalWeeks}
          basePath="/client-exports"
          params={{}}
        />
      </Card>
    </>
  );
}
