import { BanknoteIcon, PrinterIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PaymentDialog } from "@/components/payments/payment-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { RecordFilters } from "@/components/shared/record-filters";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
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
import { formatCurrency, formatDate, humanise, toNumber } from "@/lib/format";
import { getClientOptions, getClientProfile } from "@/lib/queries/clients";
import { searchPayments } from "@/lib/queries/operations";
import {
  flattenSearchParams,
  readDate,
  readEnum,
  readPage,
  readText,
} from "@/lib/search-params";

export const metadata: Metadata = { title: "Payments" };

const TYPES = ["ADVANCE", "INSTALLMENT", "TRAINING_FEE", "OTHER"] as const;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  // Employees get a read-only list; only owners may correct existing records.
  const canEdit = canEditRecords(user.role);

  const params = flattenSearchParams(await searchParams);
  const clientId = readText(params.clientId, 40);

  const { rows, total, totalAmount, page, pageSize } = await searchPayments({
    q: readText(params.q),
    clientId,
    from: readDate(params.from),
    to: readDate(params.to),
    page: readPage(params.page),
    extra: { paymentType: readEnum(params.paymentType, TYPES) },
  });

  const clients = await getClientOptions();

  // When filtered to one client, show that learner's balance alongside.
  const focused = clientId ? await getClientProfile(clientId) : null;

  return (
    <>
      <PageHeader
        title="Payments"
        description={
          focused
            ? `${focused.client.fullName} · ${focused.client.admissionNumber}`
            : "Record client payments and print receipts."
        }
        actions={
          <PaymentDialog clients={clients} defaultClientId={clientId} />
        }
      />

      {focused ? (
        <section className="mb-4 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Agreed Fee"
            value={formatCurrency(focused.finance.agreedFee)}
          />
          <StatCard
            label="Total Paid"
            value={formatCurrency(focused.finance.totalPaid)}
            tone="positive"
          />
          <StatCard
            label="Remaining Balance"
            value={formatCurrency(focused.finance.remaining)}
            tone={focused.finance.remaining > 0 ? "warning" : "positive"}
          />
        </section>
      ) : (
        <section className="mb-4 grid gap-4 sm:grid-cols-2">
          <StatCard label="Matching Payments" value={total} />
          <StatCard
            label="Total Collected"
            value={formatCurrency(totalAmount)}
            hint="Across the current filters"
            tone="positive"
          />
        </section>
      )}

      <Card className="overflow-hidden p-0">
        <RecordFilters
          basePath="/payments"
          filters={[
            {
              key: "q",
              label: "Search",
              type: "text",
              placeholder: "Bill number or client…",
            },
            { key: "from", label: "From", type: "date" },
            { key: "to", label: "To", type: "date" },
            {
              key: "paymentType",
              label: "Type",
              type: "select",
              options: [
                { value: "", label: "All types" },
                { value: "ADVANCE", label: "Advance" },
                { value: "INSTALLMENT", label: "Installment" },
                { value: "TRAINING_FEE", label: "Training Fee" },
                { value: "OTHER", label: "Other" },
              ],
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={BanknoteIcon}
            title="No payments found"
            description="Record a payment to get started, or widen your search."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Bill No.</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Entered By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.paymentDate)}</TableCell>

                    <TableCell className="tabular font-medium">
                      {payment.billNumber}
                    </TableCell>

                    <TableCell>
                      <Link
                        href={`/clients/${payment.client.id}`}
                        className="hover:underline"
                      >
                        {payment.client.fullName}
                      </Link>
                      <span className="tabular block text-xs text-muted-foreground">
                        {payment.client.admissionNumber}
                      </span>
                    </TableCell>

                    <TableCell>{humanise(payment.paymentType)}</TableCell>

                    <TableCell className="tabular text-right font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {payment.updatedBy?.fullName ??
                        payment.createdBy?.fullName ??
                        "—"}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
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
                          <PrinterIcon className="size-3" />
                          Receipt
                        </Button>

                        {/* Only owners may correct a financial record. */}
                        {canEdit ? (
                          <PaymentDialog
                            payment={{
                              id: payment.id,
                              clientId: payment.client.id,
                              clientLabel: `${payment.client.fullName} · ${payment.client.admissionNumber}`,
                              paymentDate: payment.paymentDate,
                              billNumber: payment.billNumber,
                              amount: toNumber(payment.amount),
                              paymentType: payment.paymentType,
                              description: payment.description,
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
          basePath="/payments"
          params={params}
        />
      </Card>
    </>
  );
}
