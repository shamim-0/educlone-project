import { useEffect, useMemo, useState } from "react";
import { sortCompanies } from "@/lib/companySort";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useServiceDefs } from "@/hooks/useServiceDefs";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Company { id: string; name: string; }
interface EditorUser { id: string; username: string; }

export interface TodoTaskEditPayload {
  id: string;
  company_id: string;
  assigned_to: string;
  deadline: string | null;
  admin_note: string | null;
  editor_note: string | null;
  status: string;
  creator_role: string;
  services: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
  /** actual role stored in creator_role */
  mode: "admin" | "sub_admin" | "editor";
  /** if true, behaves like admin: assign to any editor/sub_admin, all services, edit all fields */
  fullAccess?: boolean;
  /** Optional preselected assignee (full-access mode from Users page) */
  presetAssignee?: { id: string; username: string };
  /** If provided, dialog is in edit mode */
  editTask?: TodoTaskEditPayload | null;
}

export function TodoTaskDialog({ open, onOpenChange, onSaved, mode, fullAccess = false, presetAssignee, editTask }: Props) {
  const { user } = useAuth();
  const defs = useServiceDefs();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [editors, setEditors] = useState<EditorUser[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [note, setNote] = useState("");
  const [services, setServices] = useState<Set<string>>(new Set());
  const [allowedKeys, setAllowedKeys] = useState<string[] | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const isEdit = !!editTask;

  useEffect(() => {
    if (!open) return;
    (async () => {
      const c = await supabase.from("companies").select("id,name").eq("status", "active");
      setCompanies(sortCompanies((c.data as Company[]) ?? []));
      if (fullAccess || mode === "admin") {
        setAllowedKeys(null);
        const r = await supabase.from("user_roles").select("user_id, role").in("role", ["editor", "sub_admin"]);
        const ids = Array.from(new Set(((r.data as any[]) ?? []).map((x) => x.user_id)));
        if (ids.length) {
          const p = await supabase.from("profiles").select("id,username").in("id", ids).order("username");
          setEditors(((p.data as any[]) ?? []).map((x) => ({ id: x.id, username: x.username ?? "—" })));
        } else {
          setEditors([]);
        }
      } else if (user?.id) {
        const a = await supabase.from("user_service_assignments").select("service_key").eq("user_id", user.id);
        setAllowedKeys(((a.data as any[]) ?? []).map((r) => r.service_key));
      }
    })();
  }, [open, fullAccess, user?.id]);

  useEffect(() => {
    if (!open) return;
    if (editTask) {
      setCompanyId(editTask.company_id);
      setAssignedTo(editTask.assigned_to);
      setDeadline(editTask.deadline ? new Date(editTask.deadline) : undefined);
      setNote(editTask.admin_note ?? "");
      setServices(new Set(editTask.services));
    } else {
      setCompanyId("");
      setAssignedTo(presetAssignee?.id ?? (fullAccess ? "" : (user?.id ?? "")));
      setDeadline(undefined);
      setNote("");
      setServices(new Set());
    }
    setSearch("");
  }, [open, editTask, presetAssignee, fullAccess, user?.id]);

  const toggle = (key: string) => {
    setServices((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const filteredDefs = useMemo(() => {
    const allow = fullAccess || !allowedKeys ? null : new Set(allowedKeys);
    return defs.filter(
      (d) =>
        (!allow || allow.has(d.key) || services.has(d.key)) &&
        d.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [defs, search, fullAccess, allowedKeys, services]);

  const filteredCompanies = useMemo(
    () => companies.filter((c) => c.name.toLowerCase().includes(companySearch.toLowerCase())),
    [companies, companySearch]
  );

  const save = async () => {
    if (!companyId) return toast.error("Select a company");
    if (!assignedTo) return toast.error("Select an editor");
    if (services.size === 0) return toast.error("Select at least one service");
    if (!user) return;
    setSaving(true);

    if (isEdit && editTask) {
      const update: any = {
        company_id: companyId,
        deadline: deadline ? format(deadline, "yyyy-MM-dd") : null,
      };
      if (fullAccess) {
        update.assigned_to = assignedTo;
        update.admin_note = note || null;
      } else {
        update.admin_note = note || null;
      }
      const { error } = await supabase.from("todo_tasks").update(update).eq("id", editTask.id);
      if (error) { setSaving(false); return toast.error(error.message); }
      // sync services
      const { error: delErr } = await supabase.from("todo_task_services").delete().eq("task_id", editTask.id);
      if (delErr) { setSaving(false); return toast.error(delErr.message); }
      const rows = Array.from(services).map((service_key) => ({ task_id: editTask.id, service_key }));
      if (rows.length) {
        const { error: insErr } = await supabase.from("todo_task_services").insert(rows);
        if (insErr) { setSaving(false); return toast.error(insErr.message); }
      }
    } else {
      const { data, error } = await supabase.from("todo_tasks").insert({
        company_id: companyId,
        assigned_to: assignedTo,
        created_by: user.id,
        creator_role: mode,
        deadline: deadline ? format(deadline, "yyyy-MM-dd") : null,
        admin_note: note || null,
        status: "pending",
      }).select("id").single();
      if (error || !data) { setSaving(false); return toast.error(error?.message ?? "Failed"); }
      const rows = Array.from(services).map((service_key) => ({ task_id: data.id, service_key }));
      if (rows.length) {
        const { error: insErr } = await supabase.from("todo_task_services").insert(rows);
        if (insErr) { setSaving(false); return toast.error(insErr.message); }
      }
    }

    setSaving(false);
    toast.success(isEdit ? "Task updated" : "Task created");
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Task" : "New To Do Task"}
            {presetAssignee && !isEdit ? ` — ${presetAssignee.username}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <div className="p-2 sticky top-0 bg-popover z-10">
                  <Input
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Search company..."
                    className="h-8"
                  />
                </div>
                {filteredCompanies.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
                ) : filteredCompanies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {fullAccess && !presetAssignee && (
            <div>
              <Label>Assign To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Select editor / sub-admin" /></SelectTrigger>
                <SelectContent>
                  {editors.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Deadline</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !deadline && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={deadline} onSelect={setDeadline} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>{mode === "editor" ? "Note" : "Admin Note"}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Optional notes..." />
          </div>

          <div>
            <Label>Services</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services..."
              className="mt-1"
            />
            <div className="mt-2 max-h-64 overflow-y-auto rounded-md border divide-y">
              {filteredDefs.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No services.</div>
              ) : filteredDefs.map((d) => (
                <label key={d.key} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50">
                  <Checkbox checked={services.has(d.key)} onCheckedChange={() => toggle(d.key)} />
                  <span className="text-sm font-medium">{d.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{services.size} selected</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : isEdit ? "Update" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
