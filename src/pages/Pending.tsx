import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CrudTable } from "@/components/CrudTable";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Task { id: string; title: string; description: string | null; status: string; created_at: string; }

const STATUSES = ["pending", "in_progress", "done"];

export default function PendingPage() {
  const [rows, setRows] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [status, setStatus] = useState<string>("pending");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("pending_tasks").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { document.title = "Pending | ISBI Tracker"; load(); }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: String(fd.get("title") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim() || null,
      status,
    };
    if (!payload.title) { toast.error("Title required"); return; }
    const { error } = editing
      ? await supabase.from("pending_tasks").update(payload).eq("id", editing.id)
      : await supabase.from("pending_tasks").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Updated" : "Created");
    setOpen(false); setEditing(null); load();
  };

  const onDelete = async (row: Task) => {
    if (!confirm(`Delete "${row.title}"?`)) return;
    const { error } = await supabase.from("pending_tasks").delete().eq("id", row.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <>
      <CrudTable<Task>
        title="Pending Tasks"
        description="Track tasks and their status."
        rows={rows}
        loading={loading}
        columns={[
          { key: "title", header: "Title" },
          { key: "description", header: "Description", render: (r) => r.description ?? "—" },
          { key: "status", header: "Status", render: (r) => (
            <Badge variant={r.status === "done" ? "default" : r.status === "in_progress" ? "secondary" : "outline"} className="capitalize">
              {r.status.replace("_", " ")}
            </Badge>
          )},
          { key: "created_at", header: "Created", render: (r) => new Date(r.created_at).toLocaleDateString() },
        ]}
        onAdd={() => { setEditing(null); setStatus("pending"); setOpen(true); }}
        onEdit={(r) => { setEditing(r); setStatus(r.status); setOpen(true); }}
        onDelete={onDelete}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Task</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div><Label htmlFor="title">Title</Label><Input id="title" name="title" defaultValue={editing?.title} required maxLength={200} /></div>
            <div><Label htmlFor="description">Description</Label><Textarea id="description" name="description" defaultValue={editing?.description ?? ""} maxLength={1000} /></div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter><Button type="submit">{editing ? "Save" : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
