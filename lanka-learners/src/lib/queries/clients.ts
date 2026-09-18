import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { endOfUtcDay, toUtcDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";

export const CLIENTS_PAGE_SIZE = 20;

/**
 * Cached across requests — vehicle classes change rarely, and every settings
 * action that edits them expires the tag.
 */
export const getActiveVehicleClasses = cache(
  unstable_cache(
    async () =>
      prisma.vehicleClass.findMany({
        where: { status: "ACTIVE" },
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true },
      }),
    ["active-vehicle-classes"],
    { tags: [CACHE_TAGS.vehicleClasses], revalidate: 3600 }
  )
);

export const getAllVehicleClasses = cache(async () => {
  return prisma.vehicleClass.findMany({
    orderBy: [{ status: "asc" }, { code: "asc" }],
  });
});

export type ClientSearchInput = {
  q?: string;
  idNumber?: string;
  admissionNumber?: string;
  from?: string;
  to?: string;
  status?: "ACTIVE" | "COMPLETED";
  page: number;
};

/**
 * Server-side filtering and pagination — the browser never receives more than
 * one page of clients, no matter how large the school grows.
 */
export async function searchClients(input: ClientSearchInput) {
  const where: Prisma.ClientWhereInput = {};

  if (input.q) {
    where.OR = [
      { fullName: { contains: input.q, mode: "insensitive" } },
      { idNumber: { contains: input.q, mode: "insensitive" } },
      { admissionNumber: { contains: input.q, mode: "insensitive" } },
      { mobileMain: { contains: input.q } },
    ];
  }

  if (input.idNumber) {
    where.idNumber = { contains: input.idNumber, mode: "insensitive" };
  }

  if (input.admissionNumber) {
    where.admissionNumber = {
      contains: input.admissionNumber,
      mode: "insensitive",
    };
  }

  if (input.status) where.status = input.status;

  if (input.from || input.to) {
    where.registeredDate = {
      ...(input.from ? { gte: toUtcDateOnly(input.from) } : {}),
      ...(input.to ? { lte: endOfUtcDay(input.to) } : {}),
    };
  }

  const page = Math.max(1, input.page);

  const [rows, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { registeredDate: "desc" },
      skip: (page - 1) * CLIENTS_PAGE_SIZE,
      take: CLIENTS_PAGE_SIZE,
      select: {
        id: true,
        fullName: true,
        idNumber: true,
        admissionNumber: true,
        registeredDate: true,
        status: true,
        profilePhoto: true,
        vehicleClasses: {
          select: { vehicleClass: { select: { code: true } } },
        },
      },
    }),
    prisma.client.count({ where }),
  ]);

  return { rows, total, page, pageSize: CLIENTS_PAGE_SIZE };
}

export async function getClientProfile(clientId: string) {
  // Both queries run in parallel rather than one after the other.
  const [client, paid] = await Promise.all([
    prisma.client.findUnique({
    where: { id: clientId },
    include: {
      vehicleClasses: { include: { vehicleClass: true } },
      document: true,
      previousLicense: {
        include: { vehicleClasses: { include: { vehicleClass: true } } },
      },
      createdBy: { select: { fullName: true } },
      updatedBy: { select: { fullName: true } },
    },
    }),
    prisma.clientPayment.aggregate({
      _sum: { amount: true },
      where: { clientId },
    }),
  ]);

  if (!client) return null;

  const agreedFee = toNumber(client.totalAgreedFee);
  const totalPaid = toNumber(paid._sum.amount);

  return {
    client,
    finance: {
      agreedFee,
      totalPaid,
      // Balance is always derived — it is never stored, so it cannot drift.
      remaining: agreedFee - totalPaid,
    },
  };
}

/** Lightweight list for the client pickers on the operational pages. */
/**
 * Cached across requests (every list page needs it for its Add dialog);
 * registering or editing a client expires the tag.
 */
export const getClientOptions = cache(
  unstable_cache(
    async () =>
      prisma.client.findMany({
        orderBy: { fullName: "asc" },
        select: {
          id: true,
          fullName: true,
          admissionNumber: true,
          idNumber: true,
        },
        take: 1000,
      }),
    ["client-options"],
    { tags: [CACHE_TAGS.clientOptions], revalidate: 300 }
  )
);
