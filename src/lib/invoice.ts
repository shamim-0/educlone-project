import { supabase } from "@/integrations/supabase/client";

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
}

export async function openInvoice(companyId: string, installmentId: string) {
  // Fetch company + all installments to compute ordinal index
  const [cRes, iRes] = await Promise.all([
    supabase.from("companies").select("name, phone, whatsapp, address").eq("id", companyId).single(),
    supabase.from("company_installments").select("id, amount, payment_date, created_at").eq("company_id", companyId),
  ]);
  if (cRes.error || !cRes.data) throw new Error(cRes.error?.message || "Company not found");
  const company = cRes.data as { name: string; phone: string | null; whatsapp: string | null; address: string | null };
  const insts = (iRes.data ?? []).slice().sort((a: any, b: any) => {
    const ad = a.payment_date ?? a.created_at ?? "";
    const bd = b.payment_date ?? b.created_at ?? "";
    return ad.localeCompare(bd);
  });
  const idx = insts.findIndex((x: any) => x.id === installmentId);
  const inst = insts[idx];
  if (!inst) throw new Error("Installment not found");

  const data: InvoiceData = {
    clientName: company.name,
    mobile: company.phone || company.whatsapp || "",
    address: company.address || "",
    paymentIndex: idx + 1,
    amount: Number(inst.amount || 0),
    date: inst.payment_date || inst.created_at || new Date().toISOString(),
    method: "In Cash",
  };
  renderInvoiceWindow(data);
}

function renderInvoiceWindow(d: InvoiceData) {
  const dateStr = new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const amtStr = `${d.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}sr`;
  const words = `${numberToWords(d.amount)} SR`;
  const ordinal = ord(d.paymentIndex);

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>Invoice - ${escapeHtml(d.clientName)}</title>
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

  <div class="date">${dateStr}</div>

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
