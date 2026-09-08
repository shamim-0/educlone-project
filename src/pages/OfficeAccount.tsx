import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfileNames } from "@/hooks/useProfileNames";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, FileText, Plus, Trash2, Users, Wallet, Pencil } from "lucide-react";
import { PAYMENT_METHODS, methodLabel } from "@/lib/invoice";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmt = (n: number) =>
  `${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SR`;

const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);

interface Branch { id: string; name: string }
interface Category { id: string; name: string }
interface OfficeExpense {
  id: string; category_id: string | null; branch_id: string | null; purpose: string;
  amount: number; expense_date: string; payment_method: string; note: string | null;
  created_by: string | null; created_at: string;
}
interface Employee {
  id: string; name: string; designation: string | null; branch_id: string | null;
  monthly_salary: number; phone: string | null; active: boolean;
}
interface SalaryPayment {
  id: string; employee_id: string; salary_month: string; amount: number;
  paid_date: string | null; payment_method: string; note: string | null; created_by: string | null;
}

export default function OfficeAccount() {
  const { user } = useAuth();
  const profileNames = useProfileNames();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<OfficeExpense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaries, setSalaries] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // filters (office cost)
  const [fBranch, setFBranch] = useState("all");
  const [fCategory, setFCategory] = useState("all");
  const [fMonth, setFMonth] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  // dialogs
  const [catOpen, setCatOpen] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [expOpen, setExpOpen] = useState(false);
  const [expEdit, setExpEdit] = useState<OfficeExpense | null>(null);
  const [expForm, setExpForm] = useState({ category_id: "", branch_id: "", purpose: "", amount: "", expense_date: today(), payment_method: "cash", note: "" });

  const [empOpen, setEmpOpen] = useState(false);
  const [empEdit, setEmpEdit] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({ name: "", designation: "", branch_id: "", monthly_salary: "", phone: "", active: true });

  const [salMonth, setSalMonth] = useState(thisMonth());
  const [salBranch, setSalBranch] = useState("all");
  const [payTarget, setPayTarget] = useState<Employee | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", paid_date: today(), payment_method: "cash", note: "" });

  const load = async () => {
    setLoading(true);
    const [b, c, e, emp, sal] = await Promise.all([
      supabase.from("branches").select("id, name").order("name"),
      supabase.from("office_expense_categories").select("id, name").order("name"),
      supabase.from("office_expenses").select("*").order("expense_date", { ascending: false }),
      supabase.from("employees").select("*").order("name"),
      supabase.from("salary_payments").select("*"),
    ]);
    setBranches((b.data as Branch[]) ?? []);
    setCategories((c.data as Category[]) ?? []);
    setExpenses((e.data as any[]) ?? []);
    setEmployees((emp.data as any[]) ?? []);
    setSalaries((sal.data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { document.title = "Office Account | ISBI Tracker"; load(); }, []);

  const branchName = (id: string | null) => branches.find((x) => x.id === id)?.name ?? "—";
  const catName = (id: string | null) => categories.find((x) => x.id === id)?.name ?? "—";
  const userName = (id: string | null) => (id ? profileNames[id] || "—" : "—");

  /* ---------------- categories ---------------- */
  const addCategory = async () => {
    const name = newCat.trim();
    if (!name) return;
    const { error } = await supabase.from("office_expense_categories").insert({ name, created_by: user?.id ?? null });
    if (error) { toast.error(error.message); return; }
    setNewCat("");
    toast.success("Category added");
    load();
  };
  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("office_expense_categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Category deleted");
    load();
  };

  /* ---------------- office cost ---------------- */
  const openExpense = (row?: OfficeExpense) => {
    setExpEdit(row ?? null);
    setExpForm(row ? {
      category_id: row.category_id ?? "",
      branch_id: row.branch_id ?? "",
      purpose: row.purpose,
      amount: String(row.amount ?? ""),
      expense_date: (row.expense_date ?? "").slice(0, 10) || today(),
      payment_method: row.payment_method ?? "cash",
      note: row.note ?? "",
    } : { category_id: "", branch_id: "", purpose: "", amount: "", expense_date: today(), payment_method: "cash", note: "" });
    setExpOpen(true);
  };

  const saveExpense = async () => {
    if (!expForm.purpose.trim()) { toast.error("Purpose is required"); return; }
    if (!expForm.amount || Number(expForm.amount) <= 0) { toast.error("Enter a valid amount"); return; }
    const payload: any = {
      category_id: expForm.category_id || null,
      branch_id: expForm.branch_id || null,
      purpose: expForm.purpose.trim(),
      amount: Number(expForm.amount),
      expense_date: new Date(expForm.expense_date).toISOString(),
      payment_method: expForm.payment_method,
      note: expForm.note || null,
    };
    const res = expEdit
      ? await supabase.from("office_expenses").update({ ...payload, updated_by: user?.email ?? null }).eq("id", expEdit.id)
      : await supabase.from("office_expenses").insert({ ...payload, created_by: user?.id ?? null });
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(expEdit ? "Cost updated" : "Cost added");
    setExpOpen(false);
    load();
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from("office_expenses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    load();
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((x) => {
      const d = (x.expense_date ?? "").slice(0, 10);
      if (fBranch !== "all" && x.branch_id !== fBranch) return false;
      if (fCategory !== "all" && x.category_id !== fCategory) return false;
      if (fMonth && d.slice(0, 7) !== fMonth) return false;
      if (fFrom && d < fFrom) return false;
      if (fTo && d > fTo) return false;
      return true;
    });
  }, [expenses, fBranch, fCategory, fMonth, fFrom, fTo]);

  const expenseTotal = useMemo(() => filteredExpenses.reduce((s, x) => s + Number(x.amount || 0), 0), [filteredExpenses]);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    filteredExpenses.forEach((x) => {
      const k = catName(x.category_id);
      m.set(k, (m.get(k) ?? 0) + Number(x.amount || 0));
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses, categories]);

  const costReport = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Office Cost Report", 14, 16);
    doc.setFontSize(9);
    const parts: string[] = [];
    if (fBranch !== "all") parts.push(`Branch: ${branchName(fBranch)}`);
    if (fCategory !== "all") parts.push(`Category: ${catName(fCategory)}`);
    if (fMonth) parts.push(`Month: ${fMonth}`);
    if (fFrom || fTo) parts.push(`Range: ${fFrom || "beginning"} → ${fTo || "today"}`);
    parts.push(`Generated: ${new Date().toLocaleString()}`);
    doc.text(parts.join("   |   "), 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["#", "Date", "Category", "Branch", "Purpose", "Method", "Added By", "Amount"]],
      body: filteredExpenses.map((x, i) => [
        String(i + 1),
        (x.expense_date ?? "").slice(0, 10),
        catName(x.category_id),
        branchName(x.branch_id),
        x.purpose,
        methodLabel(x.payment_method),
        userName(x.created_by),
        fmt(Number(x.amount || 0)),
      ]),
      foot: [["", "", "", "", "", "", "Total", fmt(expenseTotal)]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 41, 59] },
      footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: "bold" },
    });
    doc.output("dataurlnewwindow");
  };

  /* ---------------- employees & salary ---------------- */
  const openEmployee = (row?: Employee) => {
    setEmpEdit(row ?? null);
    setEmpForm(row ? {
      name: row.name,
      designation: row.designation ?? "",
      branch_id: row.branch_id ?? "",
      monthly_salary: String(row.monthly_salary ?? ""),
      phone: row.phone ?? "",
      active: row.active,
    } : { name: "", designation: "", branch_id: "", monthly_salary: "", phone: "", active: true });
    setEmpOpen(true);
  };

  const saveEmployee = async () => {
    if (!empForm.name.trim()) { toast.error("Name is required"); return; }
    const payload: any = {
      name: empForm.name.trim(),
      designation: empForm.designation || null,
      branch_id: empForm.branch_id || null,
      monthly_salary: Number(empForm.monthly_salary || 0),
      phone: empForm.phone || null,
      active: empForm.active,
    };
    const res = empEdit
      ? await supabase.from("employees").update({ ...payload, updated_by: user?.email ?? null }).eq("id", empEdit.id)
      : await supabase.from("employees").insert({ ...payload, created_by: user?.id ?? null });
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(empEdit ? "Employee updated" : "Employee added");
    setEmpOpen(false);
    load();
  };

  const deleteEmployee = async (id: string) => {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Employee deleted");
    load();
  };

  const monthEmployees = useMemo(
    () => employees.filter((e) => e.active && (salBranch === "all" || e.branch_id === salBranch)),
    [employees, salBranch]
  );

  const paidFor = (empId: string) => salaries.find((s) => s.employee_id === empId && s.salary_month === salMonth);

  const salaryTotals = useMemo(() => {
    let payable = 0, paid = 0;
    monthEmployees.forEach((e) => {
      payable += Number(e.monthly_salary || 0);
      const p = paidFor(e.id);
      if (p) paid += Number(p.amount || 0);
    });
    return { payable, paid, due: payable - paid };
  }, [monthEmployees, salaries, salMonth]);

  const openPay = (emp: Employee) => {
    const existing = paidFor(emp.id);
    setPayTarget(emp);
    setPayForm({
      amount: String(existing?.amount ?? emp.monthly_salary ?? ""),
      paid_date: (existing?.paid_date ?? "").slice(0, 10) || today(),
      payment_method: existing?.payment_method ?? "cash",
      note: existing?.note ?? "",
    });
  };

  const savePay = async () => {
    if (!payTarget) return;
    const existing = paidFor(payTarget.id);
    const payload: any = {
      employee_id: payTarget.id,
      salary_month: salMonth,
      amount: Number(payForm.amount || 0),
      paid_date: payForm.paid_date ? new Date(payForm.paid_date).toISOString() : null,
      payment_method: payForm.payment_method,
      note: payForm.note || null,
    };
    const res = existing
      ? await supabase.from("salary_payments").update({ ...payload, updated_by: user?.email ?? null }).eq("id", existing.id)
      : await supabase.from("salary_payments").insert({ ...payload, created_by: user?.id ?? null });
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Salary saved");
    setPayTarget(null);
    load();
  };

  const deletePay = async (id: string) => {
    const { error } = await supabase.from("salary_payments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Salary record removed");
    load();
  };

  const salaryReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Salary Sheet", 14, 16);
    doc.setFontSize(9);
    doc.text(`Month: ${salMonth}   |   Branch: ${salBranch === "all" ? "All" : branchName(salBranch)}   |   Generated: ${new Date().toLocaleString()}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["#", "Employee", "Designation", "Branch", "Salary", "Paid", "Method", "Paid Date"]],
      body: monthEmployees.map((e, i) => {
        const p = paidFor(e.id);
        return [
          String(i + 1),
          e.name,
          e.designation ?? "—",
          branchName(e.branch_id),
          fmt(Number(e.monthly_salary || 0)),
          p ? fmt(Number(p.amount || 0)) : "Unpaid",
          p ? methodLabel(p.payment_method) : "—",
          p?.paid_date ? p.paid_date.slice(0, 10) : "—",
        ];
      }),
      foot: [["", "Total", "", "", fmt(salaryTotals.payable), fmt(salaryTotals.paid), "", ""]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 41, 59] },
      footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: "bold" },
    });
    doc.output("dataurlnewwindow");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary/80 font-semibold">
          <Building2 className="h-3.5 w-3.5" /> Finance · Office Account
        </div>
        <h1 className="mt-2 text-3xl font-display font-bold tracking-tight">Office Account</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-xl">
          Office running costs by category and monthly employee salary management.
        </p>
      </div>

      <Tabs defaultValue="cost">
        <TabsList>
          <TabsTrigger value="cost" className="gap-1.5"><Wallet className="h-4 w-4" /> Office Cost</TabsTrigger>
          <TabsTrigger value="salary" className="gap-1.5"><Users className="h-4 w-4" /> Employee Salary</TabsTrigger>
        </TabsList>

        {/* ---------- OFFICE COST ---------- */}
        <TabsContent value="cost" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Total Cost</p>
              <p className="mt-1 text-2xl font-bold">{fmt(expenseTotal)}</p>
              <p className="text-xs text-muted-foreground">{filteredExpenses.length} entries</p>
            </Card>
            <Card className="p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">By Category</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {byCategory.length === 0 ? <span className="text-sm text-muted-foreground">No data</span> :
                  byCategory.map(([name, amt]) => (
                    <Badge key={name} variant="secondary" className="text-xs">{name}: {fmt(amt)}</Badge>
                  ))}
              </div>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={fBranch} onValueChange={setFBranch}>
              <SelectTrigger className="sm:w-44"><SelectValue placeholder="Branch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fCategory} onValueChange={setFCategory}>
              <SelectTrigger className="sm:w-48"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="month" value={fMonth} onChange={(e) => setFMonth(e.target.value)} className="sm:w-40" />
            <Input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className="sm:w-40" />
            <span className="text-xs text-muted-foreground">to</span>
            <Input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className="sm:w-40" />
            {(fMonth || fFrom || fTo || fBranch !== "all" || fCategory !== "all") && (
              <Button variant="outline" onClick={() => { setFMonth(""); setFFrom(""); setFTo(""); setFBranch("all"); setFCategory("all"); }}>Clear</Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="outline" className="gap-1.5" onClick={() => setCatOpen(true)}>Categories</Button>
              <Button variant="outline" className="gap-1.5" onClick={costReport}><FileText className="h-4 w-4" /> Report</Button>
              <Button className="gap-1.5" onClick={() => openExpense()}><Plus className="h-4 w-4" /> Add Cost</Button>
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filteredExpenses.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No office costs yet.</TableCell></TableRow>
                ) : filteredExpenses.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell>{(x.expense_date ?? "").slice(0, 10)}</TableCell>
                    <TableCell>{catName(x.category_id)}</TableCell>
                    <TableCell>{branchName(x.branch_id)}</TableCell>
                    <TableCell className="font-medium">{x.purpose}</TableCell>
                    <TableCell>{methodLabel(x.payment_method)}</TableCell>
                    <TableCell className="text-muted-foreground">{userName(x.created_by)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{fmt(Number(x.amount || 0))}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openExpense(x)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteExpense(x.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ---------- SALARY ---------- */}
        <TabsContent value="salary" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Monthly Payable</p>
              <p className="mt-1 text-2xl font-bold">{fmt(salaryTotals.payable)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Paid ({salMonth})</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(salaryTotals.paid)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Remaining</p>
              <p className="mt-1 text-2xl font-bold text-destructive">{fmt(salaryTotals.due)}</p>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input type="month" value={salMonth} onChange={(e) => setSalMonth(e.target.value)} className="sm:w-40" />
            <Select value={salBranch} onValueChange={setSalBranch}>
              <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" className="gap-1.5" onClick={salaryReport}><FileText className="h-4 w-4" /> Salary Sheet</Button>
              <Button className="gap-1.5" onClick={() => openEmployee()}><Plus className="h-4 w-4" /> Add Employee</Button>
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-right">Monthly Salary</TableHead>
                  <TableHead>Status ({salMonth})</TableHead>
                  <TableHead>Paid By</TableHead>
                  <TableHead className="w-40 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>
                ) : monthEmployees.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No employees yet.</TableCell></TableRow>
                ) : monthEmployees.map((e) => {
                  const p = paidFor(e.id);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell>{e.designation ?? "—"}</TableCell>
                      <TableCell>{branchName(e.branch_id)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(Number(e.monthly_salary || 0))}</TableCell>
                      <TableCell>
                        {p ? (
                          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Paid {fmt(Number(p.amount || 0))} · {methodLabel(p.payment_method)}</Badge>
                        ) : (
                          <Badge variant="secondary">Unpaid</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p ? userName(p.created_by) : "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => openPay(e)}>{p ? "Edit Pay" : "Pay"}</Button>
                          {p && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deletePay(p.id)}><Trash2 className="h-4 w-4" /></Button>}
                          <Button variant="ghost" size="icon" onClick={() => openEmployee(e)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteEmployee(e.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Categories dialog */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cost Categories</DialogTitle></DialogHeader>
          <div className="flex gap-2">
            <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category name" />
            <Button onClick={addCategory}>Add</Button>
          </div>
          <div className="mt-2 max-h-72 space-y-1 overflow-auto">
            {categories.length === 0 && <p className="text-sm text-muted-foreground">No categories yet.</p>}
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>{c.name}</span>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteCategory(c.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cost dialog */}
      <Dialog open={expOpen} onOpenChange={setExpOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{expEdit ? "Edit Office Cost" : "Add Office Cost"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Purpose</Label>
              <Input value={expForm.purpose} onChange={(e) => setExpForm({ ...expForm, purpose: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (SR)</Label>
                <Input type="number" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={expForm.expense_date} onChange={(e) => setExpForm({ ...expForm, expense_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={expForm.category_id || "__none__"} onValueChange={(v) => setExpForm({ ...expForm, category_id: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No category</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Branch</Label>
                <Select value={expForm.branch_id || "__none__"} onValueChange={(v) => setExpForm({ ...expForm, branch_id: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No branch</SelectItem>
                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={expForm.payment_method} onValueChange={(v) => setExpForm({ ...expForm, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m: any) => (
                    <SelectItem key={typeof m === "string" ? m : m.value} value={typeof m === "string" ? m : m.value}>
                      {methodLabel(typeof m === "string" ? m : m.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note</Label>
              <Input value={expForm.note} onChange={(e) => setExpForm({ ...expForm, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter><Button onClick={saveExpense}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee dialog */}
      <Dialog open={empOpen} onOpenChange={setEmpOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{empEdit ? "Edit Employee" : "Add Employee"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Designation</Label>
                <Input value={empForm.designation} onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })} />
              </div>
              <div>
                <Label>Monthly Salary (SR)</Label>
                <Input type="number" value={empForm.monthly_salary} onChange={(e) => setEmpForm({ ...empForm, monthly_salary: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Branch</Label>
                <Select value={empForm.branch_id || "__none__"} onValueChange={(v) => setEmpForm({ ...empForm, branch_id: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No branch</SelectItem>
                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={empForm.phone} onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label>Active</Label>
              <Switch checked={empForm.active} onCheckedChange={(v) => setEmpForm({ ...empForm, active: v })} />
            </div>
          </div>
          <DialogFooter><Button onClick={saveEmployee}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Salary pay dialog */}
      <Dialog open={!!payTarget} onOpenChange={(v) => { if (!v) setPayTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Salary · {payTarget?.name} · {salMonth}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (SR)</Label>
                <Input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
              </div>
              <div>
                <Label>Paid Date</Label>
                <Input type="date" value={payForm.paid_date} onChange={(e) => setPayForm({ ...payForm, paid_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={payForm.payment_method} onValueChange={(v) => setPayForm({ ...payForm, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m: any) => (
                    <SelectItem key={typeof m === "string" ? m : m.value} value={typeof m === "string" ? m : m.value}>
                      {methodLabel(typeof m === "string" ? m : m.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note</Label>
              <Input value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter><Button onClick={savePay}>Save Salary</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
