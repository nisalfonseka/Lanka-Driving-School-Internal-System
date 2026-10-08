import "server-only";

import { unstable_cache } from "next/cache";

import { ForbiddenError, type SessionUser } from "@/lib/auth/session";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";

export type BranchOption = { id: string; code: string; name: string };

export function branchFilterDefinition(branches: BranchOption[]) {
  return {
    key: "branchId",
    label: "Branch",
    type: "select" as const,
    options: [
      { value: "", label: "All branches" },
      ...branches.map((branch) => ({ value: branch.id, label: branch.name })),
    ],
  };
}

const readActiveBranches = unstable_cache(
  async () =>
    prisma.branch.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
  ["active-branches"],
  { tags: [CACHE_TAGS.branches], revalidate: 3600 }
);

export async function getActiveBranches(): Promise<BranchOption[]> {
  return readActiveBranches();
}

export async function getAllBranches() {
  return prisma.branch.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
}

export function listBranchId(
  user: SessionUser,
  requestedBranchId?: string
): string | undefined {
  if (user.role === "EMPLOYEE") {
    if (!user.branchId) throw new ForbiddenError("Your account has no branch assigned.");
    return user.branchId;
  }
  return requestedBranchId || undefined;
}

export async function createBranchId(
  user: SessionUser,
  requestedBranchId?: string
): Promise<string> {
  const branchId = user.role === "EMPLOYEE" ? user.branchId : requestedBranchId;
  if (!branchId) throw new ForbiddenError("Choose a branch for this record.");

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!branch) throw new ForbiddenError("That branch is not available.");
  return branch.id;
}

export function assertBranchAccess(user: SessionUser, branchId: string): void {
  if (user.role === "EMPLOYEE" && user.branchId !== branchId) {
    throw new ForbiddenError("You cannot access another branch's records.");
  }
}

export async function assertClientAccess(
  user: SessionUser,
  clientId: string
): Promise<boolean> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { branchId: true },
  });
  if (!client) return false;
  assertBranchAccess(user, client.branchId);
  return true;
}
