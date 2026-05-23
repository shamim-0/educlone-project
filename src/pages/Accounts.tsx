import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Wallet, TrendingUp, AlertCircle, Search, Pencil, Plus, Trash2, Save, Calendar, Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Company {
  id: string;
  name: string;
  type: string;
  total_deal: number;
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

export default function AccountsPage() {
  const { role } = useAuth();
  const canWrite = role === "admin" || role === "editor";
  const [companies, setCompanies] = useState<Company[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // manage deal dialog state
  const [openCompany, setOpenCompany] = useState<Company | null>(null);
  const [editingDeal, setEditingDeal] = useState(false);
  const [dealAmount, setDealAmount] = useState("");
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
        .select("id, name, type, total_deal, branch_id, branches!companies_branch_id_fkey(name)")
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
    const received = Object.values(receivedByCompany).reduce((s, v) => s + v, 0);
    return { deal, received, due: deal - received };
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

  const openCompanyDeal = Number(openCompany?.total_deal || 0);
  const openCompanyReceived = openCompany ? (receivedByCompany[openCompany.id] ?? 0) : 0;
  const openCompanyDue = openCompanyDeal - openCompanyReceived;
  const openCompanyPct = openCompanyDeal > 0 ? Math.min(100, Math.round((openCompanyReceived / openCompanyDeal) * 100)) : 0;

  function openManage(c: Company) {
    setOpenCompany(c);
    setDealAmount(String(c.total_deal ?? 0));
    setEditingDeal(false);
  }

  async function saveDeal() {
    if (!openCompany) return;
    const v = Number(dealAmount);
    if (Number.isNaN(v) || v < 0) { toast.error("Invalid amount"); return; }
    setSavingDeal(true);
    const { error } = await supabase.from("companies").update({ total_deal: v }).eq("id", openCompany.id);
    setSavingDeal(false);
    if (error) return toast.error(error.message);
    setCompanies((prev) => prev.map((c) => c.id === openCompany.id ? { ...c, total_deal: v } : c));
    setOpenCompany({ ...openCompany, total_deal: v });
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Accounts Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Track every company's deal value, received payments, and outstanding dues.</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 border-l-4 border-l-primary shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total Deal</p>
              <p className="mt-2 text-2xl font-bold text-primary">{fmt(totals.deal)}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-l-emerald-500 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total Received</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(totals.received)}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-l-destructive shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total Due</p>
              <p className="mt-2 text-2xl font-bold text-destructive">{fmt(totals.due)}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search + Table */}
      <Card className="p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-display font-semibold">Companies</h2>
            <p className="text-xs text-muted-foreground">{filtered.length} of {companies.length} companies</p>
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

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14 text-center">#</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Total Deal</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No companies found.</TableCell></TableRow>
              ) : filtered.map((c, idx) => {
                const deal = Number(c.total_deal || 0);
                const received = receivedByCompany[c.id] ?? 0;
                const due = deal - received;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      <Badge variant="secondary" className="capitalize mt-1 text-[10px]">{c.type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.branches?.name ?? "—"}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{fmt(deal)}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">{fmt(received)}</TableCell>
                    <TableCell className={`text-right font-semibold ${due > 0 ? "text-destructive" : "text-muted-foreground"}`}>{fmt(due)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openManage(c)} className="gap-1">
                        <Receipt className="h-3.5 w-3.5" /> Manage Deal
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
              <Card className="p-4 bg-muted/30">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Deal</p>
                    <p className="text-xl font-bold text-primary mt-1">{fmt(openCompanyDeal)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Received</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{fmt(openCompanyReceived)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Due</p>
                    <p className="text-xl font-bold text-destructive mt-1">{fmt(openCompanyDue)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span><span>{openCompanyPct}%</span>
                  </div>
                  <Progress value={openCompanyPct} />
                </div>
              </Card>

              {/* Edit deal */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Edit Deal</h3>
                  </div>
                  {canWrite && !editingDeal && (
                    <Button size="sm" variant="outline" onClick={() => setEditingDeal(true)}>Edit</Button>
                  )}
                </div>
                {editingDeal ? (
                  <div className="mt-3 flex gap-2 items-end">
                    <div className="flex-1">
                      <Label htmlFor="dealAmt" className="text-xs">Total Deal Amount (SR)</Label>
                      <Input id="dealAmt" type="number" step="0.01" min="0" value={dealAmount} onChange={(e) => setDealAmount(e.target.value)} />
                    </div>
                    <Button onClick={saveDeal} disabled={savingDeal} className="gap-1">
                      <Save className="h-4 w-4" /> Save
                    </Button>
                    <Button variant="ghost" onClick={() => { setEditingDeal(false); setDealAmount(String(openCompany.total_deal ?? 0)); }}>Cancel</Button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Amount: <span className="font-semibold text-foreground">{fmt(openCompanyDeal)}</span></p>
                )}
              </div>

              {/* Installments */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Installments</h3>
                  </div>
                  {canWrite && (
                    <Button size="sm" variant="outline" onClick={openAddInst} className="gap-1">
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  )}
                </div>
                {companyInstallments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No installments recorded yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {companyInstallments
                      .slice()
                      .sort((a, b) => (b.payment_date ?? "").localeCompare(a.payment_date ?? ""))
                      .map((x) => (
                        <div key={x.id} className="flex items-center justify-between gap-3 p-3 rounded-md border bg-muted/20">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(Number(x.amount))}</div>
                            <div className="text-xs text-muted-foreground">
                              {x.payment_date ? new Date(x.payment_date).toLocaleDateString() : "No date"}
                              {x.note ? ` · ${x.note}` : ""}
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
