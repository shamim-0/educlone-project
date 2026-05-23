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
  Wallet, TrendingUp, AlertCircle, Search, Pencil, Plus, Trash2, Save,
  Calendar, Receipt, Percent, Building2, ArrowDownRight,
} from "lucide-react";
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
  const { role } = useAuth();
  const canWrite = role === "admin" || role === "editor";
  const [companies, setCompanies] = useState<Company[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [openCompany, setOpenCompany] = useState<Company | null>(null);
  const [editingDeal, setEditingDeal] = useState(false);
  const [dealAmount, setDealAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountMode, setDiscountMode] = useState<"sr" | "pct">("sr");
  const [savingDeal, setSavingDeal] = useState(false);

  const [instOpen, setInstOpen] = useState(false);
  const [editingInst, setEditingInst] = useState<Installment | null>(null);
  const [instAmount, setInstAmount] = useState("");
  const [instDate, setInstDate] = useState("");
  const [instNote, setInstNote] = useState("");
  const [savingInst, setSavingInst] = useState(false);

  const load = async () => {
    setLoading(true);
    const [c, i] = await Promise.all([
      supabase
        .from("companies")
        .select("id, name, type, total_deal, discount, branch_id, branches!companies_branch_id_fkey(name)")
        .order("name"),
      supabase.from("company_installments").select("*"),
    ]);
    if (c.error) toast.error(c.error.message);
    setCompanies((c.data as Company[]) ?? []);
    setInstallments((i.data as Installment[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { document.title = "Accounts | ISBI Tracker"; load(); }, []);

  const receivedByCompany = useMemo(() => {
    const map: Record<string, number> = {};
    installments.forEach((x) => { map[x.company_id] = (map[x.company_id] ?? 0) + Number(x.amount || 0); });
    return map;
  }, [installments]);

  const totals = useMemo(() => {
    const deal = companies.reduce((s, c) => s + Number(c.total_deal || 0), 0);
    const discount = companies.reduce((s, c) => s + Number(c.discount || 0), 0);
    const received = Object.values(receivedByCompany).reduce((s, v) => s + v, 0);
    const net = deal - discount;
    return { deal, discount, received, net, due: net - received };
  }, [companies, receivedByCompany]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, search]);

  const companyInstallments = useMemo(
    () => (openCompany ? installments.filter((x) => x.company_id === openCompany.id) : []),
    [installments, openCompany],
  );

  const oDeal = Number(openCompany?.total_deal || 0);
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
    setEditingDeal(false);
  }

  async function saveDeal() {
    if (!openCompany) return;
    const v = Number(dealAmount);
    const d = Number(discountAmount);
    if (Number.isNaN(v) || v < 0) { toast.error("Invalid deal amount"); return; }
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
      .update({ total_deal: v, discount: discSr })
      .eq("id", openCompany.id);
    setSavingDeal(false);
    if (error) return toast.error(error.message);
    setCompanies((prev) => prev.map((c) => c.id === openCompany.id ? { ...c, total_deal: v, discount: discSr } : c));
    setOpenCompany({ ...openCompany, total_deal: v, discount: discSr });
    setDiscountAmount(String(discSr));
    setDiscountMode("sr");
    setEditingDeal(false);
    toast.success("Deal updated");
  }

  function openAddInst() {
    setEditingInst(null);
    setInstAmount("");
    setInstDate(new Date().toISOString().slice(0, 10));
    setInstNote("");
    setInstOpen(true);
  }

  function openEditInst(x: Installment) {
    setEditingInst(x);
    setInstAmount(String(x.amount));
    setInstDate(x.payment_date ? x.payment_date.slice(0, 10) : "");
    setInstNote(x.note ?? "");
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
    };
    if (editingInst) {
      const { data, error } = await supabase
        .from("company_installments").update(payload).eq("id", editingInst.id).select().single();
      setSavingInst(false);
      if (error) return toast.error(error.message);
      setInstallments((prev) => prev.map((x) => x.id === editingInst.id ? (data as Installment) : x));
    } else {
      const { data, error } = await supabase
        .from("company_installments").insert(payload).select().single();
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold">Companies Ledger</h2>
              <p className="text-xs text-muted-foreground">{filtered.length} of {companies.length} shown</p>
            </div>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search company by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
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
                const deal = Number(c.total_deal || 0);
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
                    <TableCell className="text-right font-semibold text-primary tabular-nums">{fmt(deal)}</TableCell>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Deal & Installments: {openCompany?.name}
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

              {/* Edit deal + discount */}
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Deal & Discount</h3>
                  </div>
                  {canWrite && !editingDeal && (
                    <Button size="sm" variant="outline" onClick={() => setEditingDeal(true)}>Edit</Button>
                  )}
                </div>
                {editingDeal ? (
                  <div className="mt-3 space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="dealAmt" className="text-xs">Total Deal (SR)</Label>
                        <Input id="dealAmt" type="number" step="0.01" min="0" value={dealAmount} onChange={(e) => setDealAmount(e.target.value)} />
                      </div>
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
                        {discountMode === "pct" && Number(dealAmount) > 0 && Number(discountAmount) > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            = {fmt(Number(dealAmount) * Number(discountAmount) / 100)}
                          </p>
                        )}
                        {discountMode === "sr" && Number(dealAmount) > 0 && Number(discountAmount) > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            = {((Number(discountAmount) / Number(dealAmount)) * 100).toFixed(2)}%
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => {
                        setEditingDeal(false);
                        setDealAmount(String(openCompany.total_deal ?? 0));
                        setDiscountAmount(String(openCompany.discount ?? 0));
                      }}>Cancel</Button>
                      <Button onClick={saveDeal} disabled={savingDeal} className="gap-1">
                        <Save className="h-4 w-4" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
                    <InfoRow label="Deal" value={fmt(oDeal)} />
                    <InfoRow label="Discount" value={fmt(oDisc)} icon={<ArrowDownRight className="h-3 w-3 text-amber-500" />} />
                    <InfoRow label="Net Payable" value={fmt(oNet)} bold />
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
                        <div key={x.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(Number(x.amount))}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {x.payment_date ? new Date(x.payment_date).toLocaleDateString() : "No date"}
                                {x.note ? ` · ${x.note}` : ""}
                              </div>
                            </div>
                          </div>
                          {canWrite && (
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEditInst(x)}><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => deleteInst(x)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
