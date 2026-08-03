/** Shared company ordering used everywhere companies are listed. */

/** Extracts the numeric part of a company code, ignoring prefixes like ISBI / ISBIJ. */
export function extractCompanyCode(name: string): number {
  const m = (name ?? "").match(/ISBI[A-Z]*\s*(\d+)/i);
  if (m) return parseInt(m[1], 10);
  const any = (name ?? "").match(/(\d+)/);
  return any ? parseInt(any[1], 10) : -1;
}

/** Sorts by numeric code descending, then by name descending. */
export function compareCompanies(a: { name: string }, b: { name: string }): number {
  const ac = extractCompanyCode(a.name);
  const bc = extractCompanyCode(b.name);
  if (ac !== bc) return bc - ac;
  return (b.name ?? "").localeCompare(a.name ?? "");
}

/** Returns a new array sorted with the standard company order. */
export function sortCompanies<T extends { name: string }>(rows: T[]): T[] {
  return [...rows].sort(compareCompanies);
}
