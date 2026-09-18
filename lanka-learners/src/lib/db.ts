import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7 requires a driver adapter for SQL databases.
 * A single client is cached on globalThis so hot reloads (and warm serverless
 * instances) reuse the same connection pool instead of exhausting the database.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and configure it."
    );
  }

  // Connection pooling: one bounded pool per server instance. Pair this with
  // Neon's pooled ("-pooler") connection string so many instances share a
  // small number of real database connections.
  const adapter = new PrismaPg({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    // Release idle connections so serverless instances don't hold them open.
    idleTimeoutMillis: 30_000,
    // Fail fast instead of hanging a request when the database is unreachable.
    connectionTimeoutMillis: 10_000,
  });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
