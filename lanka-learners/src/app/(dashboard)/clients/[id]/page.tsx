import { PencilIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DetailList } from "@/components/shared/detail-list";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/auth/session";
import { canEditRecords } from "@/lib/permissions";
import {
  calculateAge,
  formatCurrency,
  formatDate,
  formatDateTime,
  humanise,
  initials,
} from "@/lib/format";
import { getClientRecords } from "@/lib/queries/client-detail";
import { getClientProfile } from "@/lib/queries/clients";

export const metadata: Metadata = { title: "Client Profile" };

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const profile = await getClientProfile(id);
  if (!profile) notFound();

  const { client, finance } = profile;
  const records = await getClientRecords(id);
  // Employees get a read-only list; only owners may correct existing records.
  const canEdit = canEditRecords(user.role);

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------- Header ------ */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center md:p-6">
          <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-lg font-medium text-muted-foreground">
            {client.profilePhoto ? (
              <Image
                src={client.profilePhoto}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
            ) : (
              initials(client.fullName)
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight">
                {client.fullName}
              </h1>
              <StatusBadge value={client.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="tabular">{client.admissionNumber}</span>
              {" · "}
              <span className="tabular">{client.idNumber}</span>
            </p>
          </div>

          {/* Employees see a read-only profile — only owners may correct it. */}
          {canEdit ? (
            <Button
              variant="outline"
              render={<Link href={`/clients/${client.id}/edit`} />}
            >
              <PencilIcon className="size-4" />
              Edit Client
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {/* --------------------------------------------------- Tabs ------ */}
      <Tabs defaultValue="overview">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="vehicle-classes">Vehicle Classes</TabsTrigger>
            <TabsTrigger value="exams">Written Exams</TabsTrigger>
            <TabsTrigger value="trials">Trials</TabsTrigger>
            <TabsTrigger value="lectures">Lectures</TabsTrigger>
            <TabsTrigger value="training">Practical Training</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
        </div>

        {/* ------------------------------------------- Overview ------- */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardContent className="space-y-6 p-4 md:p-6">
                <div>
                  <h2 className="mb-3 text-sm font-semibold">
                    Personal Information
                  </h2>
                  <DetailList
                    items={[
                      { label: "Full Name", value: client.fullName },
                      { label: "NIC / ID", value: client.idNumber },
                      {
                        label: "Date of Birth",
                        value: formatDate(client.dateOfBirth),
                      },
                      {
                        label: "Age",
                        value: `${calculateAge(client.dateOfBirth) ?? "—"} years`,
                      },
                      { label: "Address", value: client.address },
                      { label: "Main Mobile", value: client.mobileMain },
                      {
                        label: "Backup Mobile",
                        value: client.mobileBackup ?? "—",
                      },
                      {
                        label: "WhatsApp",
                        value: client.mobileWhatsapp ?? "—",
                      },
                    ]}
                  />
                </div>

                <div>
                  <h2 className="mb-3 text-sm font-semibold">
                    Registration Information
                  </h2>
                  <DetailList
                    items={[
                      {
                        label: "Admission Number",
                        value: client.admissionNumber,
                      },
                      {
                        label: "Registered Date",
                        value: formatDate(client.registeredDate),
                      },
                      {
                        label: "Training Type",
                        value: humanise(client.scheduleType),
                      },
                      {
                        label: "Vehicle Classes",
                        value: (
                          <span className="flex flex-wrap gap-1">
                            {client.vehicleClasses.map((link) => (
                              <Badge key={link.id} variant="outline">
                                {link.vehicleClass.code}
                              </Badge>
                            ))}
                          </span>
                        ),
                      },
                      {
                        label: "Registered By",
                        value: client.createdBy?.fullName ?? "—",
                      },
                      {
                        label: "Last Updated By",
                        value: client.updatedBy?.fullName ?? "—",
                      },
                    ]}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="h-fit">
              <CardContent className="p-4 md:p-6">
                <h2 className="mb-3 text-sm font-semibold">Fee Summary</h2>

                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Total Agreed Fee</dt>
                    <dd className="tabular font-medium">
                      {formatCurrency(finance.agreedFee)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Total Paid</dt>
                    <dd className="tabular font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(finance.totalPaid)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t pt-3">
                    <dt className="font-medium">Remaining Balance</dt>
                    <dd
                      className={
                        finance.remaining > 0
                          ? "tabular font-semibold text-amber-600 dark:text-amber-400"
                          : "tabular font-semibold text-emerald-600 dark:text-emerald-400"
                      }
                    >
                      {formatCurrency(finance.remaining)}
                    </dd>
                  </div>
                </dl>

                <Button
                  size="sm"
                  className="mt-4 w-full"
                  render={<Link href={`/payments?clientId=${client.id}`} />}
                >
                  <PlusIcon className="size-4" />
                  Add Payment
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ------------------------------------------ Documents ------- */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="p-4 md:p-6">
              <h2 className="mb-3 text-sm font-semibold">Documents</h2>
              <DetailList
                items={[
                  {
                    label: "Medical Report Number",
                    value: client.document?.medicalReportNumber ?? "—",
                  },
                  {
                    label: "Medical Issue Date",
                    value: formatDate(client.document?.medicalIssueDate),
                  },
                  {
                    label: "School Certificate Number",
                    value: client.document?.schoolCertificateNumber ?? "—",
                  },
                  {
                    label: "DMT Barcode Number",
                    value: client.document?.dmtBarcodeNumber ?? "—",
                  },
                  {
                    label: "Learner Permit Issue Date",
                    value: formatDate(client.document?.learnerPermitIssueDate),
                  },
                ]}
              />

              <h2 className="mt-6 mb-3 text-sm font-semibold">
                Previous License
              </h2>
              {client.previousLicense ? (
                <DetailList
                  items={[
                    {
                      label: "License Number",
                      value: client.previousLicense.licenseNumber,
                    },
                    {
                      label: "Issue Date",
                      value: formatDate(client.previousLicense.issueDate),
                    },
                    {
                      label: "Vehicle Classes",
                      value: (
                        <span className="flex flex-wrap gap-1">
                          {client.previousLicense.vehicleClasses.map((link) => (
                            <Badge key={link.id} variant="outline">
                              {link.vehicleClass.code}
                            </Badge>
                          ))}
                        </span>
                      ),
                    },
                  ]}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No previous licence recorded.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------- Vehicle classes ------ */}
        <TabsContent value="vehicle-classes" className="mt-4">
          <Card>
            <CardContent className="p-4 md:p-6">
              {client.vehicleClasses.length === 0 ? (
                <EmptyState title="No vehicle classes assigned" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {client.vehicleClasses.map((link) => (
                    <div key={link.id} className="rounded-lg border p-3">
                      <p className="font-medium">{link.vehicleClass.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {link.vehicleClass.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------- Exams ------- */}
        <TabsContent value="exams" className="mt-4">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-sm font-semibold">Written Exams</h2>
              <Button
                size="xs"
                render={<Link href={`/exams?clientId=${client.id}`} />}
              >
                <PlusIcon className="size-3" />
                Add Exam
              </Button>
            </div>

            {records.exams.length === 0 ? (
              <EmptyState
                title="No written exams recorded"
                description="Exam attempts added for this client will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>DMT Barcode</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Entered By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.exams.map((exam) => (
                      <TableRow key={exam.id}>
                        <TableCell>{formatDate(exam.examDate)}</TableCell>
                        <TableCell className="tabular">
                          {exam.dmtBarcode ?? "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge value={exam.attendance} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge value={exam.result} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {exam.createdBy?.fullName ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* --------------------------------------------- Trials ------- */}
        <TabsContent value="trials" className="mt-4">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-sm font-semibold">Practical Trials</h2>
              <Button
                size="xs"
                render={<Link href={`/trials?clientId=${client.id}`} />}
              >
                <PlusIcon className="size-3" />
                Add Trial
              </Button>
            </div>

            {records.trials.length === 0 ? (
              <EmptyState title="No trials recorded" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>DMT Barcode</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Entered By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.trials.map((trial) => (
                      <TableRow key={trial.id}>
                        <TableCell>{formatDate(trial.trialDate)}</TableCell>
                        <TableCell className="tabular">
                          {trial.dmtBarcode ?? "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge value={trial.result} />
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {trial.resultNotes ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {trial.createdBy?.fullName ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ------------------------------------------- Lectures ------- */}
        <TabsContent value="lectures" className="mt-4">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h2 className="text-sm font-semibold">Lecture Attendance</h2>
                <p className="text-xs text-muted-foreground">
                  {records.lectureSummary.present} present of{" "}
                  {records.lectureSummary.total} recorded
                </p>
              </div>
              <Button
                size="xs"
                render={<Link href={`/lectures?clientId=${client.id}`} />}
              >
                <PlusIcon className="size-3" />
                Add Attendance
              </Button>
            </div>

            {records.lectures.length === 0 ? (
              <EmptyState title="No lecture attendance recorded" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Entered By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.lectures.map((lecture) => (
                      <TableRow key={lecture.id}>
                        <TableCell>
                          {formatDate(lecture.attendanceDate)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge value={lecture.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {lecture.createdBy?.fullName ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* --------------------------------- Practical training ------- */}
        <TabsContent value="training" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 md:p-6">
              <h2 className="mb-3 text-sm font-semibold">Training Summary</h2>
              <p className="text-sm">
                Total Training Days:{" "}
                <span className="tabular font-semibold">
                  {records.trainingSummary.totalDays}
                </span>
              </p>

              {records.trainingSummary.byClass.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {records.trainingSummary.byClass.map((row) => (
                    <Badge key={row.code} variant="secondary">
                      {row.code}: {row.days}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-sm font-semibold">Training Records</h2>
              <Button
                size="xs"
                render={
                  <Link href={`/practical-training?clientId=${client.id}`} />
                }
              >
                <PlusIcon className="size-3" />
                Add Training
              </Button>
            </div>

            {records.trainings.length === 0 ? (
              <EmptyState title="No practical training recorded" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vehicle Classes</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Entered By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.trainings.map((training) => (
                      <TableRow key={training.id}>
                        <TableCell>
                          {formatDate(training.trainingDate)}
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
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {training.notes ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {training.createdBy?.fullName ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ------------------------------------------- Payments ------- */}
        <TabsContent value="payments" className="mt-4">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h2 className="text-sm font-semibold">Payments</h2>
                <p className="text-xs text-muted-foreground">
                  Paid {formatCurrency(finance.totalPaid)} of{" "}
                  {formatCurrency(finance.agreedFee)} · Remaining{" "}
                  {formatCurrency(finance.remaining)}
                </p>
              </div>
              <Button
                size="xs"
                render={<Link href={`/payments?clientId=${client.id}`} />}
              >
                <PlusIcon className="size-3" />
                Add Payment
              </Button>
            </div>

            {records.payments.length === 0 ? (
              <EmptyState title="No payments recorded" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Bill No.</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Entered By</TableHead>
                      <TableHead className="text-right">Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                        <TableCell className="tabular">
                          {payment.billNumber}
                        </TableCell>
                        <TableCell>{humanise(payment.paymentType)}</TableCell>
                        <TableCell className="tabular text-right font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.createdBy?.fullName ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="xs"
                            render={
                              <Link
                                href={`/payments/${payment.id}/receipt`}
                                target="_blank"
                              />
                            }
                          >
                            Print
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* -------------------------------------------- History ------- */}
        <TabsContent value="history" className="mt-4">
          <Card className="overflow-hidden p-0">
            <div className="border-b p-4">
              <h2 className="text-sm font-semibold">Client History</h2>
              <p className="text-xs text-muted-foreground">
                Recorded changes to this client&apos;s record.
              </p>
            </div>

            {records.history.length === 0 ? (
              <EmptyState title="No recorded activity yet" />
            ) : (
              <ul className="divide-y">
                {records.history.map((entry) => (
                  <li key={entry.id} className="flex gap-3 p-4">
                    <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <p className="text-sm">{entry.description}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {humanise(entry.action)} ·{" "}
                        {entry.user?.fullName ?? "System"} ·{" "}
                        {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
