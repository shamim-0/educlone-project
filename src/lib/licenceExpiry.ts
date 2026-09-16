/** Licence / registration expiry tracking for companies (1-month renewal signal). */

export const EXPIRY_FIELDS: { key: string; label: string; issued: string; expire: string }[] = [
  { key: "mother_company", label: "Mother Company", issued: "mother_company_issued_date", expire: "mother_company_expire_date" },
  { key: "company", label: "Company", issued: "company_issue_date", expire: "company_expire_date" },
  { key: "misa", label: "MISA", issued: "misa_issued_date", expire: "misa_expire_date" },
];

/** Days remaining until the given date (negative when already expired). */
export function daysUntil(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export interface ExpiryAlert {
  key: string;
  label: string;
  date: string;
  daysLeft: number;
  expired: boolean;
}

/** Alerts for licences expiring within `withinDays` (default 30) or already expired. */
export function getExpiryAlerts(company: Record<string, any> | null | undefined, withinDays = 30): ExpiryAlert[] {
  if (!company) return [];
  const out: ExpiryAlert[] = [];
  EXPIRY_FIELDS.forEach((f) => {
    const val = company[f.expire];
    if (!val) return;
    const daysLeft = daysUntil(String(val));
    if (daysLeft <= withinDays) {
      out.push({ key: f.key, label: f.label, date: String(val), daysLeft, expired: daysLeft < 0 });
    }
  });
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

export const fmtDate = (d?: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-GB") : "—";
