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
  { value: "done", label: "Done" },
  { value: "no_need", label: "No Need" },
];

export function statusBadgeClass(s: string) {
  if (s === "done") return "bg-success/15 text-success border-success/30";
  if (s === "processing") return "bg-primary/15 text-primary border-primary/30";
  if (s === "no_need") return "bg-muted/60 text-muted-foreground border-border line-through";
  return "bg-muted text-muted-foreground border-border";
}
