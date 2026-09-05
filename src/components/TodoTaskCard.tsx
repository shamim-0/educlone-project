import { useState } from "react";
import { Link } from "react-router-dom";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { Building2, Calendar as CalendarIcon, User, Pencil, Trash2, AlertTriangle, Clock, ExternalLink, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useServiceDefs } from "@/hooks/useServiceDefs";

export interface TodoTaskCardData {
  id: string;
  company_id: string;
  company_name: string;
  assigned_to: string;
  assigned_to_username: string;
  created_by: string;
  created_by_username: string;
  creator_role: "admin" | "sub_admin" | "editor";
  deadline: string | null;
  admin_note: string | null;
  editor_note: string | null;
  status: "pending" | "in_progress" | "completed";
  services: string[];
  /** per-service company_steps status keyed by service key */
  serviceStatuses?: Record<string, string>;
  /** progress 0-100 for selected services on the company */
  progress: number;
}

interface Props {
  task: TodoTaskCardData;
  /** admin | editor_assignee | editor_owner */
  perspective: "admin" | "editor_assignee" | "editor_owner";
  onChanged?: () => void;
  onEdit?: (task: TodoTaskCardData) => void;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40" },
  in_progress: { label: "In Progress", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40" },
  completed: { label: "Completed", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40" },
};

function deadlineTone(deadline: string | null, status: string) {
  if (!deadline || status === "completed") return { className: "text-muted-foreground", icon: CalendarIcon, label: "" };
  const days = differenceInCalendarDays(parseISO(deadline), new Date());
  if (days < 0) return { className: "text-destructive font-semibold", icon: AlertTriangle, label: `Over Date ${Math.abs(days)}d` };
  if (days <= 3) return { className: "text-amber-600 dark:text-amber-400 font-semibold", icon: Clock, label: `${days}d left` };
  return { className: "text-foreground", icon: CalendarIcon, label: `${days}d left` };
}

export function TodoTaskCard({ task, perspective, onChanged, onEdit }: Props) {
  const defs = useServiceDefs();
  const [status, setStatus] = useState(task.status);
  const [editorNote, setEditorNote] = useState(task.editor_note ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const statusMeta = STATUS_META[status] ?? STATUS_META.pending;
  const dTone = deadlineTone(task.deadline, status);
  const DIcon = dTone.icon;

  const canEdit = perspective === "admin" || perspective === "editor_owner";
  const canDelete = perspective === "admin" || perspective === "editor_owner";
  const canStatus = true; // all perspectives can change status
  const canEditorNote = perspective === "editor_assignee" || perspective === "editor_owner" || perspective === "admin";

  const serviceLabels = task.services.map((k) => defs.find((d) => d.key === k)?.label ?? k);

  const save = async () => {
    setSaving(true);
    const patch: any = { status };
    if (canEditorNote) patch.editor_note = editorNote || null;
    const { error } = await supabase.from("todo_tasks").update(patch).eq("id", task.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onChanged?.();
  };

  const remove = async () => {
    if (!confirm("Delete this task?")) return;
    setDeleting(true);
    const { error } = await supabase.from("todo_tasks").delete().eq("id", task.id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    onChanged?.();
  };

  return (
    <Card className="overflow-hidden shadow-card">
      <div className="flex items-start justify-between gap-3 border-b bg-gradient-to-r from-primary/5 to-transparent px-5 py-3">
        <div className="min-w-0">
          <Link
            to={`/company/${task.company_id}`}
            className="flex items-center gap-2 font-display text-base font-bold hover:underline"
          >
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{task.company_name}</span>
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" /> Assigned by <span className="font-medium text-foreground">{task.created_by_username}</span>
              <Badge variant="outline" className="ml-1 h-4 px-1 text-[9px] uppercase">{task.creator_role}</Badge>
            </span>
            {perspective === "admin" && (
              <span className="inline-flex items-center gap-1">
                → <span className="font-medium text-foreground">{task.assigned_to_username}</span>
              </span>
            )}
          </div>
        </div>
        <Badge className={cn("border shrink-0", statusMeta.className)}>{statusMeta.label}</Badge>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap gap-1.5">
          {task.services.map((k, i) => {
            const label = defs.find((d) => d.key === k)?.label ?? k;
            const st = task.serviceStatuses?.[k];
            const isDone = st === "done" || st === "no_need";
            return isDone ? (
              <Badge
                key={i}
                className="border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-medium gap-1"
              >
                <CheckCircle2 className="h-3 w-3" />
                {label}
              </Badge>
            ) : (
              <Badge key={i} variant="secondary" className="text-xs font-medium">{label}</Badge>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deadline</div>
            <div className={cn("mt-1 inline-flex items-center gap-1.5 text-sm", dTone.className)}>
              <DIcon className="h-4 w-4" />
              {task.deadline ? (
                <>
                  <span>{format(parseISO(task.deadline), "PP")}</span>
                  {dTone.label && <span className="text-xs">· {dTone.label}</span>}
                </>
              ) : (
                <span className="text-muted-foreground">No deadline</span>
              )}
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Company Progress</span>
              <span className="text-foreground">{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-2 transition-all duration-500" />
          </div>
        </div>

        {task.admin_note && (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
            <div className="text-xs font-semibold uppercase text-primary">
              {task.creator_role === "editor" ? "Creator Note" : "Admin Note"}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{task.admin_note}</p>
          </div>
        )}

        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Editor Note</div>
          {canEditorNote && perspective !== "admin" ? (
            <Textarea
              value={editorNote}
              onChange={(e) => setEditorNote(e.target.value)}
              rows={2}
              placeholder="Add a note..."
            />
          ) : (
            <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-2 text-sm min-h-[2.25rem]">
              {task.editor_note || <span className="text-muted-foreground">—</span>}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Status</span>
            {canStatus ? (
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge className={cn("border", statusMeta.className)}>{statusMeta.label}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild className="gap-1">
              <Link to={`/company/${task.company_id}`}>
                <ExternalLink className="h-3.5 w-3.5" /> Update Task
              </Link>
            </Button>
            {canEdit && onEdit && (
              <Button size="sm" variant="outline" onClick={() => onEdit(task)} className="gap-1">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            )}
            {canDelete && (
              <Button size="sm" variant="outline" onClick={remove} disabled={deleting} className="gap-1 text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> {deleting ? "…" : "Delete"}
              </Button>
            )}
            <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
