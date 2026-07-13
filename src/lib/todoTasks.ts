import { supabase } from "@/integrations/supabase/client";
import type { TodoTaskCardData } from "@/components/TodoTaskCard";

interface FetchOpts {
  assignedTo?: string;
  createdBy?: string;
  creatorRole?: "admin" | "editor";
}

export async function fetchTodoTasks(opts: FetchOpts = {}): Promise<TodoTaskCardData[]> {
  let q = supabase
    .from("todo_tasks")
    .select("id,company_id,assigned_to,created_by,creator_role,deadline,admin_note,editor_note,status,created_at")
    .order("created_at", { ascending: false });

  if (opts.assignedTo) q = q.eq("assigned_to", opts.assignedTo);
  if (opts.createdBy) q = q.eq("created_by", opts.createdBy);
  if (opts.creatorRole) q = q.eq("creator_role", opts.creatorRole);

  const { data: tasks, error } = await q;
  if (error) throw error;
  const taskRows = (tasks ?? []) as any[];
  if (taskRows.length === 0) return [];

  const taskIds = taskRows.map((t) => t.id);
  const companyIds = Array.from(new Set(taskRows.map((t) => t.company_id)));
  const userIds = Array.from(new Set([
    ...taskRows.map((t) => t.assigned_to),
    ...taskRows.map((t) => t.created_by),
  ]));

  const [svcRes, coRes, profRes, stepsRes] = await Promise.all([
    supabase.from("todo_task_services").select("task_id, service_key").in("task_id", taskIds),
    supabase.from("companies").select("id, name").in("id", companyIds),
    supabase.from("profiles").select("id, username").in("id", userIds),
    supabase.from("company_steps").select("company_id, step_key, status").in("company_id", companyIds),
  ]);

  const svcMap = new Map<string, string[]>();
  ((svcRes.data ?? []) as any[]).forEach((r) => {
    if (!svcMap.has(r.task_id)) svcMap.set(r.task_id, []);
    svcMap.get(r.task_id)!.push(r.service_key);
  });

  const coMap = new Map<string, string>();
  ((coRes.data ?? []) as any[]).forEach((r) => coMap.set(r.id, r.name));

  const profMap = new Map<string, string>();
  ((profRes.data ?? []) as any[]).forEach((r) => profMap.set(r.id, r.username));

  const stepMap = new Map<string, Map<string, string>>();
  ((stepsRes.data ?? []) as any[]).forEach((r) => {
    if (!stepMap.has(r.company_id)) stepMap.set(r.company_id, new Map());
    stepMap.get(r.company_id)!.set(r.step_key, r.status);
  });

  return taskRows.map((t) => {
    const services = svcMap.get(t.id) ?? [];
    const serviceStatuses: Record<string, string> = {};
    let done = 0;
    services.forEach((k) => {
      const s = stepMap.get(t.company_id)?.get(k) ?? "pending";
      serviceStatuses[k] = s;
      if (s === "done" || s === "no_need") done++;
    });
    const progress = services.length === 0 ? 0 : Math.round((done / services.length) * 100);
    return {
      id: t.id,
      company_id: t.company_id,
      company_name: coMap.get(t.company_id) ?? "—",
      assigned_to: t.assigned_to,
      assigned_to_username: profMap.get(t.assigned_to) ?? "—",
      created_by: t.created_by,
      created_by_username: profMap.get(t.created_by) ?? "—",
      creator_role: t.creator_role,
      deadline: t.deadline,
      admin_note: t.admin_note,
      editor_note: t.editor_note,
      status: t.status,
      services,
      serviceStatuses,
      progress,
    } as TodoTaskCardData;
  });
}
