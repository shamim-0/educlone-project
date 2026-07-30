// Helpers for admin-only "who did what" hover titles.

export function fmtWhen(at?: string | null): string {
  if (!at) return "";
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Builds a hover title such as "Last updated by rahim • 30 Jul 2026, 05:12 PM".
 * Returns undefined when there is nothing to show (so no tooltip appears).
 */
export function auditTitle(
  name?: string | null,
  at?: string | null,
  verb: string = "Last updated by",
): string | undefined {
  const who = (name ?? "").trim();
  if (!who) return undefined;
  const when = fmtWhen(at);
  return when ? `${verb} ${who} • ${when}` : `${verb} ${who}`;
}
