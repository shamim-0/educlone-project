import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, Building2, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId?: string;
  username?: string;
}

interface ActivityItem {
  at: string;
  kind: string;
  detail: string;
  company_id?: string | null;
  company_name?: string;
}

const KIND_CLASS: Record<string, string> = {
  "Service Status": "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40",
  "Company Profile": "bg-primary/15 text-primary border-primary/40",
  "Installment": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
  "Extra Deal": "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
  "Manager": "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/40",
  "Shareholder": "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/40",
  "CR Activity": "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40",
  "Document": "bg-muted text-foreground border-border",
  "To Do Task": "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40",
};

const today = () => format(new Date(), "yyyy-MM-dd");
const daysAgo = (n: number) => format(new Date(Date.now() - n * 86400000), "yyyy-MM-dd");

export function UserActivityDialog({ open, onOpenChange, userId, username }: Props) {
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(today());
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId || !username) return;
    setLoading(true);
    const start = new Date(`${from}T00:00:00`).toISOString();
    const end = new Date(`${to}T23:59:59.999`).toISOString();
    try {
      const [steps, comps, insts, extras, mgrs, shs, crs, docs, todos] = await Promise.all([
        supabase.from("company_steps").select("company_id, step_key, status, updated_at, update_status_by")
          .eq("update_status_by", username).gte("updated_at", start).lte("updated_at", end),
        supabase.from("companies").select("id, name, updated_at, update_by")
          .eq("update_by", username).gte("updated_at", start).lte("updated_at", end),
        supabase.from("company_installments").select("company_id, amount, invoice_no, created_at, created_by")
          .eq("created_by", userId).gte("created_at", start).lte("created_at", end),
        supabase.from("company_extra_deals").select("company_id, note, amount, updated_at, updated_by")
          .eq("updated_by", username).gte("updated_at", start).lte("updated_at", end),
        supabase.from("company_managers").select("company_id, name, manager_type, updated_at, updated_by")
          .eq("updated_by", username).gte("updated_at", start).lte("updated_at", end),
        supabase.from("company_shareholders").select("company_id, name, created_at, updated_by")
          .eq("updated_by", username).gte("created_at", start).lte("created_at", end),
        supabase.from("cr_activities").select("company_id, label, created_at, updated_by")
          .eq("updated_by", username).gte("created_at", start).lte("created_at", end),
        supabase.from("company_documents").select("company_id, file_name, created_at, uploaded_by")
          .eq("uploaded_by", userId).gte("created_at", start).lte("created_at", end),
        supabase.from("todo_tasks").select("company_id, status, updated_at, assigned_to")
          .eq("assigned_to", userId).gte("updated_at", start).lte("updated_at", end),
      ]);

      const rows: ActivityItem[] = [];
      ((steps.data ?? []) as any[]).forEach((r) => rows.push({
        at: r.updated_at, kind: "Service Status", company_id: r.company_id,
        detail: `${r.step_key.replace(/_/g, " ")} → ${String(r.status).replace(/_/g, " ")}`,
      }));
      ((comps.data ?? []) as any[]).forEach((r) => rows.push({
        at: r.updated_at, kind: "Company Profile", company_id: r.id, detail: "Profile updated",
      }));
      ((insts.data ?? []) as any[]).forEach((r) => rows.push({
        at: r.created_at, kind: "Installment", company_id: r.company_id,
        detail: `Invoice ISBI${String(r.invoice_no).padStart(5, "0")} · ${Number(r.amount).toLocaleString()}`,
      }));
      ((extras.data ?? []) as any[]).forEach((r) => rows.push({
        at: r.updated_at, kind: "Extra Deal", company_id: r.company_id,
        detail: `${r.note ?? "Extra"} · ${Number(r.amount).toLocaleString()}`,
      }));
      ((mgrs.data ?? []) as any[]).forEach((r) => rows.push({
        at: r.updated_at, kind: "Manager", company_id: r.company_id, detail: `${r.manager_type}: ${r.name}`,
      }));
      ((shs.data ?? []) as any[]).forEach((r) => rows.push({
        at: r.created_at, kind: "Shareholder", company_id: r.company_id, detail: r.name,
      }));
      ((crs.data ?? []) as any[]).forEach((r) => rows.push({
        at: r.created_at, kind: "CR Activity", company_id: r.company_id, detail: r.label,
      }));
      ((docs.data ?? []) as any[]).forEach((r) => rows.push({
        at: r.created_at, kind: "Document", company_id: r.company_id, detail: `Uploaded ${r.file_name}`,
      }));
      ((todos.data ?? []) as any[]).forEach((r) => rows.push({
        at: r.updated_at, kind: "To Do Task", company_id: r.company_id,
        detail: `Task status: ${String(r.status).replace(/_/g, " ")}`,
      }));

      const ids = Array.from(new Set(rows.map((r) => r.company_id).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: co } = await supabase.from("companies").select("id, name").in("id", ids);
        const map = new Map<string, string>();
        ((co ?? []) as any[]).forEach((c) => map.set(c.id, c.name));
        rows.forEach((r) => { if (r.company_id) r.company_name = map.get(r.company_id); });
      }

      rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      setItems(rows);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, [userId, username, from, to]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const grouped = useMemo(() => {
    const m = new Map<string, ActivityItem[]>();
    items.forEach((i) => {
      const day = format(new Date(i.at), "PP");
      if (!m.has(day)) m.set(day, []);
      m.get(day)!.push(i);
    });
    return Array.from(m.entries());
  }, [items]);

  const exportPdf = () => {
    if (items.length === 0) { toast.error("No activity to export"); return; }
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Activity Report — ${username ?? ""}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${format(new Date(from), "PP")} to ${format(new Date(to), "PP")}`, 14, 22);
    doc.text(`Total actions: ${items.length}`, 14, 28);
    autoTable(doc, {
      startY: 34,
      head: [["Date", "Time", "Type", "Company", "Detail"]],
      body: items.map((i) => [
        format(new Date(i.at), "PP"),
        format(new Date(i.at), "p"),
        i.kind,
        i.company_name ?? "—",
        i.detail,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: { 4: { cellWidth: 60 } },
    });
    doc.save(`Activity - ${username ?? "user"} - ${from} to ${to}.pdf`);
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Activity — {username}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
          </div>
          <Button variant="outline" size="sm" onClick={() => { setFrom(today()); setTo(today()); }}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => { setFrom(daysAgo(7)); setTo(today()); }}>7 days</Button>
          <Button variant="outline" size="sm" onClick={() => { setFrom(daysAgo(30)); setTo(today()); }}>30 days</Button>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{items.length} actions</span>
            <Button size="sm" onClick={exportPdf} disabled={loading || items.length === 0}>
              <FileDown className="mr-1 h-4 w-4" /> Export PDF
            </Button>
          </div>
        </div>


        <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
          {loading ? (
            <Card className="p-6 text-center text-muted-foreground">Loading…</Card>
          ) : grouped.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">No activity in this date range.</Card>
          ) : grouped.map(([day, list]) => (
            <div key={day}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day}</div>
              <ul className="divide-y rounded-lg border">
                {list.map((i, idx) => (
                  <li key={idx} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                    <Badge className={`border shrink-0 ${KIND_CLASS[i.kind] ?? ""}`}>{i.kind}</Badge>
                    {i.company_id && (
                      <Link to={`/company/${i.company_id}`} className="inline-flex items-center gap-1 font-medium hover:underline">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {i.company_name ?? "—"}
                      </Link>
                    )}
                    <span className="text-muted-foreground">{i.detail}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{format(new Date(i.at), "p")}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
