import { useEffect, useMemo, useState } from "react";
import { extractCompanyCode } from "@/lib/companySort";
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
  Wallet, Search, Pencil, Plus, Trash2, Receipt, Building2, FileText,
  TrendingDown, Layers, ListChecks,
} from "lucide-react";
import { PAYMENT_METHODS, methodLabel } from "@/lib/invoice";
import { openExpenseVoucher, openExpenseSummary, openExpenseRangeStatement, formatVoucherNo } from "@/lib/expense";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useProfileNames } from "@/hooks/useProfileNames";
import { auditTitle } from "@/lib/audit";

const db = supabase as any;

interface Company {
  id: string;
  name: string;
  type: string;
  branch_id: string | null;
  branches?: { name: string } | null;
}
interface Expense {
  id: string;
  company_id: string;
  purpose: string;
  amount: number;
  expense_date: string | null;
  payment_method: string | null;
  note: string | null;
  voucher_no?: number | null;
  created_by?: string | null;
  created_at?: string;
}
interface ExtraExpense {
  id: string;
  company_id: string;
  note: string;
  amount: number;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

const fmt = (n: number) =>
  `${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SR`;

function AnimatedProgress({ value, className = "", barClassName = "bg-primary" }:
  { value: number; className?: string; barClassName?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setV(Math.max(0, Math.min(100, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <div className={`relative h-2.5 w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <div className={`h-full rounded-full ${barClassName} transition-[width] duration-[1200ms] ease-out`} style={{ width: `${v}%` }} />
    </div>
  );
}

export default function ExpensesPage() {
  const { role, username: myUsername } = useAuth();
  const profileNames = useProfileNames();
  const adminTitle = (name?: string | null, at?: string | null, verb?: string) =>
    auditTitle(name, at, verb);
  const canWrite = role === "admin";

  const [companies, setCompanies] = useState<Company[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [extras, setExtras] = useState<ExtraExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [dayFilter, setDayFilter] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("default");

  const [openCompany, setOpenCompany] = useState<Company | null>(null);

  const [expOpen, setExpOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<Expense | null>(null);
  const [expPurpose, setExpPurpose] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState("");
  const [expMethod, setExpMethod] = useState("cash");
  const [expNote, setExpNote] = useState("");
  const [savingExp, setSavingExp] = useState(false);

  const [extraOpen, setExtraOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState<ExtraExpense | null>(null);
  const [extraAmount, setExtraAmount] = useState("");
  const [extraNote, setExtraNote] = useState("");
  const [savingExtra, setSavingExtra] = useState(false);

  const load = async () => {
    setLoading(true);
    const [c, e, x] = await Promise.all([
      supabase
        .from("companies")
        .select("id, name, type, branch_id, branches!companies_branch_id_fkey(name)")
        .order("name"),
      db.from("company_expenses").select("*"),
      db.from("company_extra_expenses").select("*").order("created_at", { ascending: false }),
    ]);
    if (c.error) toast.error(c.error.message);
    if (e.error) toast.error(e.error.message);
    setCompanies((c.data as any as Company[]) ?? []);
    setExpenses((e.data as Expense[]) ?? []);
    setExtras((x.data as ExtraExpense[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { document.title = "Expenses | ISBI Tracker"; load(); }, []);

  const dateFilterActive = !!dayFilter || !!monthFilter || !!fromDate || !!toDate;
  const periodExpenses = useMemo(() => {
    if (!dateFilterActive) return expenses;
    return expenses.filter((x) => {
      const raw = x.expense_date ?? x.created_at;
      if (!raw) return false;
      const d = String(raw).slice(0, 10);
      if (dayFilter && d !== dayFilter) return false;
      if (monthFilter && d.slice(0, 7) !== monthFilter) return false;
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }, [expenses, dayFilter, monthFilter, fromDate, toDate, dateFilterActive]);

  const costByCompany = useMemo(() => {
    const map: Record<string, number> = {};
    periodExpenses.forEach((x) => { map[x.company_id] = (map[x.company_id] ?? 0) + Number(x.amount || 0); });
    return map;
  }, [periodExpenses]);

  const countByCompany = useMemo(() => {
    const map: Record<string, number> = {};
    periodExpenses.forEach((x) => { map[x.company_id] = (map[x.company_id] ?? 0) + 1; });
    return map;
  }, [periodExpenses]);

  const extrasByCompany = useMemo(() => {
    const map: Record<string, number> = {};
    extras.forEach((x) => { map[x.company_id] = (map[x.company_id] ?? 0) + Number(x.amount || 0); });
    return map;
  }, [extras]);

  const totalOf = (c: Company) => (costByCompany[c.id] ?? 0) + (extrasByCompany[c.id] ?? 0);

  const branchTabs = useMemo(() => {
    const map = new Map<string, number>();
    companies.forEach((c) => {
      const name = c.branches?.name ?? "—";
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [companies]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = companies;
    if (branchFilter !== "all") arr = arr.filter((c) => (c.branches?.name ?? "—") === branchFilter);
    if (q) arr = arr.filter((c) => c.name.toLowerCase().includes(q));
    if (dateFilterActive) {
      const ids = new Set(periodExpenses.map((x) => x.company_id));
      arr = arr.filter((c) => ids.has(c.id));
    }
    const sorted = [...arr];
    switch (sortBy) {
      case "name_asc": return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "name_desc": return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case "expense_desc": return sorted.sort((a, b) => totalOf(b) - totalOf(a));
      case "entries_desc": return sorted.sort((a, b) => (countByCompany[b.id] ?? 0) - (countByCompany[a.id] ?? 0));
      default:
        return sorted.sort((a, b) => {
          const ac = extractCompanyCode(a.name);
          const bc = extractCompanyCode(b.name);
          if (ac !== bc) return bc - ac;
          return b.name.localeCompare(a.name);
        });
    }
  }, [companies, search, branchFilter, sortBy, costByCompany, extrasByCompany, countByCompany, dateFilterActive, periodExpenses]);

  const totals = useMemo(() => {
    const cost = filtered.reduce((s, c) => s + (costByCompany[c.id] ?? 0), 0);
    const extra = filtered.reduce((s, c) => s + (extrasByCompany[c.id] ?? 0), 0);
    const entries = filtered.reduce((s, c) => s + (countByCompany[c.id] ?? 0), 0);
    return { cost, extra, entries, total: cost + extra };
  }, [filtered, costByCompany, extrasByCompany, countByCompany]);

  const maxTotal = useMemo(
    () => Math.max(1, ...filtered.map((c) => totalOf(c))),
    [filtered, costByCompany, extrasByCompany],
  );

  const companyExpenses = useMemo(
    () => (openCompany ? expenses.filter((x) => x.company_id === openCompany.id) : []),
    [expenses, openCompany],
  );
  const companyExtras = useMemo(
    () => (openCompany ? extras.filter((x) => x.company_id === openCompany.id) : []),
    [extras, openCompany],
  );
  const oCost = companyExpenses.reduce((s, x) => s + Number(x.amount || 0), 0);
  const oExtra = companyExtras.reduce((s, x) => s + Number(x.amount || 0), 0);
  const oTotal = oCost + oExtra;

  /* ---------- expense CRUD ---------- */
  function openAddExp() {
    setEditingExp(null);
    setExpPurpose("");
    setExpAmount("");
    setExpDate(new Date().toISOString().slice(0, 10));
    setExpMethod("cash");
    setExpNote("");
    setExpOpen(true);
  }
  function openEditExp(x: Expense) {
    setEditingExp(x);
    setExpPurpose(x.purpose ?? "");
    setExpAmount(String(x.amount));
    setExpDate(x.expense_date ? String(x.expense_date).slice(0, 10) : "");
    setExpMethod(x.payment_method || "cash");
    setExpNote(x.note ?? "");
    setExpOpen(true);
  }
  async function saveExp() {
    if (!openCompany) return;
    const v = Number(expAmount);
    if (!expPurpose.trim()) { toast.error("Enter the purpose"); return; }
    if (Number.isNaN(v) || v <= 0) { toast.error("Enter amount"); return; }
    setSavingExp(true);
    const payload = {
      company_id: openCompany.id,
      purpose: expPurpose.trim(),
      amount: v,
      expense_date: expDate ? new Date(expDate).toISOString() : null,
      payment_method: expMethod,
      note: expNote.trim() || null,
      updated_by: myUsername ?? null,
    };
    if (editingExp) {
      const { data, error } = await db.from("company_expenses").update(payload).eq("id", editingExp.id).select().single();
      setSavingExp(false);
      if (error) return toast.error(error.message);
      setExpenses((prev) => prev.map((x) => x.id === editingExp.id ? (data as Expense) : x));
    } else {
      const { data: authData } = await supabase.auth.getUser();
      const { data, error } = await db
        .from("company_expenses")
        .insert({ ...payload, created_by: authData.user?.id ?? null })
        .select().single();
      setSavingExp(false);
      if (error) return toast.error(error.message);
      setExpenses((prev) => [...prev, data as Expense]);
    }
    setExpOpen(false);
    toast.success("Saved");
  }
  async function deleteExp(x: Expense) {
    if (!confirm("Delete this expense?")) return;
    const { error } = await db.from("company_expenses").delete().eq("id", x.id);
    if (error) return toast.error(error.message);
    setExpenses((prev) => prev.filter((i) => i.id !== x.id));
    toast.success("Deleted");
  }

  /* ---------- extra expense CRUD ---------- */
  function openAddExtra() {
    setEditingExtra(null);
    setExtraAmount("");
    setExtraNote("");
    setExtraOpen(true);
  }
  function openEditExtra(x: ExtraExpense) {
    setEditingExtra(x);
    setExtraAmount(String(x.amount));
    setExtraNote(x.note ?? "");
    setExtraOpen(true);
  }
  async function saveExtra() {
    if (!openCompany) return;
    const v = Number(extraAmount);
    if (!extraNote.trim()) { toast.error("Enter note"); return; }
    if (Number.isNaN(v) || v <= 0) { toast.error("Enter amount"); return; }
    setSavingExtra(true);
    const payload = { company_id: openCompany.id, amount: v, note: extraNote.trim(), updated_by: myUsername ?? null };
    if (editingExtra) {
      const { data, error } = await db.from("company_extra_expenses").update(payload).eq("id", editingExtra.id).select().single();
      setSavingExtra(false);
      if (error) return toast.error(error.message);
      setExtras((prev) => prev.map((x) => x.id === editingExtra.id ? (data as ExtraExpense) : x));
    } else {
      const { data: authData } = await supabase.auth.getUser();
      const { data, error } = await db
        .from("company_extra_expenses")
        .insert({ ...payload, created_by: authData.user?.id ?? null })
        .select().single();
      setSavingExtra(false);
      if (error) return toast.error(error.message);
      setExtras((prev) => [data as ExtraExpense, ...prev]);
    }
    setExtraOpen(false);
    toast.success("Saved");
  }
  async function deleteExtra(x: ExtraExpense) {
    if (!confirm("Delete this extra cost?")) return;
    const { error } = await db.from("company_extra_expenses").delete().eq("id", x.id);
    if (error) return toast.error(error.message);
    setExtras((prev) => prev.filter((i) => i.id !== x.id));
    toast.success("Deleted");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6 sm:p-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -left-10 -bottom-16 h-44 w-44 rounded-full bg-destructive/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-600 dark:text-amber-400 font-semibold">
              <TrendingDown className="h-3.5 w-3.5" /> Finance · Expenses
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-display font-bold tracking-tight">Expense Management</h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              Track every company cost by purpose, add extra bills, generate vouchers and period reports.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-background/70 backdrop-blur px-4 py-3 border shadow-sm">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Expense</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{fmt(totals.total)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Cost" value={fmt(totals.cost)} accent="amber" icon={<Wallet className="h-5 w-5" />} hint={`${totals.entries} entries`} />
        <StatCard label="Extra Costs" value={fmt(totals.extra)} accent="primary" icon={<Layers className="h-5 w-5" />} />
        <StatCard label="Grand Total" value={fmt(totals.total)} accent="rose" icon={<TrendingDown className="h-5 w-5" />} />
        <StatCard label="Companies" value={String(filtered.length)} accent="emerald" icon={<Building2 className="h-5 w-5" />} hint={`of ${companies.length}`} />
      </div>

      <Card className="p-6 shadow-card border-border/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <ListChecks className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold">Company Expenses</h2>
              <p className="text-xs text-muted-foreground">{filtered.length} of {companies.length} shown</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto lg:justify-end min-w-0">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search company by name…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">🚨 Priority (default)</SelectItem>
                <SelectItem value="name_asc">A–Z</SelectItem>
                <SelectItem value="name_desc">Z–A</SelectItem>
                <SelectItem value="expense_desc">💸 Highest Expense</SelectItem>
                <SelectItem value="entries_desc">📋 Most Entries</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} className="sm:w-44" title="Filter by expense day" />
            <Input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="sm:w-40" title="Filter by expense month" />
            <div className="flex items-center gap-1">
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="sm:w-40" title="From date" />
              <span className="text-muted-foreground text-xs">to</span>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="sm:w-40" title="To date" />
            </div>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                const nameById = new Map(companies.map((c) => [c.id, c.name] as const));
                const ids = new Set(filtered.map((c) => c.id));
                openExpenseRangeStatement({
                  from: fromDate || undefined,
                  to: toDate || undefined,
                  branch: branchFilter,
                  rows: periodExpenses
                    .filter((x) => ids.has(x.company_id))
                    .map((x) => ({
                      companyName: nameById.get(x.company_id) ?? "—",
                      voucherNo: x.voucher_no ?? null,
                      purpose: x.purpose,
                      date: x.expense_date ?? x.created_at ?? null,
                      method: x.payment_method,
                      amount: Number(x.amount || 0),
                    })),
                });
              }}
            >
              <FileText className="h-4 w-4" /> Expense Report PDF
            </Button>
            {(dayFilter || monthFilter || fromDate || toDate) && (
              <Button variant="outline" onClick={() => { setDayFilter(""); setMonthFilter(""); setFromDate(""); setToDate(""); }}>
                Clear date
              </Button>
            )}
          </div>
        </div>

        {/* Branch tabs */}
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            onClick={() => setBranchFilter("all")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium border transition-colors",
              branchFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-muted"
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
                branchFilter === name ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-muted"
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
                <TableHead className="text-right">Entries</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Extra</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-44">Share</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">No companies found.</TableCell></TableRow>
              ) : filtered.map((c, idx) => {
                const cost = costByCompany[c.id] ?? 0;
                const extra = extrasByCompany[c.id] ?? 0;
                const total = cost + extra;
                const pct = Math.round((total / maxTotal) * 100);
                return (
                  <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      <Badge variant="secondary" className="capitalize mt-1 text-[10px]">{c.type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.branches?.name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{countByCompany[c.id] ?? 0}</TableCell>
                    <TableCell className="text-right font-semibold text-amber-600 dark:text-amber-400 tabular-nums">{fmt(cost)}</TableCell>
                    <TableCell className="text-right font-medium text-primary tabular-nums">{extra > 0 ? `+ ${fmt(extra)}` : "—"}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-destructive">{fmt(total)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AnimatedProgress value={pct} barClassName="bg-gradient-to-r from-amber-400 to-amber-600" />
                        <span className="text-[11px] font-medium text-muted-foreground tabular-nums w-9 text-right">{pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setOpenCompany(c)} className="gap-1 hover-scale">
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

      {/* Manage expenses dialog */}
      <Dialog open={!!openCompany} onOpenChange={(o) => !o && setOpenCompany(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Expenses: {openCompany?.name}
              </span>
              {openCompany && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mr-6 gap-1.5"
                  onClick={() => openExpenseSummary(openCompany.id).catch((e) => toast.error(e.message || "Failed to generate PDF"))}
                >
                  <FileText className="h-4 w-4" /> Generate PDF
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {openCompany && (
            <div className="space-y-5">
              <Card className="p-5 bg-gradient-to-br from-muted/40 to-transparent border-border/60">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <MiniStat label="Cost" value={fmt(oCost)} tone="amber" />
                  <MiniStat label="Extra" value={fmt(oExtra)} tone="primary" />
                  <MiniStat label="Total" value={fmt(oTotal)} tone="rose" />
                </div>
              </Card>

              {/* Cost entries */}
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <h3 className="font-semibold">Costs by Purpose</h3>
                    <Badge variant="secondary" className="text-[10px]">{companyExpenses.length}</Badge>
                  </div>
                  {canWrite && (
                    <Button size="sm" variant="outline" onClick={openAddExp} className="gap-1">
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  )}
                </div>
                {companyExpenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No expenses recorded yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto pr-1">
                    {companyExpenses
                      .slice()
                      .sort((a, b) => String(b.expense_date ?? b.created_at ?? "").localeCompare(String(a.expense_date ?? a.created_at ?? "")))
                      .map((x) => (
                        <div
                          key={x.id}
                          title={adminTitle(profileNames[x.created_by ?? ""], x.created_at, "Added by")}
                          className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="h-9 w-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                              <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                                {fmt(Number(x.amount))} <span className="text-xs font-normal text-muted-foreground">· {formatVoucherNo(x.voucher_no)}</span>
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {x.purpose}
                                {` · ${x.expense_date ? new Date(x.expense_date).toLocaleDateString() : "No date"}`}
                                {` · ${methodLabel(x.payment_method)}`}
                                {x.note ? ` · ${x.note}` : ""}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Generate Voucher"
                              onClick={() => openExpenseVoucher(x.company_id, x.id, { showIssuer: role === "admin" }).catch((e) => toast.error(e.message))}
                            >
                              <FileText className="h-4 w-4 text-primary" />
                            </Button>
                            {canWrite && (
                              <>
                                <Button size="icon" variant="ghost" onClick={() => openEditExp(x)}><Pencil className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => deleteExp(x)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Extra costs */}
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Extra Costs</h3>
                    <Badge variant="secondary" className="text-[10px]">{companyExtras.length}</Badge>
                    {oExtra > 0 && <span className="text-[11px] font-semibold text-primary tabular-nums">+ {fmt(oExtra)}</span>}
                  </div>
                  {canWrite && (
                    <Button size="sm" variant="outline" onClick={openAddExtra} className="gap-1">
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground -mt-2 mb-3">
                  Extra bills for unplanned costs — automatically added to the total expense.
                </p>
                {companyExtras.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No extra costs added</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto pr-1">
                    {companyExtras.map((x) => (
                      <div
                        key={x.id}
                        title={adminTitle(x.updated_by, x.updated_at ?? x.created_at, "Added by")}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Expense dialog */}
      <Dialog open={expOpen} onOpenChange={setExpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExp ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="xPurpose">Purpose</Label>
              <Input id="xPurpose" value={expPurpose} onChange={(e) => setExpPurpose(e.target.value)} placeholder="e.g. MISA license fee" />
            </div>
            <div>
              <Label htmlFor="xAmt">Amount (SR)</Label>
              <Input id="xAmt" type="number" step="0.01" min="0" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="xDate">Expense Date</Label>
              <Input id="xDate" type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={expMethod} onValueChange={setExpMethod}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="xNote">Note</Label>
              <Input id="xNote" value={expNote} onChange={(e) => setExpNote(e.target.value)} placeholder="Optional note (admin only)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExpOpen(false)}>Cancel</Button>
            <Button onClick={saveExp} disabled={savingExp}>{editingExp ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extra cost dialog */}
      <Dialog open={extraOpen} onOpenChange={setExtraOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExtra ? "Edit Extra Cost" : "Add Extra Cost"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="exNote">Note</Label>
              <Input id="exNote" value={extraNote} onChange={(e) => setExtraNote(e.target.value)} placeholder="Describe the extra cost" />
            </div>
            <div>
              <Label htmlFor="exAmt">Amount (SR)</Label>
              <Input id="exAmt" type="number" step="0.01" min="0" value={extraAmount} onChange={(e) => setExtraAmount(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">This amount will be added on top of the total expense.</p>
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
  primary: { border: "border-l-primary", text: "text-primary", bg: "bg-primary/10", bar: "bg-gradient-to-r from-primary/60 to-primary" },
  emerald: { border: "border-l-emerald-500", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", bar: "bg-gradient-to-r from-emerald-400 to-emerald-600" },
  amber: { border: "border-l-amber-500", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", bar: "bg-gradient-to-r from-amber-400 to-amber-600" },
  rose: { border: "border-l-destructive", text: "text-destructive", bg: "bg-destructive/10", bar: "bg-gradient-to-r from-rose-400 to-destructive" },
} as const;

function StatCard({ label, value, icon, accent, hint, progress }: {
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
        <div className={`h-11 w-11 rounded-xl ${t.bg} ${t.text} flex items-center justify-center shrink-0`}>{icon}</div>
      </div>
      {typeof progress === "number" && (
        <div className="mt-4"><AnimatedProgress value={progress} barClassName={t.bar} /></div>
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
