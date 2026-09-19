/** Orders vehicle classes by code the way a person reads them: A, AB, B, B1. */
export function compareClassCodes(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}
