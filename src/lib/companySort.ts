/** Shared company ordering used everywhere companies are listed. */

type CompanyCodeSource = {
  name: string;
  company_code?: string | null;
};

/** Extracts the numeric part of a company code, ignoring prefixes like ISBI / ISBIJ. */
export function extractCompanyCode(source: string | CompanyCodeSource): number {
  const value = typeof source === "string"
    ? source
    : `${source.company_code ?? ""} ${source.name ?? ""}`;
  const m = value.match(/ISBI[A-Z]*\s*(\d+)/i);
  if (m) return parseInt(m[1], 10);
  const any = value.match(/(\d+)/);
  return any ? parseInt(any[1], 10) : -1;
}

/** Sorts by numeric code descending, then by name descending. */
export function compareCompanies(a: CompanyCodeSource, b: CompanyCodeSource): number {
  const ac = extractCompanyCode(a);
  const bc = extractCompanyCode(b);
  if (ac !== bc) return bc - ac;
  return (b.name ?? "").localeCompare(a.name ?? "");
}

/** Returns a new array sorted with the standard company order. */
export function sortCompanies<T extends CompanyCodeSource>(rows: T[]): T[] {
  return [...rows].sort(compareCompanies);
}
