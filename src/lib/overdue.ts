/** Shared working-day deadline config + overdue detection for company services. */

export const COUNTDOWN_CONFIG: Record<string, { offsetWD: number; windowWD: number }> = {
  mother_company_formation_bd: { offsetWD: 0, windowWD: 10 },
  usa_company_formation: { offsetWD: 0, windowWD: 10 },
  canada_company_formation: { offsetWD: 0, windowWD: 10 },
  saudi_company_structure_planning: { offsetWD: 0, windowWD: 10 },
  corporate_email_setup: { offsetWD: 0, windowWD: 10 },
  saudi_company_name_reservation: { offsetWD: 0, windowWD: 10 },
  cr_commercial_registration: { offsetWD: 20, windowWD: 5 },
  spl_national_address: { offsetWD: 20, windowWD: 5 },
  qiwa_setup: { offsetWD: 20, windowWD: 5 },
  gosi_registration: { offsetWD: 20, windowWD: 5 },
  vat_zatca_registration: { offsetWD: 20, windowWD: 5 },
  chamber_of_commerce_registration: { offsetWD: 20, windowWD: 5 },
};

const isWorkingDay = (dt: Date) => {
  const d = dt.getDay();
  return d !== 5 && d !== 6;
};

/** Target (deadline) date for a service window that starts from the "all papers received" date. */
export function serviceWindow(allPapersAt: string, cfg: { offsetWD: number; windowWD: number }) {
  const start = new Date(allPapersAt);
  start.setHours(0, 0, 0, 0);
  let advanced = 0;
  while (advanced < cfg.offsetWD) {
    start.setDate(start.getDate() + 1);
    if (isWorkingDay(start)) advanced++;
  }
  const target = new Date(start);
  let added = 0;
  while (added < cfg.windowWD) {
    target.setDate(target.getDate() + 1);
    if (isWorkingDay(target)) added++;
  }
  return { start, target };
}

/**
 * A company is overdue when any applicable service with a deadline window
 * has passed its target date and is not done / no_need.
 */
export function isCompanyOverdue(
  applicableKeys: string[],
  statuses: Record<string, string>,
  allPapersAt: string | null
): boolean {
  if (!allPapersAt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return applicableKeys.some((key) => {
    const cfg = COUNTDOWN_CONFIG[key];
    if (!cfg) return false;
    const st = statuses[key] ?? "not_started";
    if (st === "done" || st === "no_need") return false;
    const { start, target } = serviceWindow(allPapersAt, cfg);
    if (today < start) return false;
    return today > target;
  });
}
