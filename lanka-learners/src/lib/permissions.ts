/**
 * Single source of truth for the role model, shared by the server guards and
 * the UI. The UI uses it to decide what to render; the server uses it to decide
 * what to allow. Hiding a button is never the security mechanism — every
 * mutation re-checks on the server.
 */

export type Role = "OWNER" | "EMPLOYEE";

export const OWNER_ONLY_PATHS = [
  "/analytics",
  "/employees",
  "/activity-logs",
  "/settings",
] as const;

/** True when `path` may only be viewed by an owner. */
export function isOwnerOnlyPath(path: string): boolean {
  return OWNER_ONLY_PATHS.some(
    (owned) => path === owned || path.startsWith(`${owned}/`)
  );
}

/**
 * Employees are data-entry users: they may create operational records but may
 * never modify or delete an existing one. Owners can correct anything.
 *
 * Pages use this to decide whether to render Edit controls. The matching
 * server-side rule is `requireOwnerAction()`, which every update action calls
 * before touching the database — that is what actually enforces the boundary.
 */
export function canEditRecords(role: Role): boolean {
  return role === "OWNER";
}

/**
 * Access to the owner-only management area is enforced by `requireOwnerPage()`
 * on each page and by `isOwnerOnlyPath` in the proxy; there is no separate
 * per-feature predicate to keep out of sync with them.
 */
