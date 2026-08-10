import { UserPlusIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ClientFilters } from "@/components/clients/client-filters";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
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
import { formatDate, initials } from "@/lib/format";
import { searchClients } from "@/lib/queries/clients";
import { clientSearchSchema } from "@/lib/validations/client";

export const metadata: Metadata = { title: "Client Area" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();

  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ])
  );

  // Invalid query strings fall back to defaults rather than crashing the page.
  const parsed = clientSearchSchema.safeParse(flat);
  const filters = parsed.success
    ? parsed.data
    : { page: 1 as const, ...({} as Record<string, undefined>) };

  const { rows, total, page, pageSize } = await searchClients({
    q: filters.q,
    idNumber: filters.idNumber,
    admissionNumber: filters.admissionNumber,
    from: filters.from,
    to: filters.to,
    status: filters.status,
    page: filters.page ?? 1,
  });

  return (
    <>
      <PageHeader
        title="Client Area"
        description="Search and open learner records."
        actions={
          <Button render={<Link href="/clients/new" />}>
            <UserPlusIcon className="size-4" />
            Register Client
          </Button>
        }
      />

      <Card className="overflow-hidden p-0">
        <ClientFilters />

        {rows.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No clients found"
            description="Try widening your search, or register a new client."
            action={
              <Button size="sm" render={<Link href="/clients/new" />}>
                Register Client
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12" />
                  <TableHead>Name</TableHead>
                  <TableHead>NIC</TableHead>
                  <TableHead>Admission No.</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Vehicle Classes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="relative flex size-8 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-muted-foreground">
                        {client.profilePhoto ? (
                          <Image
                            src={client.profilePhoto}
                            alt=""
                            fill
                            sizes="32px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          initials(client.fullName)
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="font-medium">
                      <Link
                        href={`/clients/${client.id}`}
                        className="hover:underline"
                      >
                        {client.fullName}
                      </Link>
                    </TableCell>

                    <TableCell className="tabular text-muted-foreground">
                      {client.idNumber}
                    </TableCell>

                    <TableCell className="tabular">
                      {client.admissionNumber}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {formatDate(client.registeredDate)}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {client.vehicleClasses.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        ) : (
                          client.vehicleClasses.map((link) => (
                            <Badge
                              key={link.vehicleClass.code}
                              variant="outline"
                            >
                              {link.vehicleClass.code}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <StatusBadge value={client.status} />
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="xs"
                        render={<Link href={`/clients/${client.id}`} />}
                      >
                        View
                      </Button>
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
          basePath="/clients"
          params={flat as Record<string, string | undefined>}
        />
      </Card>
    </>
  );
}
