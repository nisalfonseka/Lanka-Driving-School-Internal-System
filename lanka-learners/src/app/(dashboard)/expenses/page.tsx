import { ReceiptIcon } from "lucide-react";
import type { Metadata } from "next";

import { ExpenseDialog } from "@/components/expenses/expense-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { RecordFilters } from "@/components/shared/record-filters";
import { StatCard } from "@/components/shared/stat-card";
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
import { requireUser } from "@/lib/auth/session";
import { canEditRecords } from "@/lib/permissions";
import { formatCurrency, formatDate, humanise, toNumber } from "@/lib/format";
import { searchExpenses } from "@/lib/queries/operations";
import {
  flattenSearchParams,
  readDate,
  readEnum,
  readPage,
  readText,
} from "@/lib/search-params";

export const metadata: Metadata = { title: "Expenses" };

const CATEGORIES = [
  "OFFICE_ACCESSORIES",
  "VEHICLE_REPAIRS",
  "FUEL",
  "OTHER",
] as const;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  // Employees get a read-only list; only owners may correct existing records.
  const canEdit = canEditRecords(user.role);

  const params = flattenSearchParams(await searchParams);

  const { rows, total, totalAmount, page, pageSize } = await searchExpenses({
    q: readText(params.q),
    from: readDate(params.from),
    to: readDate(params.to),
    page: readPage(params.page),
    extra: { category: readEnum(params.category, CATEGORIES) },
  });

  return (
    <>
      <PageHeader
        title="Company Expenses"
        description="Record and review what the school spends."
        actions={<ExpenseDialog />}
      />

      <section className="mb-4 grid gap-4 sm:grid-cols-2">
        <StatCard label="Matching Expenses" value={total} />
        <StatCard
          label="Total Spent"
          value={formatCurrency(totalAmount)}
          hint="Across the current filters"
        />
      </section>

      <Card className="overflow-hidden p-0">
        <RecordFilters
          basePath="/expenses"
          filters={[
            {
              key: "q",
              label: "Description",
              type: "text",
              placeholder: "Search description…",
            },
            { key: "from", label: "From", type: "date" },
            { key: "to", label: "To", type: "date" },
            {
              key: "category",
              label: "Category",
              type: "select",
              options: [
                { value: "", label: "All categories" },
                { value: "OFFICE_ACCESSORIES", label: "Office Accessories" },
                { value: "VEHICLE_REPAIRS", label: "Vehicle Repairs" },
                { value: "FUEL", label: "Fuel" },
                { value: "OTHER", label: "Other" },
              ],
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={ReceiptIcon}
            title="No expenses found"
            description="Record an expense to get started, or widen your search."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Sub Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Entered By</TableHead>
                  {canEdit ? (
                    <TableHead className="text-right">Action</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.expenseDate)}</TableCell>

                    <TableCell>
                      <Badge variant="outline">
                        {humanise(expense.category)}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {expense.subCategory
                        ? humanise(expense.subCategory)
                        : "—"}
                    </TableCell>

                    <TableCell className="max-w-60 truncate text-muted-foreground">
                      {expense.description ?? "—"}
                    </TableCell>

                    <TableCell className="tabular text-right font-medium">
                      {formatCurrency(expense.amount)}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {expense.updatedBy?.fullName ??
                        expense.createdBy?.fullName ??
                        "—"}
                    </TableCell>

                    {canEdit ? (
                      <TableCell className="text-right">
                        <ExpenseDialog
                          expense={{
                            id: expense.id,
                            expenseDate: expense.expenseDate,
                            category: expense.category,
                            subCategory: expense.subCategory,
                            amount: toNumber(expense.amount),
                            description: expense.description,
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
          basePath="/expenses"
          params={params}
        />
      </Card>
    </>
  );
}
