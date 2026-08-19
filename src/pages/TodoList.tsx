import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Folder, ListTodo, Plus } from "lucide-react";
import { toast } from "sonner";
import { TodoListView } from "@/components/TodoListView";
import { TodoTaskDialog, type TodoTaskEditPayload } from "@/components/TodoTaskDialog";
import { fetchTodoTasks } from "@/lib/todoTasks";
import type { TodoTaskCardData } from "@/components/TodoTaskCard";

export default function TodoListPage() {
  const [tasks, setTasks] = useState<TodoTaskCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<TodoTaskEditPayload | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTasks(await fetchTodoTasks());
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { document.title = "To Do List | ISBI Tracker"; load(); }, [load]);

  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== "completed"), [tasks]);

  const groups = useMemo(() => {
    const map = new Map<string, { id: string; name: string; tasks: TodoTaskCardData[] }>();
    activeTasks.forEach((t) => {
      const key = t.assigned_to;
      if (!map.has(key)) map.set(key, { id: key, name: t.assigned_to_username ?? "—", tasks: [] });
      map.get(key)!.tasks.push(t);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [activeTasks]);

  const current = groups.find((g) => g.id === selectedUser) ?? null;

  const openCreate = () => { setEditTask(null); setDialogOpen(true); };
  const openEdit = (t: TodoTaskCardData) => {
    setEditTask({
      id: t.id, company_id: t.company_id, assigned_to: t.assigned_to,
      deadline: t.deadline, admin_note: t.admin_note, editor_note: t.editor_note,
      status: t.status, creator_role: t.creator_role, services: t.services,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-primary/10 via-background to-accent/10 border-primary/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
              <ListTodo className="h-6 w-6 text-primary" /> To Do List
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Assign tasks with deadlines to editors and track progress.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New Task
          </Button>
        </div>
      </Card>

      {!current ? (
        loading ? (
          <Card className="p-8 text-center text-muted-foreground">Loading…</Card>
        ) : groups.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No tasks yet. Create one to get started.</Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => {
              const overdueCount = g.tasks.filter(
                (t) => t.deadline && new Date(t.deadline) < new Date(new Date().toDateString())
              ).length;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedUser(g.id)}
                  className="text-left"
                >
                  <Card className="flex items-center gap-3 p-4 transition-colors hover:border-primary/50 hover:bg-muted/40">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Folder className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{g.name}</div>
                      <div className="text-xs text-muted-foreground">{g.tasks.length} active task{g.tasks.length === 1 ? "" : "s"}</div>
                    </div>
                    {overdueCount > 0 && (
                      <Badge variant="destructive">{overdueCount} overdue</Badge>
                    )}
                  </Card>
                </button>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setSelectedUser(null)}>
              <ArrowLeft className="h-4 w-4" /> All Users
            </Button>
            <h2 className="font-display text-lg font-semibold">{current.name}</h2>
            <Badge variant="secondary">{current.tasks.length}</Badge>
          </div>
          <TodoListView
            tasks={current.tasks}
            perspective="admin"
            loading={false}
            onChanged={load}
            onEdit={openEdit}
            empty="No tasks for this user."
          />
        </div>
      )}

      <TodoTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="admin"
        editTask={editTask}
        onSaved={load}
      />
    </div>
  );
}
