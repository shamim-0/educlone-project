import { supabase } from "@/integrations/supabase/client";
import { methodLabel, numberToWords } from "@/lib/invoice";

export function formatVoucherNo(n?: number | null) {
  return `EXP${String(n ?? 0).padStart(5, "0")}`;
}

function esc(s: string) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

const money = (n: number) =>
  `${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SR`;
const dateFmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const HEAD = `
  <div class="header">
    <svg class="shield" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6c46a"/><stop offset="1" stop-color="#a07a20"/></linearGradient></defs>
      <path d="M32 4 L58 14 V32 C58 46 46 56 32 60 C18 56 6 46 6 32 V14 Z" fill="url(#g)" stroke="#7a5b10" stroke-width="1"/>
      <path d="M20 32 L29 41 L46 24" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div class="head-text">
      <h1>INVESECURITY BUSINESS INCUBATOR</h1>
      <p>Empowering Local Brands to Global | <b>CR:</b> 7051792260 | <b>VAT:</b> 314252983300003</p>
    </div>
  </div>`;

const FOOT = `
  <div class="footer">
    <div>
      <div><b>☎</b> +966 571 353 340 &nbsp;·&nbsp; <b>✉</b> contact@invesecurity.com</div>
      <div style="margin-top:2px">Crystal Palace KSA, 3328 King Abdulaziz Rd, Al Murabba, Riyadh 12631, Saudi Arabia</div>
    </div>
    <div class="sig">
      <div class="name">Zahid Hassan</div>
      <div class="title">Chief Executive Officer</div>
    </div>
  </div>`;

const CSS = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #222; background: #f5f5f5; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 16mm 14mm; }
  .header { display: flex; align-items: center; gap: 16px; padding-bottom: 10px; border-bottom: 3px solid #b45309; }
  .shield { width: 60px; height: 60px; flex-shrink: 0; }
  .head-text { text-align: center; flex: 1; }
  .head-text h1 { margin: 0; font-size: 22px; letter-spacing: 1px; font-weight: 800; }
  .head-text p { margin: 4px 0 0; font-size: 11px; color: #333; }
  .title-bar { margin-top: 14px; display:flex; justify-content:space-between; align-items:flex-end; }
  .title-bar h2 { margin:0; font-size: 20px; color:#9a3412; }
  .title-bar .meta { text-align:right; font-size:12px; color:#555; }
  .voucher-no { display:inline-block; background:#b45309; color:#fff; padding:4px 12px; border-radius:4px; font-weight:700; font-size:13px; }
  .client, .period { margin-top:12px; padding:10px 14px; background:#fff7ed; border-left:4px solid #b45309; border-radius:4px; font-size:13px; }
  .client .name { font-size:16px; font-weight:700; }
  .client .line { font-size:12px; color:#555; margin-top:2px; }
  .stats { margin-top:14px; display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; }
  .stats.four { grid-template-columns: repeat(4, 1fr); }
  .stat { background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px; text-align:center; }
  .stat .lbl { font-size:10px; text-transform:uppercase; letter-spacing:.6px; color:#64748b; font-weight:600; }
  .stat .val { font-size:15px; font-weight:800; margin-top:4px; color:#9a3412; }
  h3.sec { margin: 16px 0 6px; font-size: 13px; color:#9a3412; text-transform:uppercase; letter-spacing:.6px; border-bottom:2px solid #fed7aa; padding-bottom:4px; }
  table { width:100%; border-collapse: collapse; font-size:12px; }
  table thead th { background:#b45309; color:#fff; padding:8px 10px; text-align:left; font-weight:600; font-size:11px; }
  table thead th.r { text-align:right; }
  table tbody td { padding:7px 10px; border-bottom:1px solid #f1f5f9; }
  table tbody tr:nth-child(even) td { background:#fffbeb; }
  table tbody td.r { text-align:right; font-variant-numeric: tabular-nums; }
  .subtotal-row td, .total-row td { font-weight:800; background:#9a3412 !important; color:#fff; }
  .breakdown { margin-top:14px; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; }
  .breakdown td { padding:8px 12px; border-bottom:1px solid #f1f5f9; font-size:12px; }
  .breakdown tr:last-child td { border-bottom:none; }
  .breakdown .value { text-align:right; font-weight:700; font-variant-numeric: tabular-nums; }
  .breakdown .total td { background:#9a3412; color:#fff; font-size:14px; }
  .words { margin-top:10px; text-align:right; font-size:11px; color:#555; font-style:italic; }
  .footer { margin-top:22px; padding-top:10px; border-top:2px solid #b45309; display:flex; justify-content:space-between; font-size:10px; color:#444; }
  .footer .sig .name { font-family:'Brush Script MT', cursive; font-size:24px; color:#b45309; }
  .footer .sig .title { border-top:1px solid #999; padding-top:2px; margin-top:2px; font-weight:600; text-align:center; }
  .issuer { margin-top:10px; display:inline-block; background:#fef3c7; border:1px dashed #d97706; color:#92400e; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:600; }
  .toolbar { position: fixed; top:10px; right:10px; z-index:99; }
  .toolbar button { background:#b45309; color:#fff; border:0; padding:10px 18px; font-size:14px; border-radius:6px; cursor:pointer; }
  @media print { .toolbar, .issuer { display:none !important; } body { background:#fff; } .page { padding:12mm; } }
`;

function openWindow(title: string, body: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${esc(title)}</title><style>${CSS}</style></head>
<body><div class="toolbar"><button onclick="window.print()">Print / Save PDF</button></div><div class="page">${body}</div></body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("Please allow popups to view the document."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/* ---------------- Single expense voucher ---------------- */
export async function openExpenseVoucher(
  companyId: string,
  expenseId: string,
  opts?: { showIssuer?: boolean },
) {
  const [cRes, eRes] = await Promise.all([
    supabase.from("companies").select("name, client_name, passport_iqama, phone, whatsapp, address").eq("id", companyId).single(),
    supabase.from("company_expenses").select("*").eq("id", expenseId).single(),
  ]);
  if (cRes.error || !cRes.data) throw new Error(cRes.error?.message || "Company not found");
  if (eRes.error || !eRes.data) throw new Error(eRes.error?.message || "Expense not found");
  const c = cRes.data as any;
  const x = eRes.data as any;

  let issuedBy: string | null = null;
  if (opts?.showIssuer && x.created_by) {
    const p = await supabase.from("profiles").select("username, email").eq("id", x.created_by).maybeSingle();
    issuedBy = (p.data as any)?.username || (p.data as any)?.email || null;
  }

  const amount = Number(x.amount || 0);
  const body = `
  ${HEAD}
  <div class="title-bar">
    <h2>Expense Voucher</h2>
    <div class="meta"><span class="voucher-no">Voucher No: ${formatVoucherNo(x.voucher_no)}</span><br />${dateFmt(x.expense_date || x.created_at)}</div>
  </div>
  <div class="client">
    <div class="name">Client Name: ${esc(c.client_name?.trim() || c.name)}</div>
    <div class="line">Project Name : ${esc(c.name)}</div>
    ${c.passport_iqama ? `<div class="line">Passport / Iqama No : ${esc(c.passport_iqama)}</div>` : ""}
    ${c.phone || c.whatsapp ? `<div class="line">Mobile : ${esc(c.phone || c.whatsapp)}</div>` : ""}
    ${c.address ? `<div class="line">${esc(c.address)}</div>` : ""}
    ${issuedBy ? `<div class="issuer">Issued by: ${esc(issuedBy)} (admin only — not printed)</div>` : ""}
  </div>
  <h3 class="sec">Cost Details</h3>
  <table>
    <thead><tr><th style="width:44px">#</th><th>Purpose</th><th style="width:110px">Date</th><th style="width:120px">Method</th><th class="r" style="width:130px">Amount</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>${esc(x.purpose)}</td><td>${dateFmt(x.expense_date || x.created_at)}</td><td>${esc(methodLabel(x.payment_method))}</td><td class="r">${money(amount)}</td></tr>
      <tr class="total-row"><td colspan="4" class="r">Total Cost</td><td class="r">${money(amount)}</td></tr>
    </tbody>
  </table>
  <div class="words">In words: <b>${numberToWords(amount)} SR</b></div>
  ${FOOT}`;
  openWindow(`Expense ${formatVoucherNo(x.voucher_no)}`, body);
}

/* ---------------- Company expense summary ---------------- */
export async function openExpenseSummary(companyId: string) {
  const [cRes, eRes, xRes] = await Promise.all([
    supabase.from("companies").select("name, client_name, phone, whatsapp, address").eq("id", companyId).single(),
    supabase.from("company_expenses").select("*").eq("company_id", companyId),
    supabase.from("company_extra_expenses").select("*").eq("company_id", companyId),
  ]);
  if (cRes.error || !cRes.data) throw new Error(cRes.error?.message || "Company not found");
  const c = cRes.data as any;
  const expenses = ((eRes.data as any[]) ?? []).slice().sort((a, b) =>
    String(a.expense_date ?? a.created_at ?? "").localeCompare(String(b.expense_date ?? b.created_at ?? "")));
  const extras = ((xRes.data as any[]) ?? []).slice().sort((a, b) =>
    String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")));

  const costTotal = expenses.reduce((s, x) => s + Number(x.amount || 0), 0);
  const extrasTotal = extras.reduce((s, x) => s + Number(x.amount || 0), 0);
  const grand = costTotal + extrasTotal;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const byMethod = new Map<string, number>();
  expenses.forEach((x) => {
    const k = methodLabel(x.payment_method);
    byMethod.set(k, (byMethod.get(k) ?? 0) + Number(x.amount || 0));
  });

  const costRows = expenses.length === 0
    ? `<tr><td colspan="5" style="text-align:center;color:#888;padding:14px">No expenses recorded</td></tr>`
    : expenses.map((x, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><b>${formatVoucherNo(x.voucher_no)}</b> — ${esc(x.purpose)}</td>
        <td>${dateFmt(x.expense_date || x.created_at)}</td>
        <td>${esc(methodLabel(x.payment_method))}</td>
        <td class="r">${money(Number(x.amount || 0))}</td>
      </tr>`).join("");

  const extraRows = extras.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:#888;padding:14px">No extra costs</td></tr>`
    : extras.map((x, i) => `
      <tr><td>${i + 1}</td><td>Extra</td><td class="r">${money(Number(x.amount || 0))}</td></tr>`).join("");

  const body = `
  ${HEAD}
  <div class="title-bar">
    <h2>Expense Statement</h2>
    <div class="meta"><b>Date:</b> ${today}</div>
  </div>
  <div class="client">
    <div class="name">${esc((c.client_name && String(c.client_name).trim()) || c.name)}</div>
    <div class="line">Project Name: ${esc(c.name)}</div>
    ${c.phone || c.whatsapp ? `<div class="line">Mobile: ${esc(c.phone || c.whatsapp)}</div>` : ""}
    ${c.address ? `<div class="line">${esc(c.address)}</div>` : ""}
  </div>
  <div class="stats">
    <div class="stat"><div class="lbl">Cost Entries</div><div class="val">${expenses.length}</div></div>
    <div class="stat"><div class="lbl">Extra Costs</div><div class="val">${money(extrasTotal)}</div></div>
    <div class="stat"><div class="lbl">Total Expense</div><div class="val">${money(grand)}</div></div>
  </div>

  <h3 class="sec">Costs by Purpose (${expenses.length})</h3>
  <table>
    <thead><tr><th style="width:36px">#</th><th>Voucher / Purpose</th><th style="width:100px">Date</th><th style="width:110px">Method</th><th class="r" style="width:120px">Amount</th></tr></thead>
    <tbody>${costRows}<tr class="subtotal-row"><td colspan="4" class="r">Costs Subtotal</td><td class="r">${money(costTotal)}</td></tr></tbody>
  </table>

  <h3 class="sec">Extra Costs (${extras.length})</h3>
  <table>
    <thead><tr><th style="width:36px">#</th><th>Description</th><th class="r" style="width:120px">Amount</th></tr></thead>
    <tbody>${extraRows}<tr class="subtotal-row"><td colspan="2" class="r">Extras Subtotal</td><td class="r">${money(extrasTotal)}</td></tr></tbody>
  </table>

  <h3 class="sec">Total Breakdown</h3>
  <div class="breakdown"><table>
    <tr><td>Costs (${expenses.length})</td><td class="value">${money(costTotal)}</td></tr>
    <tr><td>(+) Extra Costs (${extras.length})</td><td class="value">${money(extrasTotal)}</td></tr>
    ${Array.from(byMethod.entries()).map(([k, v]) => `<tr><td style="color:#64748b">· ${esc(k)}</td><td class="value" style="color:#64748b">${money(v)}</td></tr>`).join("")}
    <tr class="total"><td>Total Expense</td><td class="value">${money(grand)}</td></tr>
  </table></div>

  <div class="words">In words: <b>${numberToWords(grand)} SR</b></div>
  ${FOOT}`;
  openWindow(`Expense Statement - ${c.name}`, body);
}

/* ---------------- Date-range expense report ---------------- */
export interface ExpenseRangeRow {
  companyName: string;
  voucherNo?: number | null;
  purpose: string;
  date?: string | null;
  method?: string | null;
  amount: number;
}

export function openExpenseRangeStatement(opts: {
  from?: string;
  to?: string;
  branch?: string;
  rows: ExpenseRangeRow[];
}) {
  const rows = opts.rows.slice().sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")));
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const periodLabel = `${opts.from ? dateFmt(opts.from) : "Beginning"} — ${opts.to ? dateFmt(opts.to) : "Today"}`;

  const byMethod = new Map<string, number>();
  rows.forEach((r) => {
    const k = methodLabel(r.method);
    byMethod.set(k, (byMethod.get(k) ?? 0) + Number(r.amount || 0));
  });

  const bodyRows = rows.length === 0
    ? `<tr><td colspan="6" style="text-align:center;color:#888;padding:16px">No expenses in this period</td></tr>`
    : rows.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><b>${formatVoucherNo(r.voucherNo)}</b></td>
        <td>${esc(r.companyName)}</td>
        <td>${esc(r.purpose)}</td>
        <td>${dateFmt(r.date)} · ${esc(methodLabel(r.method))}</td>
        <td class="r">${money(Number(r.amount || 0))}</td>
      </tr>`).join("");

  const body = `
  ${HEAD}
  <div class="title-bar">
    <h2>Expense Report</h2>
    <div class="meta"><b>Generated:</b> ${today}</div>
  </div>
  <div class="period"><b>Period:</b> ${esc(periodLabel)}${opts.branch && opts.branch !== "all" ? ` &nbsp;·&nbsp; <b>Branch:</b> ${esc(opts.branch)}` : ""}</div>
  <div class="stats">
    <div class="stat"><div class="lbl">Entries</div><div class="val">${rows.length}</div></div>
    <div class="stat"><div class="lbl">Companies</div><div class="val">${new Set(rows.map((r) => r.companyName)).size}</div></div>
    <div class="stat"><div class="lbl">Total Expense</div><div class="val">${money(total)}</div></div>
  </div>

  <h3 class="sec">Expenses (${rows.length})</h3>
  <table>
    <thead><tr><th style="width:36px">#</th><th style="width:90px">Voucher</th><th>Company</th><th>Purpose</th><th style="width:150px">Date / Method</th><th class="r" style="width:120px">Amount</th></tr></thead>
    <tbody>${bodyRows}<tr class="total-row"><td colspan="5" class="r">Total Expense</td><td class="r">${money(total)}</td></tr></tbody>
  </table>

  <h3 class="sec">Breakdown by Payment Method</h3>
  <div class="breakdown"><table>
    ${Array.from(byMethod.entries()).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="value">${money(v)}</td></tr>`).join("") || `<tr><td>—</td><td class="value">${money(0)}</td></tr>`}
    <tr class="total"><td>Total</td><td class="value">${money(total)}</td></tr>
  </table></div>

  <div class="words">In words: <b>${numberToWords(total)} SR</b></div>
  ${FOOT}`;
  openWindow(`Expense Report ${periodLabel}`, body);
}
