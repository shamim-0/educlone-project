import { supabase } from "@/integrations/supabase/client";

export const PAYMENT_METHODS = [
  { value: "bank", label: "Bank" },
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "online", label: "Online Payment" },
  { value: "other", label: "Other" },
] as const;

export function methodLabel(v?: string | null) {
  return PAYMENT_METHODS.find((m) => m.value === v)?.label ?? "Cash";
}

const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function below1000(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + below1000(n % 100) : "");
}

export function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const n = Math.floor(num);
  let res = "";
  const cr = Math.floor(n / 10000000);
  const lk = Math.floor((n % 10000000) / 100000);
  const th = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (cr) res += below1000(cr) + " Crore ";
  if (lk) res += below1000(lk) + " Lakh ";
  if (th) res += below1000(th) + " Thousand ";
  if (rest) res += below1000(rest);
  return res.trim();
}

function ord(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export interface InvoiceData {
  clientName: string;
  mobile?: string | null;
  address?: string | null;
  paymentIndex: number; // 1-based
  amount: number;
  date: string; // ISO or readable
  method?: string;
  invoiceNo?: number | null;
}

export function formatInvoiceNo(n?: number | null) {
  return `ISBI${String(n ?? 0).padStart(5, "0")}`;
}

export async function openInvoice(companyId: string, installmentId: string) {
  // Fetch company + all installments to compute ordinal index
  const [cRes, iRes] = await Promise.all([
    supabase.from("companies").select("name, client_name, phone, whatsapp, address").eq("id", companyId).single(),
    supabase.from("company_installments").select("id, amount, payment_date, created_at, payment_method, invoice_no").eq("company_id", companyId),
  ]);
  if (cRes.error || !cRes.data) throw new Error(cRes.error?.message || "Company not found");
  const company = cRes.data as { name: string; client_name: string | null; phone: string | null; whatsapp: string | null; address: string | null };
  const insts = (iRes.data ?? []).slice().sort((a: any, b: any) => {
    const ad = a.payment_date ?? a.created_at ?? "";
    const bd = b.payment_date ?? b.created_at ?? "";
    return ad.localeCompare(bd);
  });
  const idx = insts.findIndex((x: any) => x.id === installmentId);
  const inst = insts[idx];
  if (!inst) throw new Error("Installment not found");

  const data: InvoiceData = {
    clientName: company.client_name?.trim() || company.name,
    mobile: company.phone || company.whatsapp || "",
    address: company.address || "",
    paymentIndex: idx + 1,
    amount: Number(inst.amount || 0),
    date: inst.payment_date || inst.created_at || new Date().toISOString(),
    method: methodLabel((inst as any).payment_method),
    invoiceNo: (inst as any).invoice_no ?? null,
  };
  renderInvoiceWindow(data);
}


function renderInvoiceWindow(d: InvoiceData) {
  const dateStr = new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const amtStr = `${d.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}sr`;
  const words = `${numberToWords(d.amount)} SR`;
  const ordinal = ord(d.paymentIndex);

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>Invoice ${formatInvoiceNo(d.invoiceNo)} - ${escapeHtml(d.clientName)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #222; background: #f5f5f5; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 18mm 16mm; position: relative; display: flex; flex-direction: column; }
  .header { display: flex; align-items: center; gap: 16px; padding-bottom: 12px; border-bottom: 3px solid #3b82f6; }
  .shield { width: 64px; height: 64px; flex-shrink: 0; }
  .head-text { text-align: center; flex: 1; }
  .head-text h1 { margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 800; color: #1a1a1a; }
  .head-text p { margin: 4px 0 0; font-size: 12px; color: #333; }
  .date { text-align: right; color: #2563eb; font-size: 14px; margin-top: 32px; font-weight: 500; }
  .date .inv-no { display: inline-block; background: #2563eb; color: #fff; padding: 4px 12px; border-radius: 4px; font-weight: 700; font-size: 13px; letter-spacing: .5px; margin-bottom: 6px; }

  .invoice-to { margin-top: 18px; }
  .invoice-to .lbl { font-weight: 700; font-size: 14px; }
  .invoice-to .name { font-size: 20px; font-weight: 700; margin-top: 6px; }
  .invoice-to .line { font-size: 13px; margin-top: 4px; font-weight: 600; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 22px; }
  table.items thead th { background: #2563eb; color: #fff; padding: 10px 12px; font-size: 13px; text-align: left; font-weight: 600; letter-spacing: .5px; }
  table.items thead th.r { text-align: right; }
  table.items tbody td { padding: 12px; font-size: 13px; border: none; }
  table.items tbody tr:nth-child(odd) td { background: #dbeafe; }
  table.items tbody tr:nth-child(even) td { background: #eff6ff; }
  table.items tbody td.r { text-align: right; }
  .subtotal { margin-top: 12px; text-align: right; font-size: 14px; }
  .subtotal b { font-size: 15px; }
  .words { display: inline-block; background: #2563eb; color: #fff; padding: 8px 22px; margin-top: 10px; float: right; clear: both; font-size: 13px; font-weight: 500; }
  .clear { clear: both; }
  .footer-area { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 60px; position: relative; }
  .pay-method .pm-label { display: inline-block; background: #2563eb; color: #fff; padding: 6px 16px; font-weight: 700; font-size: 13px; letter-spacing: .5px; }
  .pay-method .pm-value { margin-top: 8px; font-weight: 700; font-size: 14px; }
  .pay-method .thanks { margin-top: 40px; border-top: 1px solid #999; padding-top: 6px; font-weight: 700; font-size: 13px; max-width: 220px; }
  .signature { text-align: center; }
  .signature .sig { font-family: 'Brush Script MT', cursive; font-size: 32px; color: #2563eb; }
  .signature .name { font-weight: 700; margin-top: 4px; border-top: 1px solid #999; padding-top: 4px; }
  .signature .title { font-size: 12px; color: #444; }
  .watermark { position: absolute; left: 50%; bottom: 22mm; transform: translateX(-50%); font-size: 60px; color: rgba(180,150,80,0.12); font-weight: 700; font-style: italic; pointer-events: none; }
  .bottom-bar { margin-top: 12px; border-top: 3px solid #3b82f6; padding-top: 12px; display: flex; justify-content: space-between; gap: 16px; font-size: 11px; color: #333; }
  .bottom-bar .col { display: flex; gap: 6px; align-items: flex-start; flex: 1; }
  .bottom-bar .ico { color: #2563eb; font-weight: 700; }
  .toolbar { position: fixed; top: 10px; right: 10px; z-index: 99; }
  .toolbar button { background: #2563eb; color: #fff; border: 0; padding: 10px 18px; font-size: 14px; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
  @media print { .toolbar { display: none; } body { background: #fff; } .page { box-shadow: none; padding: 14mm 14mm; } }
</style></head>
<body>
<div class="toolbar"><button onclick="window.print()">Print / Save PDF</button></div>
<div class="page">
  <div class="header">
    <svg class="shield" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6c46a"/><stop offset="1" stop-color="#a07a20"/></linearGradient></defs>
      <path d="M32 4 L58 14 V32 C58 46 46 56 32 60 C18 56 6 46 6 32 V14 Z" fill="url(#g)" stroke="#7a5b10" stroke-width="1"/>
      <path d="M20 32 L29 41 L46 24" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div class="head-text">
      <h1>INVESECURITY BUSNIESS INCUBETOR</h1>
      <p>Empowering Local Brands to Global | <b>CR:</b> 7051792260 | <b>Vat:</b> 314252983300003</p>
    </div>
  </div>

  <div class="date"><span class="inv-no">Invoice No: ${formatInvoiceNo(d.invoiceNo)}</span><br />${dateStr}</div>

  <div class="invoice-to">
    <div class="lbl">Invoice to :</div>
    <div class="name">Client Name: ${escapeHtml(d.clientName)}</div>
    ${d.mobile ? `<div class="line">Mobile : ${escapeHtml(d.mobile)}</div>` : ""}
    ${d.address ? `<div class="line">${escapeHtml(d.address)}</div>` : ""}
  </div>

  <table class="items">
    <thead><tr>
      <th style="width:50px">NO</th>
      <th>DESCRIPTION</th>
      <th style="width:70px">QTY</th>
      <th style="width:100px">PRICE</th>
      <th class="r" style="width:120px">TOTAL PAID</th>
    </tr></thead>
    <tbody>
      <tr><td>1</td><td>${ordinal} Payment</td><td></td><td></td><td class="r">${amtStr}</td></tr>
      <tr><td></td><td></td><td></td><td></td><td></td></tr>
      <tr><td></td><td></td><td></td><td></td><td></td></tr>
      <tr><td></td><td></td><td></td><td></td><td></td></tr>
      <tr><td></td><td></td><td></td><td></td><td></td></tr>
    </tbody>
  </table>

  <div class="subtotal">SubTotal: <b>${amtStr}</b></div>
  <div class="words">${words}</div>
  <div class="clear"></div>

  <div class="footer-area">
    <div class="pay-method">
      <div class="pm-label">PAYMENT METHOD :</div>
      <div class="pm-value">${escapeHtml(d.method || "In Cash")}</div>
      <div class="thanks">Thank you for business with us!</div>
    </div>
    <div class="signature">
      <div class="sig">Zahid Hassan</div>
      <div class="name">Zahid Hassan</div>
      <div class="title">Chief Executive Officer</div>
    </div>
    <div class="watermark">Invesecurity</div>
  </div>

  <div class="bottom-bar">
    <div class="col"><span class="ico">☎</span><span>+966571353340</span></div>
    <div class="col"><span class="ico">✉</span><span>contact@invesecurity.com</span></div>
    <div class="col"><span class="ico">⌖</span><span>Crystal Palace KSA, 3328 King Abdulaziz Rd, Al Murabba, Riyadh 12631, Saudi Arabia. WhatsApp: +966 571 353 340</span></div>
  </div>
</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("Please allow popups to view the invoice.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// ============================================================================
// Deal & Installments — Total breakdown statement PDF
// ============================================================================
export async function openDealSummary(companyId: string) {
  const [cRes, iRes, eRes] = await Promise.all([
    supabase.from("companies").select("name, client_name, phone, whatsapp, address, total_deal, discount").eq("id", companyId).single(),
    supabase.from("company_installments").select("id, amount, payment_date, note, created_at, payment_method").eq("company_id", companyId),
    supabase.from("company_extra_deals").select("id, amount, note, created_at").eq("company_id", companyId),
  ]);
  if (cRes.error || !cRes.data) throw new Error(cRes.error?.message || "Company not found");
  const company = cRes.data as any;
  const installments = (iRes.data ?? []).slice().sort((a: any, b: any) => {
    const ad = a.payment_date ?? a.created_at ?? "";
    const bd = b.payment_date ?? b.created_at ?? "";
    return ad.localeCompare(bd);
  });
  const extras = (eRes.data ?? []).slice().sort((a: any, b: any) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));

  const setupDeal = Number(company.total_deal || 0);
  const discount = Number(company.discount || 0);
  const extrasTotal = extras.reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
  const grossDeal = setupDeal + extrasTotal;
  const netDeal = grossDeal - discount;
  const received = installments.reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
  const due = netDeal - received;
  const pct = netDeal > 0 ? Math.round((received / netDeal) * 100) : 0;

  renderSummaryWindow({
    company: {
      name: (company.client_name && String(company.client_name).trim()) || company.name,
      mobile: company.phone || company.whatsapp || "",
      address: company.address || "",
    },
    setupDeal, discount, extras, extrasTotal, grossDeal, netDeal, received, due, pct,
    installments,
  });
}

interface SummaryPayload {
  company: { name: string; mobile: string; address: string };
  setupDeal: number;
  discount: number;
  extras: any[];
  extrasTotal: number;
  grossDeal: number;
  netDeal: number;
  received: number;
  due: number;
  pct: number;
  installments: any[];
}

function renderSummaryWindow(d: SummaryPayload) {
  const money = (n: number) => `${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SR`;
  const dateFmt = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const dueWords = `${numberToWords(Math.abs(d.due))} SR`;

  const extraRows = d.extras.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:#888;padding:14px">No extra deals</td></tr>`
    : d.extras.map((x: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(x.note || "Extra deal")}</td>
          <td>${dateFmt(x.created_at)}</td>
          <td class="r">${money(Number(x.amount || 0))}</td>
        </tr>`).join("");

  const instRows = d.installments.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:#888;padding:14px">No payments received</td></tr>`
    : d.installments.map((x: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(x.note || `Payment #${i + 1}`)} <span style="color:#64748b">(${escapeHtml(methodLabel(x.payment_method))})</span></td>
          <td>${dateFmt(x.payment_date || x.created_at)}</td>
          <td class="r">${money(Number(x.amount || 0))}</td>
        </tr>`).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>Statement - ${escapeHtml(d.company.name)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #222; background: #f5f5f5; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 16mm 14mm; position: relative; }
  .header { display: flex; align-items: center; gap: 16px; padding-bottom: 10px; border-bottom: 3px solid #3b82f6; }
  .shield { width: 60px; height: 60px; flex-shrink: 0; }
  .head-text { text-align: center; flex: 1; }
  .head-text h1 { margin: 0; font-size: 22px; letter-spacing: 1px; font-weight: 800; color: #1a1a1a; }
  .head-text p { margin: 4px 0 0; font-size: 11px; color: #333; }
  .title-bar { margin-top: 14px; display:flex; justify-content:space-between; align-items:flex-end; }
  .title-bar h2 { margin:0; font-size: 20px; color:#1e3a8a; letter-spacing:.5px; }
  .title-bar .meta { text-align:right; font-size:12px; color:#555; }
  .client { margin-top:12px; padding:10px 14px; background:#f1f5f9; border-left:4px solid #2563eb; border-radius:4px; }
  .client .name { font-size:16px; font-weight:700; }
  .client .line { font-size:12px; color:#555; margin-top:2px; }
  .stats { margin-top:14px; display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; }
  .stat { background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px; text-align:center; }
  .stat .lbl { font-size:10px; text-transform:uppercase; letter-spacing:.6px; color:#64748b; font-weight:600; }
  .stat .val { font-size:14px; font-weight:800; margin-top:4px; }
  .stat.deal .val { color:#1e3a8a; }
  .stat.disc .val { color:#d97706; }
  .stat.recv .val { color:#059669; }
  .stat.due .val { color:#dc2626; }
  .progress-wrap { margin-top:10px; }
  .progress-wrap .row { display:flex; justify-content:space-between; font-size:11px; color:#555; margin-bottom:4px; }
  .bar { height:8px; background:#e5e7eb; border-radius:99px; overflow:hidden; }
  .bar > div { height:100%; background:linear-gradient(90deg,#34d399,#059669); border-radius:99px; }
  h3.sec { margin: 16px 0 6px; font-size: 13px; color:#1e3a8a; text-transform:uppercase; letter-spacing:.6px; border-bottom:2px solid #dbeafe; padding-bottom:4px; }
  table { width:100%; border-collapse: collapse; font-size:12px; }
  table thead th { background:#2563eb; color:#fff; padding:8px 10px; text-align:left; font-weight:600; font-size:11px; letter-spacing:.4px; }
  table thead th.r { text-align:right; }
  table tbody td { padding:8px 10px; border-bottom:1px solid #eef2f7; }
  table tbody tr:nth-child(even) td { background:#f8fafc; }
  table tbody td.r { text-align:right; font-variant-numeric: tabular-nums; }
  .subtotal-row td { font-weight:700; background:#eff6ff !important; border-top:2px solid #bfdbfe; }
  .breakdown { margin-top:14px; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; }
  .breakdown table { font-size:12px; }
  .breakdown table td { padding:8px 12px; border-bottom:1px solid #eef2f7; }
  .breakdown table tr:last-child td { border-bottom:none; }
  .breakdown .label { color:#475569; }
  .breakdown .value { text-align:right; font-weight:700; font-variant-numeric: tabular-nums; }
  .breakdown .total td { background:#1e3a8a; color:#fff; font-size:14px; }
  .breakdown .due td { background:#fef2f2; color:#b91c1c; }
  .breakdown .recv td { background:#ecfdf5; color:#047857; }
  .words { margin-top:10px; text-align:right; font-size:11px; color:#555; font-style:italic; }
  .footer { margin-top:22px; padding-top:10px; border-top:2px solid #3b82f6; display:flex; justify-content:space-between; font-size:10px; color:#444; }
  .footer .sig { text-align:center; }
  .footer .sig .name { font-family:'Brush Script MT', cursive; font-size:24px; color:#2563eb; }
  .footer .sig .title { border-top:1px solid #999; padding-top:2px; margin-top:2px; font-weight:600; }
  .toolbar { position: fixed; top:10px; right:10px; z-index:99; display:flex; gap:8px; }
  .toolbar button { background:#2563eb; color:#fff; border:0; padding:10px 18px; font-size:14px; border-radius:6px; cursor:pointer; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
  @media print { .toolbar { display:none; } body { background:#fff; } .page { padding:12mm 12mm; } }
</style></head>
<body>
<div class="toolbar"><button onclick="window.print()">Print / Save PDF</button></div>
<div class="page">
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
  </div>

  <div class="title-bar">
    <h2>Deal &amp; Installments Statement</h2>
    <div class="meta"><b>Date:</b> ${today}</div>
  </div>

  <div class="client">
    <div class="name">${escapeHtml(d.company.name)}</div>
    ${d.company.mobile ? `<div class="line">Mobile: ${escapeHtml(d.company.mobile)}</div>` : ""}
    ${d.company.address ? `<div class="line">${escapeHtml(d.company.address)}</div>` : ""}
  </div>

  <div class="stats">
    <div class="stat deal"><div class="lbl">Gross Deal</div><div class="val">${money(d.grossDeal)}</div></div>
    <div class="stat disc"><div class="lbl">Discount</div><div class="val">${d.discount > 0 ? "− " : ""}${money(d.discount)}</div></div>
    <div class="stat recv"><div class="lbl">Received</div><div class="val">${money(d.received)}</div></div>
    <div class="stat due"><div class="lbl">Due</div><div class="val">${money(d.due)}</div></div>
  </div>

  <div class="progress-wrap">
    <div class="row"><span>Net Payable: <b>${money(d.netDeal)}</b></span><span><b>${d.pct}%</b> collected</span></div>
    <div class="bar"><div style="width:${d.pct}%"></div></div>
  </div>

  <h3 class="sec">Company Setup Deal</h3>
  <table>
    <thead><tr><th style="width:44px">#</th><th>Description</th><th style="width:110px">Date</th><th class="r" style="width:130px">Amount</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>Company setup deal</td><td>—</td><td class="r">${money(d.setupDeal)}</td></tr>
    </tbody>
  </table>

  <h3 class="sec">Extra Deals (${d.extras.length})</h3>
  <table>
    <thead><tr><th style="width:44px">#</th><th>Description</th><th style="width:110px">Date</th><th class="r" style="width:130px">Amount</th></tr></thead>
    <tbody>
      ${extraRows}
      <tr class="subtotal-row"><td colspan="3" class="r">Extras Subtotal</td><td class="r">${money(d.extrasTotal)}</td></tr>
    </tbody>
  </table>

  <h3 class="sec">Payments Received (${d.installments.length})</h3>
  <table>
    <thead><tr><th style="width:44px">#</th><th>Description</th><th style="width:110px">Date</th><th class="r" style="width:130px">Amount</th></tr></thead>
    <tbody>
      ${instRows}
      <tr class="subtotal-row"><td colspan="3" class="r">Total Received</td><td class="r">${money(d.received)}</td></tr>
    </tbody>
  </table>

  <h3 class="sec">Total Breakdown</h3>
  <div class="breakdown">
    <table>
      <tr><td class="label">Company Setup Deal</td><td class="value">${money(d.setupDeal)}</td></tr>
      <tr><td class="label">(+) Extra Deals (${d.extras.length})</td><td class="value">${money(d.extrasTotal)}</td></tr>
      <tr><td class="label"><b>Gross Deal</b></td><td class="value">${money(d.grossDeal)}</td></tr>
      <tr><td class="label">(−) Discount</td><td class="value" style="color:#d97706">− ${money(d.discount)}</td></tr>
      <tr class="total"><td>Net Payable</td><td class="value">${money(d.netDeal)}</td></tr>
      <tr class="recv"><td class="label">(−) Total Received</td><td class="value">− ${money(d.received)}</td></tr>
      <tr class="due"><td><b>Balance Due</b></td><td class="value">${money(d.due)}</td></tr>
    </table>
  </div>

  <div class="words">In words: <b>${dueWords}</b> ${d.due < 0 ? "(overpaid)" : d.due === 0 ? "(fully settled)" : "due"}</div>

  <div class="footer">
    <div>
      <div><b>☎</b> +966 571 353 340 &nbsp;·&nbsp; <b>✉</b> contact@invesecurity.com</div>
      <div style="margin-top:2px">Crystal Palace KSA, 3328 King Abdulaziz Rd, Al Murabba, Riyadh 12631, Saudi Arabia</div>
    </div>
    <div class="sig">
      <div class="name">Zahid Hassan</div>
      <div class="title">Chief Executive Officer</div>
    </div>
  </div>
</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Please allow popups to view the statement."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

