import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListTodo, Plus } from "lucide-react";
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

      <TodoListView
        tasks={activeTasks}
        perspective="admin"
        loading={loading}
        onChanged={load}
        onEdit={openEdit}
        empty="No tasks yet. Create one to get started."
      />

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
