import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { TodoTaskCard, type TodoTaskCardData } from "@/components/TodoTaskCard";
import { useServiceDefs } from "@/hooks/useServiceDefs";
import { Search } from "lucide-react";

interface Props {
  tasks: TodoTaskCardData[];
  perspective: "admin" | "editor_assignee" | "editor_owner" | "editor_mixed";
  onChanged?: () => void;
  onEdit?: (task: TodoTaskCardData) => void;
  loading?: boolean;
  empty?: string;
}

export function TodoListView({ tasks, perspective, onChanged, onEdit, loading, empty }: Props) {
  const defs = useServiceDefs();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("deadline_asc");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = tasks.filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (!q) return true;
      if (t.company_name.toLowerCase().includes(q)) return true;
      const labels = t.services.map((k) => defs.find((d) => d.key === k)?.label ?? k);
      return labels.some((l) => l.toLowerCase().includes(q));
    });
    arr = [...arr].sort((a, b) => {
      const ad = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
      if (sortBy === "deadline_asc") return ad - bd;
      if (sortBy === "deadline_desc") return bd - ad;
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return 0;
    });
    return arr;
  }, [tasks, search, status, sortBy, defs]);

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company or service..."
              className="pl-8"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="deadline_asc">Deadline (soonest)</SelectItem>
              <SelectItem value="deadline_desc">Deadline (latest)</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">{empty ?? "No tasks."}</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((t) => {
            let p: "admin" | "editor_assignee" | "editor_owner";
            if (perspective === "admin") p = "admin";
            else if (perspective === "editor_owner") p = "editor_owner";
            else if (perspective === "editor_assignee") p = "editor_assignee";
            else p = t.creator_role === "editor" ? "editor_owner" : "editor_assignee";
            return (
              <TodoTaskCard
                key={t.id}
                task={t}
                perspective={p}
                onChanged={onChanged}
                onEdit={onEdit}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
