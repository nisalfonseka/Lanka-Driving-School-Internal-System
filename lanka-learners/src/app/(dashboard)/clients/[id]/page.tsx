import {
  BanknoteIcon,
  CarIcon,
  ClipboardListIcon,
  PencilIcon,
  PlusIcon,
  UserIcon,
  WalletIcon,
} from "lucide-react";
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
  const paymentProgress =
    finance.agreedFee > 0
      ? Math.min(100, Math.round((finance.totalPaid / finance.agreedFee) * 100))
      : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ------------------------------------------------- Header ------ */}
      <Card className="relative overflow-hidden border-t-4 border-t-primary bg-card shadow-lg shadow-foreground/[0.07] ring-1 ring-foreground/[0.08]">
        <CardContent className="p-5 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary text-xl font-semibold text-primary-foreground shadow-md shadow-primary/20 ring-4 ring-primary/10">
              {client.profilePhoto ? (
                <Image
                  src={client.profilePhoto}
                  alt={`${client.fullName} profile photo`}
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                initials(client.fullName)
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
                Learner record
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                  {client.fullName}
                </h1>
                <StatusBadge value={client.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-muted px-3 py-1.5 tabular text-muted-foreground">
                  Admission · {client.admissionNumber}
                </span>
                <span className="rounded-full bg-muted px-3 py-1.5 tabular text-muted-foreground">
                  NIC · {client.idNumber}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 divide-x rounded-xl border bg-muted/55 text-center">
              <div className="px-3 py-3 sm:px-5">
                <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Age</p>
                <p className="mt-1 text-lg font-semibold tabular">{calculateAge(client.dateOfBirth) ?? "—"}</p>
              </div>
              <div className="px-3 py-3 sm:px-5">
                <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Classes</p>
                <p className="mt-1 text-lg font-semibold tabular">{client.vehicleClasses.length}</p>
              </div>
              <div className="px-3 py-3 sm:px-5">
                <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Training</p>
                <p className="mt-1 text-lg font-semibold tabular">{records.trainingSummary.totalDays}</p>
              </div>
            </div>

            {/* Employees see a read-only profile — only owners may correct it. */}
            {canEdit ? (
              <Button
                variant="outline"
                className="bg-card shadow-sm"
                render={<Link href={`/clients/${client.id}/edit`} />}
              >
                <PencilIcon className="size-4" />
                Edit client
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* --------------------------------------------------- Tabs ------ */}
      <Tabs defaultValue="overview" className="gap-4">
        <div className="overflow-x-auto border-b">
          <TabsList variant="line" className="min-w-max gap-1 p-0">
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
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-4">
              <Card>
                <CardContent className="p-5 md:p-6">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <UserIcon className="size-4" />
                    </div>
                    <div>
                      <h2 className="font-semibold tracking-tight">Personal details</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">Identity and contact information.</p>
                    </div>
                  </div>
                  <DetailList
                    items={[
                      { label: "Full Name", value: client.fullName },
                      { label: "NIC / ID", value: client.idNumber },
                      { label: "Date of Birth", value: formatDate(client.dateOfBirth) },
                      { label: "Age", value: `${calculateAge(client.dateOfBirth) ?? "—"} years` },
                      { label: "Address", value: client.address },
                      { label: "Main Mobile", value: client.mobileMain },
                      { label: "Backup Mobile", value: client.mobileBackup ?? "—" },
                      { label: "WhatsApp", value: client.mobileWhatsapp ?? "—" },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 md:p-6">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-chart-1/10 text-chart-1">
                      <ClipboardListIcon className="size-4" />
                    </div>
                    <div>
                      <h2 className="font-semibold tracking-tight">Registration</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">Admission and training setup.</p>
                    </div>
                  </div>
                  <DetailList
                    items={[
                      { label: "Admission Number", value: client.admissionNumber },
                      { label: "Registered Date", value: formatDate(client.registeredDate) },
                      { label: "Training Type", value: humanise(client.scheduleType) },
                      {
                        label: "Vehicle Classes",
                        value: (
                          <span className="flex flex-wrap gap-1.5">
                            {client.vehicleClasses.map((link) => (
                              <Badge key={link.id} className="bg-primary/10 text-primary hover:bg-primary/15">
                                {link.vehicleClass.code}
                              </Badge>
                            ))}
                          </span>
                        ),
                      },
                      { label: "Registered By", value: client.createdBy?.fullName ?? "—" },
                      { label: "Last Updated By", value: client.updatedBy?.fullName ?? "—" },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="overflow-hidden shadow-sm">
                <div className="h-1.5 bg-primary" />
                <CardContent className="p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Fee summary</p>
                      <p className="mt-1 text-2xl font-semibold tabular tracking-tight">{formatCurrency(finance.remaining)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {finance.remaining > 0 ? "remaining balance" : "payment complete"}
                      </p>
                    </div>
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <WalletIcon className="size-5" />
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Payment progress</span>
                      <span className="tabular font-medium">{paymentProgress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${paymentProgress}%` }} />
                    </div>
                  </div>

                  <dl className="mt-5 space-y-3 border-t pt-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Agreed fee</dt>
                      <dd className="tabular font-medium">{formatCurrency(finance.agreedFee)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Collected</dt>
                      <dd className="tabular font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(finance.totalPaid)}</dd>
                    </div>
                  </dl>

                  <Button size="sm" className="mt-5 w-full" render={<Link href={`/payments?clientId=${client.id}`} />}>
                    <BanknoteIcon className="size-4" />
                    Add payment
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-chart-2/10 text-chart-2">
                      <CarIcon className="size-4" />
                    </div>
                    <div>
                      <h2 className="font-semibold tracking-tight">Assigned classes</h2>
                      <p className="text-xs text-muted-foreground">Vehicle categories for this learner.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {client.vehicleClasses.length > 0 ? (
                      client.vehicleClasses.map((link) => (
                        <Badge key={link.id} className="bg-primary/10 text-primary hover:bg-primary/15">
                          {link.vehicleClass.code}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No classes assigned.</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
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
