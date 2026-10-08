import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/payments/print-button";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, humanise, toNumber } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Payment Receipt" };

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const payment = await prisma.clientPayment.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          branchId: true,
          fullName: true,
          admissionNumber: true,
          idNumber: true,
          totalAgreedFee: true,
          branch: { select: { name: true } },
        },
      },
      createdBy: { select: { fullName: true } },
    },
  });

  if (!payment) notFound();
  if (user.role === "EMPLOYEE" && payment.client.branchId !== user.branchId) notFound();

  const settings = await getSettings();

  // Balance is derived from the payment rows, exactly like the client profile.
  const paidTotal = await prisma.clientPayment.aggregate({
    _sum: { amount: true },
    where: { clientId: payment.clientId },
  });

  const agreedFee = toNumber(payment.client.totalAgreedFee);
  const totalPaid = toNumber(paidTotal._sum.amount);
  const remaining = agreedFee - totalPaid;

  return (
    <div className="receipt-print-page mx-auto w-full max-w-[80mm]">
      <div className="mb-4 space-y-2 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            render={<Link href={`/clients/${payment.client.id}`} />}
          >
            <ArrowLeftIcon className="size-4" />
            Back to client
          </Button>
          <PrintButton />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          For the XPRINTER XP-Q80B, select 80 mm paper, 100% scale and disable
          browser headers and footers.
        </p>
      </div>

      <article className="print-area thermal-receipt rounded-lg border bg-background p-5 shadow-sm">
        <header className="border-b pb-4 text-center">
          <h1 className="text-xl font-bold tracking-tight uppercase">
            {settings.businessName}
          </h1>
          {settings.businessAddress ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {settings.businessAddress}
            </p>
          ) : null}
          <p className="mt-0.5 text-sm text-muted-foreground">
            {[settings.businessPhone, settings.businessEmail]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-3 text-sm font-semibold tracking-wide uppercase">
            Payment Receipt
          </p>
        </header>

        <section className="grid grid-cols-2 gap-4 border-b py-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase">
              Bill Number
            </p>
            <p className="tabular font-semibold">{payment.billNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase">
              Payment Date
            </p>
            <p className="font-medium">{formatDate(payment.paymentDate)}</p>
          </div>
        </section>

        <section className="border-b py-4 text-sm">
          <p className="mb-2 text-xs text-muted-foreground uppercase">
            Received From
          </p>
          <dl className="space-y-1">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Client Name</dt>
              <dd className="font-medium">{payment.client.fullName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Admission Number</dt>
              <dd className="tabular">{payment.client.admissionNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">NIC</dt>
              <dd className="tabular">{payment.client.idNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Branch</dt>
              <dd>{payment.client.branch.name}</dd>
            </div>
          </dl>
        </section>

        <section className="border-b py-4 text-sm">
          <dl className="space-y-1">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Payment Type</dt>
              <dd>{humanise(payment.paymentType)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Payment Method</dt>
              <dd>
                {payment.paymentMethod
                  ? humanise(payment.paymentMethod)
                  : "Not recorded"}
              </dd>
            </div>
            {payment.description ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Description</dt>
                <dd className="max-w-xs text-right">{payment.description}</dd>
              </div>
            ) : null}
          </dl>

          <div className="thermal-amount mt-4 flex items-center justify-between rounded-lg bg-muted px-4 py-3">
            <span className="text-sm font-medium">Amount Paid</span>
            <span className="tabular text-lg font-bold">
              {formatCurrency(payment.amount)}
            </span>
          </div>
        </section>

        <section className="border-b py-4 text-sm">
          <p className="mb-2 text-xs text-muted-foreground uppercase">
            Account Summary
          </p>
          <dl className="space-y-1">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Total Agreed Fee</dt>
              <dd className="tabular">{formatCurrency(agreedFee)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Total Paid</dt>
              <dd className="tabular">{formatCurrency(totalPaid)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t pt-1 font-semibold">
              <dt>Remaining Balance</dt>
              <dd className="tabular">{formatCurrency(remaining)}</dd>
            </div>
          </dl>
        </section>

        <footer className="pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Entered By</span>
            <span>{payment.createdBy?.fullName ?? "—"}</span>
          </div>

          {settings.receiptFooter ? (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              {settings.receiptFooter}
            </p>
          ) : null}
        </footer>
      </article>
    </div>
  );
}
