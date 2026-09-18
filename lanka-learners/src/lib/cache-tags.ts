/**
 * Tags for server-side cached queries. Every Server Action that changes the
 * underlying data expires the matching tag, so cached reads are never stale
 * after a user's own write.
 */
export const CACHE_TAGS = {
  /** The client picker list (names, NIC, admission numbers). */
  clientOptions: "client-options",
  /** Active vehicle classes. */
  vehicleClasses: "vehicle-classes",
  /** School name, receipt footer, etc. — read on every page. */
  settings: "settings",
  /** Dashboard and analytics figures. */
  stats: "stats",
} as const;
