import { UsersRoundIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  AddEmployeeDialog,
  EditEmployeeDialog,
  ResetPasswordDialog,
  ToggleStatusButton,
} from "@/components/employees/employee-dialogs";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { requireOwnerPage } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getActiveBranches } from "@/lib/branches";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Employee Details" };

export default async function EmployeesPage() {
  const owner = await requireOwnerPage();

  // `passwordHash` is deliberately absent from this projection — the hash must
  // never leave the server.
  const [users, branches] = await Promise.all([prisma.user.findMany({
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      mobile: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      branchId: true,
      branch: { select: { name: true, code: true } },
    },
  }), getActiveBranches()]);

  return (
    <>
      <PageHeader
        title="Employee Details"
        description="Create staff accounts, manage access and reset passwords."
        actions={<AddEmployeeDialog branches={branches} />}
      />

      <Card className="overflow-hidden p-0">
        {users.length === 0 ? (
          <EmptyState
            icon={UsersRoundIcon}
            title="No accounts yet"
            description="Add an employee to get started."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {users.map((user) => {
                  const isSelf = user.id === owner.id;
                  const isOtherOwner = user.role === "OWNER" && !isSelf;

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.fullName}
                        {isSelf ? (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            (you)
                          </span>
                        ) : null}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        @{user.username}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {user.email ?? "—"}
                      </TableCell>

                      <TableCell className="tabular text-muted-foreground">
                        {user.mobile ?? "—"}
                      </TableCell>

                      <TableCell>
                        <StatusBadge value={user.role} />
                      </TableCell>

                      <TableCell>{user.branch ? `${user.branch.name} (${user.branch.code})` : "All branches"}</TableCell>

                      <TableCell>
                        <StatusBadge value={user.status} />
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {user.lastLoginAt
                          ? formatDateTime(user.lastLoginAt)
                          : "Never"}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="xs"
                            render={
                              <Link href={`/activity-logs?userId=${user.id}`} />
                            }
                          >
                            Activity
                          </Button>

                          {/* Another owner's account is not editable here. */}
                          {isOtherOwner ? null : (
                            <>
                              <EditEmployeeDialog
                                employee={{
                                  id: user.id,
                                  fullName: user.fullName,
                                  email: user.email,
                                  mobile: user.mobile,
                                  role: user.role,
                                  branchId: user.branchId,
                                }}
                                branches={branches}
                              />

                              <ResetPasswordDialog
                                employee={{
                                  id: user.id,
                                  fullName: user.fullName,
                                  username: user.username,
                                }}
                              />

                              {isSelf ? null : (
                                <ToggleStatusButton
                                  employee={{
                                    id: user.id,
                                    fullName: user.fullName,
                                    status: user.status,
                                  }}
                                />
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </>
  );
}
