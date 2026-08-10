import "server-only";

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * A valid bcrypt hash of a random value. Compared against when a username does
 * not exist so that "unknown user" and "wrong password" take the same time and
 * the login endpoint cannot be used to enumerate accounts.
 */
const DUMMY_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.p/6ELDMBd3.RIe3JOxN3EGVXwaOl0Ae";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function burnTimingBudget(plain: string): Promise<void> {
  await bcrypt.compare(plain, DUMMY_HASH);
}
