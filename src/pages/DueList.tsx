import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, Search, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { compareCompanies } from "@/lib/companySort";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface DueItem {
  id: string;
  name: string;
  branch: string;
  due: number;
  deal: number;
  received: number;
  periodReceived: number;
}

const fmt = (n: number) =>
  `${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SR`;

export default function DueList() {
  const { role, branchId } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<DueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("due_desc");
  const [dayFilter, setDayFilter] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const [companies, setCompanies] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [extras, setExtras] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const restrictToBranch = role !== "admin" && !!branchId;
      let cq = supabase
        .from("companies")
        .select("id, name, total_deal, discount, branch_id, branches!companies_branch_id_fkey(name)")
        .eq("status", "active");
      if (restrictToBranch) cq = cq.eq("branch_id", branchId as string);

      const [c, i, e] = await Promise.all([
        cq,
        supabase.from("company_installments").select("company_id, amount, payment_date"),
        supabase.from("company_extra_deals").select("company_id, amount"),
      ]);

      if (c.error) {
        setLoading(false);
        return;
      }
      setCompanies((c.data as any[]) ?? []);
      setInstallments((i.data as any[]) ?? []);
      setExtras((e.data as any[]) ?? []);
      setLoading(false);
    };
    load();
  }, [role, branchId]);

  const dateFilterActive = !!dayFilter || !!monthFilter || !!fromDate || !!toDate;

  useEffect(() => {
    const allowedIds = new Set(companies.map((x) => x.id));

    const instMap: Record<string, number> = {};
    const periodMap: Record<string, number> = {};
    installments
      .filter((x) => allowedIds.has(x.company_id))
      .forEach((x) => {
        const amt = Number(x.amount || 0);
        instMap[x.company_id] = (instMap[x.company_id] ?? 0) + amt;
        const d = (x.payment_date ?? "").slice(0, 10);
        if (dayFilter && d !== dayFilter) return;
        if (monthFilter && d.slice(0, 7) !== monthFilter) return;
        if (fromDate && d < fromDate) return;
        if (toDate && d > toDate) return;
        periodMap[x.company_id] = (periodMap[x.company_id] ?? 0) + amt;
      });

    const extraMap: Record<string, number> = {};
    extras
      .filter((x) => allowedIds.has(x.company_id))
      .forEach((x) => {
        extraMap[x.company_id] = (extraMap[x.company_id] ?? 0) + Number(x.amount || 0);
      });

    const dues = companies
      .map((x) => {
        const deal = Number(x.total_deal || 0) + (extraMap[x.id] ?? 0);
        const net = deal - Number(x.discount || 0);
        const received = instMap[x.id] ?? 0;
        return {
          id: x.id,
          name: x.name,
          branch: x.branches?.name ?? "—",
          deal: net,
          received,
          periodReceived: periodMap[x.id] ?? 0,
          due: net - received,
        };
      })
      .filter((x) => x.due > 0);

    setItems(dues);
  }, [companies, installments, extras, dayFilter, monthFilter, fromDate, toDate]);

  const branchTabs = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((i) => m.set(i.branch, (m.get(i.branch) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const filtered = useMemo(() => {
    let arr = items.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()));
    if (branchFilter !== "all") arr = arr.filter((i) => i.branch === branchFilter);
    arr = [...arr].sort((a, b) => {
      switch (sortBy) {
        case "name_asc": return a.name.localeCompare(b.name);
        case "name_desc": return b.name.localeCompare(a.name);
        case "received_desc": return b.received - a.received;
        case "deal_desc": return b.deal - a.deal;
        case "due_desc": return b.due - a.due;
        default: return compareCompanies(a, b);
      }
    });
    return arr;
  }, [items, q, branchFilter, sortBy]);

  const total = useMemo(() => filtered.reduce((s, i) => s + i.due, 0), [filtered]);
  const totalDeal = useMemo(() => filtered.reduce((s, i) => s + i.deal, 0), [filtered]);
  const totalReceived = useMemo(() => filtered.reduce((s, i) => s + i.received, 0), [filtered]);
  const totalPeriod = useMemo(() => filtered.reduce((s, i) => s + i.periodReceived, 0), [filtered]);

  const generatePdf = () => {
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text("Due List Report", 14, 16);
      doc.setFontSize(9);
      const parts: string[] = [];
      if (branchFilter !== "all") parts.push(`Branch: ${branchFilter}`);
      if (dayFilter) parts.push(`Day: ${dayFilter}`);
      if (monthFilter) parts.push(`Month: ${monthFilter}`);
      if (fromDate || toDate) parts.push(`Range: ${fromDate || "beginning"} → ${toDate || "today"}`);
      parts.push(`Generated: ${new Date().toLocaleString()}`);
      doc.text(parts.join("   |   "), 14, 22);

      autoTable(doc, {
        startY: 28,
        head: [["#", "Company", "Branch", "Net Deal", "Received (All time)", dateFilterActive ? "Received (Period)" : "Received", "Due"]],
        body: filtered.map((c, idx) => [
          String(idx + 1),
          c.name,
          c.branch,
          fmt(c.deal),
          fmt(c.received),
          fmt(dateFilterActive ? c.periodReceived : c.received),
          fmt(c.due),
        ]),
        foot: [[
          "", "Total", "", fmt(totalDeal), fmt(totalReceived),
          fmt(dateFilterActive ? totalPeriod : totalReceived), fmt(total),
        ]],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 41, 59] },
        footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: "bold" },
      });

      doc.output("dataurlnewwindow");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate PDF");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Due List</h1>
          <p className="text-sm text-muted-foreground">
            Outstanding balances across active companies
          </p>
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2">
          <div className="text-[11px] font-semibold uppercase text-destructive/80">Total Due</div>
          <div className="text-lg font-bold text-destructive">{fmt(total)}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search company…"
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="due_desc">💰 Highest Due</SelectItem>
            <SelectItem value="name_asc">A–Z</SelectItem>
            <SelectItem value="name_desc">Z–A</SelectItem>
            <SelectItem value="received_desc">✅ Most Received</SelectItem>
            <SelectItem value="deal_desc">📊 Biggest Deal</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} className="sm:w-44" title="Filter by payment day" />
        <Input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="sm:w-40" title="Filter by payment month" />
        <div className="flex items-center gap-1">
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="sm:w-40" title="From date" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="sm:w-40" title="To date" />
        </div>
        <Button variant="outline" className="gap-1.5" onClick={generatePdf}>
          <FileText className="h-4 w-4" /> Generate PDF
        </Button>
        {dateFilterActive && (
          <Button variant="outline" onClick={() => { setDayFilter(""); setMonthFilter(""); setFromDate(""); setToDate(""); }}>
            Clear date
          </Button>
        )}
      </div>

      {dateFilterActive && (
        <p className="-mt-3 text-xs text-muted-foreground">
          Period received column shows payments {dayFilter ? `on ${dayFilter}` : ""}{dayFilter && monthFilter ? " and " : ""}{monthFilter ? `in ${monthFilter}` : ""}
          {(fromDate || toDate) ? `${dayFilter || monthFilter ? " and " : ""}from ${fromDate || "beginning"} to ${toDate || "today"}` : ""} only. Due stays lifetime.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setBranchFilter("all")}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            branchFilter === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-muted"
          )}
        >
          All <span className="opacity-70">({items.length})</span>
        </button>
        {branchTabs.map(([name, count]) => (
          <button
            key={name}
            onClick={() => setBranchFilter(name)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              branchFilter === name
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted"
            )}
          >
            {name} <span className="opacity-70">({count})</span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr className="text-left text-xs font-semibold uppercase text-muted-foreground">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3 text-right">Net Deal</th>
              <th className="px-4 py-3 text-right">Received</th>
              {dateFilterActive && <th className="px-4 py-3 text-right">Received (Period)</th>}
              <th className="px-4 py-3 text-right">Due</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  <AlertCircle className="mx-auto mb-2 h-5 w-5" />
                  No outstanding dues.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => nav(`/company/${c.id}`)}
                  className="cursor-pointer border-t border-border transition-colors hover:bg-secondary/50"
                >
                  <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.branch}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(c.deal)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(c.received)}</td>
                  {dateFilterActive && (
                    <td className="px-4 py-3 text-right tabular-nums text-primary">{fmt(c.periodReceived)}</td>
                  )}
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-destructive">
                    {fmt(c.due)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
