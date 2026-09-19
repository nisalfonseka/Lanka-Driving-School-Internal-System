import { FileClockIcon } from "lucide-react";
import type { Metadata } from "next";

import { AuditDetailDialog } from "@/components/activity/audit-detail";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { RecordFilters } from "@/components/shared/record-filters";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireOwnerPage } from "@/lib/auth/session";
import { endOfUtcDay, toUtcDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { describeAction, describeEntity } from "@/lib/audit-format";
import { formatDate, formatTime } from "@/lib/format";
import {
  flattenSearchParams,
  readDate,
  readEnum,
  readPage,
  readText,
} from "@/lib/search-params";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Activity Logs" };

const PAGE_SIZE = 30;

const ACTIONS = [
  "LOGIN",
  "LOGOUT",
  "CREATE_CLIENT",
  "UPDATE_CLIENT",
  "UPDATE_CLIENT_STATUS",
  "UPDATE_CLIENT_DOCUMENTS",
  "CREATE_EXAM",
  "UPDATE_EXAM",
  "UPDATE_EXAM_RESULT",
  "CREATE_TRIAL",
  "UPDATE_TRIAL",
  "UPDATE_TRIAL_RESULT",
  "CREATE_LECTURE_ATTENDANCE",
  "UPDATE_LECTURE_ATTENDANCE",
  "UPDATE_LECTURE_RESULT",
  "CREATE_PRACTICAL_TRAINING",
  "UPDATE_PRACTICAL_TRAINING",
  "UPDATE_TRAINING_RESULT",
  "CREATE_PAYMENT",
  "UPDATE_PAYMENT",
  "CREATE_EXPENSE",
  "UPDATE_EXPENSE",
  "CREATE_EMPLOYEE",
  "UPDATE_EMPLOYEE",
  "DEACTIVATE_EMPLOYEE",
  "ACTIVATE_EMPLOYEE",
  "RESET_EMPLOYEE_PASSWORD",
  "CREATE_VEHICLE_CLASS",
  "UPDATE_VEHICLE_CLASS",
  "UPDATE_SETTINGS",
  "CREATE_TRAINING_BOOKING",
  "UPDATE_TRAINING_BOOKING",
  "UPDATE_BOOKING_ATTENDANCE",
  "DELETE_TRAINING_BOOKING",
  "EXPORT_CLIENTS_PDF",
  "EXPORT_CLIENTS_CSV",
] as const;

const ENTITY_TYPES = [
  "Client",
  "WrittenExam",
  "TrialExam",
  "LectureAttendance",
  "PracticalTraining",
  "ClientPayment",
  "CompanyExpense",
  "User",
  "VehicleClass",
  "SystemSetting",
  "TrainingBooking",
  "ClientExport",
] as const;

export default async function ActivityLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Audit logs are owner-only, and are append-only: there is no edit or delete
  // path anywhere in the application.
  await requireOwnerPage();

  const params = flattenSearchParams(await searchParams);
  const page = readPage(params.page);

  const users = await prisma.user.findMany({
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });

  const userId = users.some((user) => user.id === params.userId)
    ? params.userId
    : undefined;
  const action = readEnum(params.action, ACTIONS);
  const entityType = readEnum(params.entityType, ENTITY_TYPES);
  const from = readDate(params.from);
  const to = readDate(params.to);

  const where: Prisma.AuditLogWhereInput = {
    ...(userId ? { userId } : {}),
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: toUtcDateOnly(from) } : {}),
            ...(to ? { lte: endOfUtcDay(to) } : {}),
          },
        }
      : {}),
    ...(readText(params.q)
      ? { description: { contains: readText(params.q)!, mode: "insensitive" } }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { fullName: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        title="Activity Logs"
        description="Every important action taken in the system, by whom and when."
      />

      <Card className="overflow-hidden p-0">
        <RecordFilters
          basePath="/activity-logs"
          filters={[
            {
              key: "userId",
              label: "Employee",
              type: "select",
              options: [
                { value: "", label: "All users" },
                ...users.map((user) => ({
                  value: user.id,
                  label: user.fullName,
                })),
              ],
            },
            {
              key: "action",
              label: "Action",
              type: "select",
              options: [
                { value: "", label: "All actions" },
                ...ACTIONS.map((value) => ({
                  value,
                  label: describeAction(value),
                })),
              ],
            },
            {
              key: "entityType",
              label: "Record",
              type: "select",
              options: [
                { value: "", label: "All records" },
                ...ENTITY_TYPES.map((value) => ({
                  value,
                  label: describeEntity(value),
                })),
              ],
            },
            { key: "from", label: "Date From", type: "date" },
            { key: "to", label: "Date To", type: "date" },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={FileClockIcon}
            title="No activity found"
            description="Try widening the filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>What happened</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(entry.createdAt)}
                    </TableCell>

                    <TableCell className="tabular whitespace-nowrap text-muted-foreground">
                      {formatTime(entry.createdAt)}
                    </TableCell>

                    <TableCell className="font-medium">
                      {entry.user?.fullName ?? "System"}
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline">
                        {describeAction(entry.action)}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {describeEntity(entry.entityType)}
                    </TableCell>

                    <TableCell className="max-w-80 truncate">
                      {entry.description}
                    </TableCell>

                    <TableCell className="text-right">
                      <AuditDetailDialog
                        entry={{
                          id: entry.id,
                          action: entry.action,
                          entityType: entry.entityType,
                          description: entry.description,
                          createdAt: entry.createdAt,
                          userName: entry.user?.fullName ?? "System",
                          ipAddress: entry.ipAddress,
                          userAgent: entry.userAgent,
                          oldData: entry.oldData,
                          newData: entry.newData,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          basePath="/activity-logs"
          params={params}
        />
      </Card>
    </>
  );
}
