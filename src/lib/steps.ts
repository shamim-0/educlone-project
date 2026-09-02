export const STEP_DEFS: { key: string; label: string; tags: string[]; hasCreds?: boolean }[] = [
  { key: "email_account", label: "Email Account", tags: ["Credentials"], hasCreds: true },
  { key: "bd_formation", label: "BD Formation", tags: ["Bangladesh"] },
  { key: "usa_subsidiary", label: "USA Subsidiary", tags: ["International"] },
  { key: "uk_subsidiary", label: "UK Subsidiary", tags: ["International"] },
  { key: "dhl_send", label: "DHL Send", tags: ["Logistics"] },
  { key: "sbc_clearance", label: "SBC Clearance", tags: ["Portal"], hasCreds: true },
  { key: "misa_license", label: "MISA License", tags: ["Portal"], hasCreds: true },
  { key: "cr_comm_reg", label: "CR (Comm. Reg)", tags: ["KSA"] },
  { key: "qiwa", label: "QIWA", tags: ["KSA"] },
  { key: "muqeem", label: "MUQEEM", tags: ["KSA"], hasCreds: true },
  { key: "gosi", label: "GOSI", tags: ["KSA"] },
  { key: "zatca", label: "ZATCA", tags: ["KSA"], hasCreds: true },
  { key: "spl", label: "SPL", tags: ["KSA"], hasCreds: true },
  { key: "chamber", label: "Chamber", tags: ["KSA"], hasCreds: true },
  { key: "kafala", label: "Kafala", tags: ["KSA"] },
  { key: "cr_extract", label: "CR Extract", tags: ["KSA"] },
  { key: "bank_account", label: "Bank Account", tags: ["Banking"] },
];

export const STATUS_OPTS = [
  { value: "not_started", label: "Not Started" },
  { value: "processing", label: "Processing" },
  { value: "applied", label: "Applied" },
  { value: "done", label: "Done" },
  { value: "no_need", label: "No Need" },
];

// Every status that can be assigned to a service from the Services page
export const ALL_STATUS_OPTS = [
  { value: "pending", label: "Pending" },
  { value: "not_started", label: "Not Started" },
  { value: "processing", label: "Processing" },
  { value: "applied", label: "Applied" },
  { value: "at_muafaka", label: "At Muafaka" },
  { value: "done", label: "Done" },
  { value: "no_need", label: "No Need" },
];

// Service labels (case-insensitive) that support the "Applied" status
const APPLIED_SUPPORTED_LABELS = [
  "mother company formation (bangladesh)",
  "saudi company name reservation",
  "saudi company structure planning",
  "usa company formation (if applicable)",
  "canada company formation (if applicable)",
  "investment license (misa license)",
  "commercial registration (cr)",
  "chamber of commerce registration",
  "efaa registration",
  "trademark registration",
];

export function supportsApplied(label?: string) {
  if (!label) return false;
  return APPLIED_SUPPORTED_LABELS.includes(label.trim().toLowerCase());
}

export function getStatusOptsFor(label?: string, allowedStatuses?: string[]) {
  if (allowedStatuses && allowedStatuses.length > 0) {
    return ALL_STATUS_OPTS.filter(o => allowedStatuses.includes(o.value));
  }
  if (supportsApplied(label)) return STATUS_OPTS;
  return STATUS_OPTS.filter(o => o.value !== "applied");
}

export function statusBadgeClass(s: string) {
  if (s === "done") return "bg-success text-success-foreground border-success";
  if (s === "processing") return "bg-primary text-primary-foreground border-primary";
  if (s === "pending") return "bg-blue-600 text-white border-blue-600 hover:bg-blue-700";
  if (s === "applied") return "bg-blue-700 text-white border-blue-700 hover:bg-blue-800";
  if (s === "at_muafaka") return "bg-violet-600 text-white border-violet-600 hover:bg-violet-700";
  if (s === "no_need") return "bg-white text-black border-border line-through";
  return "bg-destructive text-destructive-foreground border-destructive";
}


export function getApplicableServiceDefs<T extends { key: string }>(companyType: string, allDefs: T[]): T[] {
  if (companyType === "services") {
    return allDefs.filter(d => d.key !== "usa_company_formation" && d.key !== "canada_company_formation");
  }
  return allDefs;
}
