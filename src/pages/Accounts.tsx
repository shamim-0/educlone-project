import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Wallet, TrendingUp, AlertCircle, Search, Pencil, Plus, Trash2, Save,
  Calendar, Receipt, Percent, Building2, ArrowDownRight, FileText,
} from "lucide-react";
import { openInvoice, openDealSummary, openRangeStatement, PAYMENT_METHODS, methodLabel } from "@/lib/invoice";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Company {
  id: string;
  name: string;
  type: string;
  total_deal: number;
  discount: number;
  branch_id: string | null;
  branches?: { name: string } | null;
}
interface Installment {
  id: string;
  company_id: string;
  amount: number;
  payment_date: string | null;
  note: string | null;
  payment_method?: string | null;
}
interface ExtraDeal {
  id: string;
  company_id: string;
  note: string;
  amount: number;
  created_at?: string;
}

const fmt = (n: number) =>
  `${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SR`;

/** Animated progress bar with smooth fill transition */
function AnimatedProgress({
  value,
  className = "",
  barClassName = "bg-primary",
}: { value: number; className?: string; barClassName?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setV(Math.max(0, Math.min(100, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <div className={`relative h-2.5 w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <div
        className={`h-full rounded-full ${barClassName} transition-[width] duration-[1200ms] ease-out`}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export default function AccountsPage() {
  const { role, accountsAccess, branchId, username: myUsername } = useAuth();
  const profileNames = useProfileNames();
  const adminTitle = (name?: string | null, at?: string | null, verb?: string) =>
    role === "admin" ? auditTitle(name, at, verb) : undefined;
  // Admin always writes. Editor writes only if accounts access is granted. Viewer is read-only.
  const canWrite = role === "admin" || ((role === "editor" || role === "sub_admin") && accountsAccess);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [extraDeals, setExtraDeals] = useState<ExtraDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [dayFilter, setDayFilter] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("default");

  const [openCompany, setOpenCompany] = useState<Company | null>(null);
  const [editingSetup, setEditingSetup] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [dealAmount, setDealAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountMode, setDiscountMode] = useState<"sr" | "pct">("sr");
  const [savingDeal, setSavingDeal] = useState(false);

  const [instOpen, setInstOpen] = useState(false);
  const [editingInst, setEditingInst] = useState<Installment | null>(null);
  const [instAmount, setInstAmount] = useState("");
  const [instDate, setInstDate] = useState("");
  const [instNote, setInstNote] = useState("");
  const [instMethod, setInstMethod] = useState("cash");
  const [savingInst, setSavingInst] = useState(false);

  const [extraOpen, setExtraOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState<ExtraDeal | null>(null);
  const [extraAmount, setExtraAmount] = useState("");
  const [extraNote, setExtraNote] = useState("");
  const [savingExtra, setSavingExtra] = useState(false);

  const load = async () => {
    setLoading(true);
    const restrictToBranch = role !== "admin" && !!branchId;
    let cq = supabase
      .from("companies")
      .select("id, name, type, total_deal, discount, branch_id, branches!companies_branch_id_fkey(name)")
      .order("name");
    if (restrictToBranch) cq = cq.eq("branch_id", branchId as string);
    const [c, i, e] = await Promise.all([
      cq,
      supabase.from("company_installments").select("*"),
      supabase.from("company_extra_deals").select("*").order("created_at", { ascending: false }),
    ]);
    if (c.error) toast.error(c.error.message);
    const cList = (c.data as Company[]) ?? [];
    setCompanies(cList);
    const allowedIds = new Set(cList.map((x) => x.id));
    const instList = ((i.data as Installment[]) ?? []).filter((x) => !restrictToBranch || allowedIds.has(x.company_id));
    setInstallments(instList);
    const extraList = ((e.data as ExtraDeal[]) ?? []).filter((x) => !restrictToBranch || allowedIds.has(x.company_id));
    setExtraDeals(extraList);
    setLoading(false);
  };

  useEffect(() => { document.title = "Accounts | ISBI Tracker"; load(); }, []);

  /** installments limited to the selected day / month (payment_date based) */
  const dateFilterActive = !!dayFilter || !!monthFilter || !!fromDate || !!toDate;
  const periodInstallments = useMemo(() => {
    if (!dateFilterActive) return installments;
    return installments.filter((x) => {
      if (!x.payment_date) return false;
      const d = String(x.payment_date).slice(0, 10);
      if (dayFilter && d !== dayFilter) return false;
      if (monthFilter && d.slice(0, 7) !== monthFilter) return false;
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }, [installments, dayFilter, monthFilter, fromDate, toDate, dateFilterActive]);

  const receivedByCompany = useMemo(() => {
    const map: Record<string, number> = {};
    periodInstallments.forEach((x) => { map[x.company_id] = (map[x.company_id] ?? 0) + Number(x.amount || 0); });
    return map;
  }, [periodInstallments]);

  const extrasByCompany = useMemo(() => {
    const map: Record<string, number> = {};
    extraDeals.forEach((x) => { map[x.company_id] = (map[x.company_id] ?? 0) + Number(x.amount || 0); });
    return map;
  }, [extraDeals]);

  const dealOf = (c: Company) => Number(c.total_deal || 0) + (extrasByCompany[c.id] ?? 0);

  const branchTabs = useMemo(() => {
    const map = new Map<string, number>();
    companies.forEach((c) => {
      const name = c.branches?.name ?? "—";
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [companies]);

  const extractCode = (name: string) => {
    const m = name.match(/ISBI[A-Z]*(\d+)/i);
    return m ? parseInt(m[1], 10) : -1;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = companies;
    if (branchFilter !== "all") arr = arr.filter((c) => (c.branches?.name ?? "—") === branchFilter);
    if (q) arr = arr.filter((c) => c.name.toLowerCase().includes(q));
    if (dateFilterActive) {
      const ids = new Set(periodInstallments.map((x) => x.company_id));
      arr = arr.filter((c) => ids.has(c.id));
    }
    const sorted = [...arr];
    switch (sortBy) {
      case "name_asc": return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "name_desc": return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case "due_desc": return sorted.sort((a, b) => {
        const ad = (dealOf(a) - Number(a.discount||0)) - (receivedByCompany[a.id] ?? 0);
        const bd = (dealOf(b) - Number(b.discount||0)) - (receivedByCompany[b.id] ?? 0);
        return bd - ad;
      });
      case "received_desc": return sorted.sort((a, b) => (receivedByCompany[b.id] ?? 0) - (receivedByCompany[a.id] ?? 0));
      case "deal_desc": return sorted.sort((a, b) => dealOf(b) - dealOf(a));
      default:
        return sorted.sort((a, b) => {
          const ac = extractCode(a.name);
          const bc = extractCode(b.name);
          if (ac !== bc) return bc - ac;
          return b.name.localeCompare(a.name);
        });
    }
  }, [companies, search, branchFilter, sortBy, receivedByCompany, extrasByCompany, dateFilterActive, periodInstallments]);

  const totals = useMemo(() => {
    const baseDeal = filtered.reduce((s, c) => s + Number(c.total_deal || 0), 0);
    const extras = filtered.reduce((s, c) => s + (extrasByCompany[c.id] ?? 0), 0);
    const deal = baseDeal + extras;
    const discount = filtered.reduce((s, c) => s + Number(c.discount || 0), 0);
    const received = filtered.reduce((s, c) => s + (receivedByCompany[c.id] ?? 0), 0);
    const net = deal - discount;
    return { deal, discount, received, net, due: net - received, extras };
  }, [filtered, receivedByCompany, extrasByCompany]);

  const companyInstallments = useMemo(
    () => (openCompany ? installments.filter((x) => x.company_id === openCompany.id) : []),
    [installments, openCompany],
  );

  const companyExtras = useMemo(
    () => (openCompany ? extraDeals.filter((x) => x.company_id === openCompany.id) : []),
    [extraDeals, openCompany],
  );

  const oBaseDeal = Number(openCompany?.total_deal || 0);
  const oExtras = openCompany ? (extrasByCompany[openCompany.id] ?? 0) : 0;
  const oDeal = oBaseDeal + oExtras;
  const oDisc = Number(openCompany?.discount || 0);
  const oNet = oDeal - oDisc;
  const oRecv = openCompany ? (receivedByCompany[openCompany.id] ?? 0) : 0;
  const oDue = oNet - oRecv;
  const oPct = oNet > 0 ? Math.min(100, Math.round((oRecv / oNet) * 100)) : 0;

  const collectedPct = totals.net > 0 ? Math.min(100, Math.round((totals.received / totals.net) * 100)) : 0;

  function openManage(c: Company) {
    setOpenCompany(c);
    setDealAmount(String(c.total_deal ?? 0));
    setDiscountAmount(String(c.discount ?? 0));
    setDiscountMode("sr");
    setEditingSetup(false);
    setEditingDiscount(false);
  }

  async function saveSetup() {
    if (!openCompany) return;
    const v = Number(dealAmount);
    if (Number.isNaN(v) || v < 0) { toast.error("Invalid deal amount"); return; }
    const disc = Number(openCompany.discount || 0);
    if (disc > v) { toast.error("Discount currently exceeds the new deal amount"); return; }
    setSavingDeal(true);
    const { error } = await supabase
      .from("companies")
      .update({ total_deal: v })
      .eq("id", openCompany.id);
    setSavingDeal(false);
    if (error) return toast.error(error.message);
    setCompanies((prev) => prev.map((c) => c.id === openCompany.id ? { ...c, total_deal: v } : c));
    setOpenCompany({ ...openCompany, total_deal: v });
    setEditingSetup(false);
    toast.success("Company setup deal updated");
  }

  async function saveDiscount() {
    if (!openCompany) return;
    const v = Number(openCompany.total_deal || 0);
    const d = Number(discountAmount);
    if (Number.isNaN(d) || d < 0) { toast.error("Invalid discount"); return; }
    let discSr = d;
    if (discountMode === "pct") {
      if (d > 100) { toast.error("Discount % cannot exceed 100"); return; }
      discSr = +(v * d / 100).toFixed(2);
    }
    if (discSr > v) { toast.error("Discount cannot exceed deal amount"); return; }
    setSavingDeal(true);
    const { error } = await supabase
      .from("companies")
      .update({ discount: discSr })
      .eq("id", openCompany.id);
    setSavingDeal(false);
    if (error) return toast.error(error.message);
    setCompanies((prev) => prev.map((c) => c.id === openCompany.id ? { ...c, discount: discSr } : c));
    setOpenCompany({ ...openCompany, discount: discSr });
    setDiscountAmount(String(discSr));
    setDiscountMode("sr");
    setEditingDiscount(false);
    toast.success("Discount updated");
  }

  function openAddInst() {
    setEditingInst(null);
    setInstAmount("");
    setInstDate(new Date().toISOString().slice(0, 10));
    setInstNote("");
    setInstMethod("cash");
    setInstOpen(true);
  }

  function openEditInst(x: Installment) {
    setEditingInst(x);
    setInstAmount(String(x.amount));
    setInstDate(x.payment_date ? x.payment_date.slice(0, 10) : "");
    setInstNote(x.note ?? "");
    setInstMethod(x.payment_method || "cash");
    setInstOpen(true);
  }

  async function saveInst() {
    if (!openCompany) return;
    const v = Number(instAmount);
    if (Number.isNaN(v) || v <= 0) { toast.error("Enter amount"); return; }
    setSavingInst(true);
    const payload = {
      company_id: openCompany.id,
      amount: v,
      payment_date: instDate ? new Date(instDate).toISOString() : null,
      note: instNote.trim() || null,
      payment_method: instMethod,
    };
    if (editingInst) {
      const { data, error } = await supabase
        .from("company_installments").update(payload).eq("id", editingInst.id).select().single();
      setSavingInst(false);
      if (error) return toast.error(error.message);
      setInstallments((prev) => prev.map((x) => x.id === editingInst.id ? (data as Installment) : x));
    } else {
      const { data: authData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("company_installments")
        .insert({ ...payload, created_by: authData.user?.id ?? null })
        .select().single();
      setSavingInst(false);
      if (error) return toast.error(error.message);
      setInstallments((prev) => [...prev, data as Installment]);
    }
    setInstOpen(false);
    toast.success("Saved");
  }

  async function deleteInst(x: Installment) {
    if (!confirm("Delete this installment?")) return;
    const { error } = await supabase.from("company_installments").delete().eq("id", x.id);
    if (error) return toast.error(error.message);
    setInstallments((prev) => prev.filter((i) => i.id !== x.id));
    toast.success("Deleted");
  }

  function openAddExtra() {
    setEditingExtra(null);
    setExtraAmount("");
    setExtraNote("");
    setExtraOpen(true);
  }
  function openEditExtra(x: ExtraDeal) {
    setEditingExtra(x);
    setExtraAmount(String(x.amount));
    setExtraNote(x.note ?? "");
    setExtraOpen(true);
  }
  async function saveExtra() {
    if (!openCompany) return;
    const v = Number(extraAmount);
    if (Number.isNaN(v) || v <= 0) { toast.error("Enter amount"); return; }
    if (!extraNote.trim()) { toast.error("Enter note"); return; }
    setSavingExtra(true);
    const payload = { company_id: openCompany.id, amount: v, note: extraNote.trim(), updated_by: myUsername ?? null };
    if (editingExtra) {
      const { data, error } = await supabase
        .from("company_extra_deals").update(payload as any).eq("id", editingExtra.id).select().single();
      setSavingExtra(false);
      if (error) return toast.error(error.message);
      setExtraDeals((prev) => prev.map((x) => x.id === editingExtra.id ? (data as ExtraDeal) : x));
    } else {
      const { data, error } = await supabase
        .from("company_extra_deals").insert(payload as any).select().single();
      setSavingExtra(false);
      if (error) return toast.error(error.message);
      setExtraDeals((prev) => [data as ExtraDeal, ...prev]);
    }
    setExtraOpen(false);
    toast.success("Saved");
  }
  async function deleteExtra(x: ExtraDeal) {
    if (!confirm("Delete this extra deal?")) return;
    const { error } = await supabase.from("company_extra_deals").delete().eq("id", x.id);
    if (error) return toast.error(error.message);
    setExtraDeals((prev) => prev.filter((i) => i.id !== x.id));
    toast.success("Deleted");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-10 -bottom-16 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary/80 font-semibold">
              <Wallet className="h-3.5 w-3.5" /> Finance · Accounts
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-display font-bold tracking-tight">Accounts Management</h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              A unified ledger of every company's deal value, discounts, payments received and dues outstanding.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-background/70 backdrop-blur px-4 py-3 border shadow-sm">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Collected</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{collectedPct}%</p>
            </div>
            <div className="w-24">
              <AnimatedProgress value={collectedPct} barClassName="bg-gradient-to-r from-emerald-400 to-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Deal"
          value={fmt(totals.deal)}
          accent="primary"
          icon={<Wallet className="h-5 w-5" />}
          hint={`${companies.length} companies`}
        />
        <StatCard
          label="Total Discount"
          value={fmt(totals.discount)}
          accent="amber"
          icon={<Percent className="h-5 w-5" />}
          hint={`Net: ${fmt(totals.net)}`}
        />
        <StatCard
          label="Total Received"
          value={fmt(totals.received)}
          accent="emerald"
          icon={<TrendingUp className="h-5 w-5" />}
          progress={collectedPct}
        />
        <StatCard
          label="Total Due"
          value={fmt(totals.due)}
          accent="rose"
          icon={<AlertCircle className="h-5 w-5" />}
          progress={100 - collectedPct}
        />
      </div>

      {/* Search + Table */}
      <Card className="p-6 shadow-card border-border/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold">Companies Ledger</h2>
              <p className="text-xs text-muted-foreground">{filtered.length} of {companies.length} shown</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto lg:justify-end min-w-0">

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search company by name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">🚨 Priority (default)</SelectItem>
                <SelectItem value="name_asc">A–Z</SelectItem>
                <SelectItem value="name_desc">Z–A</SelectItem>
                <SelectItem value="due_desc">💰 Highest Due</SelectItem>
                <SelectItem value="received_desc">✅ Most Received</SelectItem>
                <SelectItem value="deal_desc">📊 Biggest Deal</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              className="sm:w-44"
              title="Filter by payment day"
            />
            <Input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="sm:w-40"
              title="Filter by payment month"
            />
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="sm:w-40"
                title="From date"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="sm:w-40"
                title="To date"
              />
            </div>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                const nameById = new Map(companies.map((c) => [c.id, c.name] as const));
                const ids = new Set(filtered.map((c) => c.id));
                openRangeStatement({
                  from: fromDate || undefined,
                  to: toDate || undefined,
                  branch: branchFilter,
                  rows: periodInstallments
                    .filter((x) => ids.has(x.company_id))
                    .map((x) => ({
                      companyName: nameById.get(x.company_id) ?? "—",
                      invoiceNo: (x as any).invoice_no ?? null,
                      date: x.payment_date,
                      method: x.payment_method,
                      note: x.note,
                      amount: Number(x.amount || 0),
                    })),
                });
              }}
            >
              <FileText className="h-4 w-4" /> Statement PDF
            </Button>
            {(dayFilter || monthFilter || fromDate || toDate) && (
              <Button variant="outline" onClick={() => { setDayFilter(""); setMonthFilter(""); setFromDate(""); setToDate(""); }}>
                Clear date
              </Button>
            )}
          </div>
        </div>
        {(dayFilter || monthFilter || fromDate || toDate) && (
          <p className="-mt-3 mb-4 text-xs text-muted-foreground">
            Showing payments {dayFilter ? `on ${dayFilter}` : ""}{dayFilter && monthFilter ? " and " : ""}{monthFilter ? `in ${monthFilter}` : ""}
            {(fromDate || toDate) ? `${dayFilter || monthFilter ? " and " : ""}from ${fromDate || "beginning"} to ${toDate || "today"}` : ""} only.
          </p>
        )}

        {/* Branch tabs */}
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            onClick={() => setBranchFilter("all")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium border transition-colors",
              branchFilter === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted"
            )}
          >
            All <span className="opacity-70">({companies.length})</span>
          </button>
          {branchTabs.map(([name, count]) => (
            <button
              key={name}
              onClick={() => setBranchFilter(name)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium border transition-colors",
                branchFilter === name
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-muted"
              )}
            >
              {name} <span className="opacity-70">({count})</span>
            </button>
          ))}
        </div>



        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-14 text-center">#</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Deal</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead className="w-44">Progress</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">No companies found.</TableCell></TableRow>
              ) : filtered.map((c, idx) => {
                const baseDeal = Number(c.total_deal || 0);
                const extra = extrasByCompany[c.id] ?? 0;
                const deal = baseDeal + extra;
                const disc = Number(c.discount || 0);
                const net = deal - disc;
                const received = receivedByCompany[c.id] ?? 0;
                const due = net - received;
                const pct = net > 0 ? Math.min(100, Math.round((received / net) * 100)) : 0;
                return (
                  <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      <Badge variant="secondary" className="capitalize mt-1 text-[10px]">{c.type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.branches?.name ?? "—"}</TableCell>
                    <TableCell className="text-right font-semibold text-primary tabular-nums">
                      {fmt(deal)}
                      {extra > 0 && (
                        <div className="text-[10px] font-normal text-muted-foreground">+ {fmt(extra)} extra</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-amber-600 dark:text-amber-400 tabular-nums">
                      {disc > 0 ? `− ${fmt(disc)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(received)}</TableCell>
                    <TableCell className={`text-right font-semibold tabular-nums ${due > 0 ? "text-destructive" : "text-muted-foreground"}`}>{fmt(due)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AnimatedProgress
                          value={pct}
                          barClassName={
                            pct >= 100 ? "bg-emerald-500" :
                            pct >= 50 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
                            "bg-gradient-to-r from-amber-400 to-primary"
                          }
                        />
                        <span className="text-[11px] font-medium text-muted-foreground tabular-nums w-9 text-right">{pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openManage(c)} className="gap-1 hover-scale">
                        <Receipt className="h-3.5 w-3.5" /> Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Manage Deal Dialog */}
      <Dialog open={!!openCompany} onOpenChange={(o) => !o && setOpenCompany(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Deal & Installments: {openCompany?.name}
              </span>
              {openCompany && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mr-6 gap-1.5"
                  onClick={() => openDealSummary(openCompany.id).catch((e) => toast.error(e.message || "Failed to generate PDF"))}
                >
                  <FileText className="h-4 w-4" />
                  Generate PDF
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>


          {openCompany && (
            <div className="space-y-5">
              {/* Stats */}
              <Card className="p-5 bg-gradient-to-br from-muted/40 to-transparent border-border/60">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <MiniStat label="Deal" value={fmt(oDeal)} tone="primary" />
                  <MiniStat label="Discount" value={oDisc > 0 ? `− ${fmt(oDisc)}` : fmt(0)} tone="amber" />
                  <MiniStat label="Received" value={fmt(oRecv)} tone="emerald" />
                  <MiniStat label="Due" value={fmt(oDue)} tone="rose" />
                </div>
                <div className="mt-5">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Net: <span className="text-foreground font-semibold">{fmt(oNet)}</span></span>
                    <span className="font-semibold">{oPct}% collected</span>
                  </div>
                  <AnimatedProgress
                    value={oPct}
                    barClassName="bg-gradient-to-r from-emerald-400 to-emerald-600"
                  />
                </div>
              </Card>

              {/* Company setup deal */}
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Company setup deal</h3>
                  </div>
                  {canWrite && !editingSetup && (
                    <Button size="sm" variant="outline" onClick={() => setEditingSetup(true)}>Edit</Button>
                  )}
                </div>
                {editingSetup ? (
                  <div className="mt-3 space-y-3">
                    <div>
                      <Label htmlFor="dealAmt" className="text-xs">Setup Deal (SR)</Label>
                      <Input id="dealAmt" type="number" step="0.01" min="0" value={dealAmount} onChange={(e) => setDealAmount(e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => {
                        setEditingSetup(false);
                        setDealAmount(String(openCompany.total_deal ?? 0));
                      }}>Cancel</Button>
                      <Button onClick={saveSetup} disabled={savingDeal} className="gap-1">
                        <Save className="h-4 w-4" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm">
                    <InfoRow label="Setup Deal" value={fmt(oBaseDeal)} bold />
                  </div>
                )}
              </div>

              {/* Discount */}
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-amber-500" />
                    <h3 className="font-semibold">Discount</h3>
                  </div>
                  {canWrite && !editingDiscount && (
                    <Button size="sm" variant="outline" onClick={() => setEditingDiscount(true)}>Edit</Button>
                  )}
                </div>
                {editingDiscount ? (
                  <div className="mt-3 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label htmlFor="discAmt" className="text-xs flex items-center gap-1">
                          <Percent className="h-3 w-3" /> Discount ({discountMode === "pct" ? "%" : "SR"})
                        </Label>
                        <div className="inline-flex rounded-md border bg-muted/40 p-0.5 text-[11px] font-medium">
                          <button
                            type="button"
                            onClick={() => setDiscountMode("sr")}
                            className={`px-2 py-0.5 rounded-sm transition-colors ${discountMode === "sr" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                          >SR</button>
                          <button
                            type="button"
                            onClick={() => setDiscountMode("pct")}
                            className={`px-2 py-0.5 rounded-sm transition-colors ${discountMode === "pct" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                          >%</button>
                        </div>
                      </div>
                      <Input
                        id="discAmt"
                        type="number"
                        step="0.01"
                        min="0"
                        max={discountMode === "pct" ? "100" : undefined}
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        placeholder={discountMode === "pct" ? "e.g. 10" : "e.g. 500"}
                      />
                      {discountMode === "pct" && Number(openCompany.total_deal || 0) > 0 && Number(discountAmount) > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          = {fmt(Number(openCompany.total_deal || 0) * Number(discountAmount) / 100)}
                        </p>
                      )}
                      {discountMode === "sr" && Number(openCompany.total_deal || 0) > 0 && Number(discountAmount) > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          = {((Number(discountAmount) / Number(openCompany.total_deal || 0)) * 100).toFixed(2)}%
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => {
                        setEditingDiscount(false);
                        setDiscountAmount(String(openCompany.discount ?? 0));
                        setDiscountMode("sr");
                      }}>Cancel</Button>
                      <Button onClick={saveDiscount} disabled={savingDeal} className="gap-1">
                        <Save className="h-4 w-4" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm">
                    <InfoRow label="Discount" value={fmt(oDisc)} icon={<ArrowDownRight className="h-3 w-3 text-amber-500" />} bold />
                  </div>
                )}
              </div>


              {/* Extra Deals */}
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Extra Deals</h3>
                    <Badge variant="secondary" className="text-[10px]">{companyExtras.length}</Badge>
                    {oExtras > 0 && (
                      <span className="text-[11px] font-semibold text-primary tabular-nums">+ {fmt(oExtras)}</span>
                    )}
                  </div>
                  {canWrite && (
                    <Button size="sm" variant="outline" onClick={openAddExtra} className="gap-1">
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground -mt-2 mb-3">
                  Additional charges for extra work — automatically added to the total deal.
                </p>
                {companyExtras.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No extra deals added</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto pr-1">
                    {companyExtras.map((x) => (
                      <div key={x.id} title={adminTitle((x as any).updated_by, (x as any).updated_at ?? (x as any).created_at, "Added by")} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Plus className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-primary tabular-nums">+ {fmt(Number(x.amount))}</div>
                            <div className="text-xs text-muted-foreground truncate">{x.note}</div>
                          </div>
                        </div>
                        {canWrite && (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEditExtra(x)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteExtra(x)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Installments */}
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Installments</h3>
                    <Badge variant="secondary" className="text-[10px]">{companyInstallments.length}</Badge>
                  </div>
                  {canWrite && (
                    <Button size="sm" variant="outline" onClick={openAddInst} className="gap-1">
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  )}
                </div>
                {companyInstallments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No installments recorded yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto pr-1">
                    {companyInstallments
                      .slice()
                      .sort((a, b) => (b.payment_date ?? "").localeCompare(a.payment_date ?? ""))
                      .map((x) => (
                        <div key={x.id} title={adminTitle(profileNames[(x as any).created_by ?? ""], (x as any).created_at, "Added by")} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(Number(x.amount))}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {x.payment_date ? new Date(x.payment_date).toLocaleDateString() : "No date"}
                                {` · ${methodLabel(x.payment_method)}`}
                                {x.note ? ` · ${x.note}` : ""}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Generate Invoice"
                              onClick={() => openInvoice(x.company_id, x.id, { showIssuer: role === "admin" }).catch((e) => toast.error(e.message))}
                            >
                              <FileText className="h-4 w-4 text-primary" />
                            </Button>
                            {canWrite && (
                              <>
                                <Button size="icon" variant="ghost" onClick={() => openEditInst(x)}><Pencil className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => deleteInst(x)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Installment dialog */}
      <Dialog open={instOpen} onOpenChange={setInstOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingInst ? "Edit Installment" : "Add Installment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="iAmt">Amount (SR)</Label>
              <Input id="iAmt" type="number" step="0.01" min="0" value={instAmount} onChange={(e) => setInstAmount(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="iDate">Payment Date</Label>
              <Input id="iDate" type="date" value={instDate} onChange={(e) => setInstDate(e.target.value)} />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={instMethod} onValueChange={setInstMethod}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="iNote">Note</Label>
              <Input id="iNote" value={instNote} onChange={(e) => setInstNote(e.target.value)} placeholder="Optional note" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInstOpen(false)}>Cancel</Button>
            <Button onClick={saveInst} disabled={savingInst}>{editingInst ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extra Deal dialog */}
      <Dialog open={extraOpen} onOpenChange={setExtraOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExtra ? "Edit Extra Deal" : "Add Extra Deal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="eNote">Note</Label>
              <Input id="eNote" value={extraNote} onChange={(e) => setExtraNote(e.target.value)} placeholder="Describe the extra work" />
            </div>
            <div>
              <Label htmlFor="eAmt">Amount (SR)</Label>
              <Input id="eAmt" type="number" step="0.01" min="0" value={extraAmount} onChange={(e) => setExtraAmount(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              This amount will be added on top of the total deal.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExtraOpen(false)}>Cancel</Button>
            <Button onClick={saveExtra} disabled={savingExtra}>{editingExtra ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Sub-components ---------- */

const toneMap = {
  primary: {
    border: "border-l-primary",
    text: "text-primary",
    bg: "bg-primary/10",
    bar: "bg-gradient-to-r from-primary/60 to-primary",
  },
  emerald: {
    border: "border-l-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    bar: "bg-gradient-to-r from-emerald-400 to-emerald-600",
  },
  amber: {
    border: "border-l-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    bar: "bg-gradient-to-r from-amber-400 to-amber-600",
  },
  rose: {
    border: "border-l-destructive",
    text: "text-destructive",
    bg: "bg-destructive/10",
    bar: "bg-gradient-to-r from-rose-400 to-destructive",
  },
} as const;

function StatCard({
  label, value, icon, accent, hint, progress,
}: {
  label: string; value: string; icon: React.ReactNode;
  accent: keyof typeof toneMap; hint?: string; progress?: number;
}) {
  const t = toneMap[accent];
  return (
    <Card className={`p-5 border-l-4 ${t.border} shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
          <p className={`mt-2 text-2xl font-bold ${t.text} tabular-nums truncate`}>{value}</p>
          {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
        </div>
        <div className={`h-11 w-11 rounded-xl ${t.bg} ${t.text} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
      </div>
      {typeof progress === "number" && (
        <div className="mt-4">
          <AnimatedProgress value={progress} barClassName={t.bar} />
        </div>
      )}
    </Card>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: keyof typeof toneMap }) {
  const t = toneMap[tone];
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
      <p className={`text-lg font-bold mt-1 tabular-nums ${t.text}`}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value, bold, icon }: { label: string; value: string; bold?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
        {icon}{label}
      </div>
      <div className={`tabular-nums ${bold ? "font-bold text-foreground" : "font-medium"}`}>{value}</div>
    </div>
  );
}
