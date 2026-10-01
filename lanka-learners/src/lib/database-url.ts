/**
 * pg currently treats these legacy SSL modes as verify-full, but its next
 * major version will follow libpq's weaker semantics. Make the intended
 * certificate and hostname verification explicit and silence the warning.
 */
export function enforceVerifiedPostgresSsl(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode")?.toLowerCase();

    if (["prefer", "require", "verify-ca"].includes(sslMode ?? "")) {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }
  } catch {
    // Prisma/pg will report a useful connection-string error later.
  }

  return connectionString;
}
