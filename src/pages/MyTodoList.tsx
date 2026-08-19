import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListTodo, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { TodoListView } from "@/components/TodoListView";
import { TodoTaskDialog, type TodoTaskEditPayload } from "@/components/TodoTaskDialog";
import { fetchTodoTasks } from "@/lib/todoTasks";
import type { TodoTaskCardData } from "@/components/TodoTaskCard";

export default function MyTodoListPage() {
  const { user, role } = useAuth();
  const [tasks, setTasks] = useState<TodoTaskCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<TodoTaskEditPayload | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setTasks(await fetchTodoTasks({ assignedTo: user.id }));
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { document.title = "My To Do List | ISBI Tracker"; load(); }, [load]);

  const active = useMemo(() => tasks.filter((t) => t.status !== "completed"), [tasks]);
  const adminTasks = useMemo(() => active.filter((t) => t.created_by !== user?.id && t.creator_role !== "editor"), [active, user?.id]);
  const ownTasks = useMemo(() => active.filter((t) => t.created_by === user?.id), [active, user?.id]);


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
              <ListTodo className="h-6 w-6 text-primary" /> My To Do List
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tasks assigned to you and tasks you created for yourself.
            </p>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="admin">
        <TabsList>
          <TabsTrigger value="admin">Admin Assigned ({adminTasks.length})</TabsTrigger>
          <TabsTrigger value="own">My Tasks ({ownTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="admin" className="mt-4">
          <TodoListView
            tasks={adminTasks}
            perspective="editor_assignee"
            loading={loading}
            onChanged={load}
            empty="No tasks assigned by admin."
          />
        </TabsContent>

        <TabsContent value="own" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> New Task
            </Button>
          </div>
          <TodoListView
            tasks={ownTasks}
            perspective="editor_owner"
            loading={loading}
            onChanged={load}
            onEdit={openEdit}
            empty="You haven't created any tasks yet."
          />
        </TabsContent>
      </Tabs>

      <TodoTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={(role as any) ?? "editor"}
        editTask={editTask}
        onSaved={load}
      />
    </div>
  );
}
