import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { GripVertical, Save, Plus, Trash2, ListChecks, Pencil, X, Check, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { refreshServiceDefs, type ServiceDef } from "@/hooks/useServiceDefs";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

interface Row extends ServiceDef {
  id: string;
  sort_order: number;
  followupMessages?: string[];
}

export default function ServicesPage() {
  const { role } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [msgRow, setMsgRow] = useState<Row | null>(null);
  const [msgs, setMsgs] = useState<string[]>(["", "", ""]);
  const [savingMsgs, setSavingMsgs] = useState(false);

  useEffect(() => {
    document.title = "Services | ISBI Tracker";
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select("id,key,label,tags,has_creds,sort_order,followup_messages")
      .order("sort_order", { ascending: true });
    if (error) {
      toast.error(error.message);
    } else {
      setRows(
        (data ?? []).map((r: any) => ({
          id: r.id,
          key: r.key,
          label: r.label,
          tags: r.tags ?? [],
          hasCreds: !!r.has_creds,
          sort_order: r.sort_order,
          followupMessages: r.followup_messages ?? [],
        }))
      );
    }
    setLoading(false);
  }

  function openMsgs(r: Row) {
    setMsgRow(r);
    const cur = r.followupMessages ?? [];
    setMsgs([cur[0] ?? "", cur[1] ?? "", cur[2] ?? ""]);
  }

  async function saveMsgs() {
    if (!msgRow) return;
    setSavingMsgs(true);
    const { error } = await supabase
      .from("services")
      .update({ followup_messages: msgs } as any)
      .eq("id", msgRow.id);
    if (error) {
      toast.error(error.message);
    } else {
      setRows((prev) => prev.map((r) => (r.id === msgRow.id ? { ...r, followupMessages: msgs } : r)));
      toast.success("Follow-up messages saved");
      await refreshServiceDefs();
      setMsgRow(null);
    }
    setSavingMsgs(false);
  }


  if (role && role !== "admin" && role !== "sub_admin") return <Navigate to="/" replace />;
  const canDelete = role === "admin";

  function onDragStart(key: string) {
    setDragKey(key);
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }
  function onDrop(targetKey: string) {
    if (!dragKey || dragKey === targetKey) return;
    const from = rows.findIndex((r) => r.key === dragKey);
    const to = rows.findIndex((r) => r.key === targetKey);
    if (from < 0 || to < 0) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setRows(next);
    setDragKey(null);
  }

  async function saveOrder() {
    setSavingOrder(true);
    const updates = rows.map((r, idx) => ({ id: r.id, sort_order: (idx + 1) * 10 }));
    let ok = true;
    for (const u of updates) {
      const { error } = await supabase
        .from("services")
        .update({ sort_order: u.sort_order })
        .eq("id", u.id);
      if (error) {
        ok = false;
        toast.error(error.message);
        break;
      }
    }
    if (ok) toast.success("Order saved");
    await refreshServiceDefs();
    setSavingOrder(false);
  }

  async function saveLabel(id: string) {
    if (!editLabel.trim()) {
      toast.error("Name required");
      return;
    }
    const { error } = await supabase
      .from("services")
      .update({ label: editLabel.trim() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, label: editLabel.trim() } : r)));
    setEditingId(null);
    toast.success("Renamed");
    await refreshServiceDefs();
  }

  async function addService() {
    const label = newLabel.trim();
    if (!label) return;
    const key = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || `svc_${Date.now()}`;
    const nextOrder = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 10 : 10;
    const { data, error } = await supabase
      .from("services")
      .insert({ key, label, tags: [], has_creds: false, sort_order: nextOrder })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewLabel("");
    setRows((prev) => [
      ...prev,
      {
        id: data.id,
        key: data.key,
        label: data.label,
        tags: data.tags ?? [],
        hasCreds: !!data.has_creds,
        sort_order: data.sort_order,
      },
    ]);
    toast.success("Service added");
    await refreshServiceDefs();
  }

  async function removeService(id: string) {
    if (!confirm("Delete this service? Existing company progress for it will remain in the database but the service will disappear from views.")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("Deleted");
    await refreshServiceDefs();
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-primary/10 via-background to-accent/10 border-primary/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <ListChecks className="h-6 w-6 text-primary" /> Services
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Drag to reorder. The order here controls how services appear on the Company page and the Pending page.
            </p>
          </div>
          <Button onClick={saveOrder} disabled={savingOrder || loading}>
            <Save className="h-4 w-4 mr-1" />
            {savingOrder ? "Saving…" : "Save Order"}
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex gap-2">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="New service name (e.g. Trade License)"
            onKeyDown={(e) => e.key === "Enter" && addService()}
          />
          <Button onClick={addService} disabled={!newLabel.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, idx) => {
            const editing = editingId === r.id;
            return (
              <div
                key={r.id}
                draggable={!editing}
                onDragStart={() => onDragStart(r.key)}
                onDragOver={onDragOver}
                onDrop={() => onDrop(r.key)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors",
                  dragKey === r.key && "opacity-50",
                  "hover:border-primary/40"
                )}
              >
                <div className="cursor-grab text-muted-foreground" title="Drag to reorder">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="text-xs font-mono w-8 text-muted-foreground">{idx + 1}</div>

                <div className="flex-1 min-w-0">
                  {editing ? (
                    <div className="flex gap-2 items-center">
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveLabel(r.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <Button size="sm" onClick={() => saveLabel(r.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{r.label}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{r.key}</span>
                      {r.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                      {r.hasCreds && (
                        <Badge variant="outline" className="text-[10px]">
                          Credentials
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {!editing && (
                  <div className="flex items-center gap-1 shrink-0">
                    {r.key === "mother_company_formation_bd" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Set WhatsApp follow-up messages"
                        onClick={() => openMsgs(r)}
                      >
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(r.id);
                        setEditLabel(r.label);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {canDelete && (
                      <Button size="sm" variant="ghost" onClick={() => removeService(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!msgRow} onOpenChange={(o) => !o && setMsgRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>WhatsApp Follow-up Messages</DialogTitle>
            <DialogDescription>
              Prefilled messages for {msgRow?.label}. Placeholders: <code>{"{company}"}</code>, <code>{"{cr}"}</code>, <code>{"{isbi}"}</code>. Leave blank to use default.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-1">
                <label className="text-xs font-medium">{i + 1}{i === 0 ? "st" : i === 1 ? "nd" : "rd"} Follow-up (after {[3, 6, 9][i]} working days)</label>
                <Textarea
                  rows={3}
                  value={msgs[i]}
                  onChange={(e) => setMsgs((prev) => prev.map((m, idx) => (idx === i ? e.target.value : m)))}
                  placeholder={`Hello, this is a follow-up regarding ${msgRow?.label} for {company}.`}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMsgRow(null)}>Cancel</Button>
            <Button onClick={saveMsgs} disabled={savingMsgs}>
              {savingMsgs ? "Saving…" : "Save Messages"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
