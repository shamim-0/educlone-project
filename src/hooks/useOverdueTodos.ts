import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Returns overdue counts for the current user's todo tasks.
 * - mine: tasks assigned to current user, deadline < today, status != completed
 * - all: any task (admin view), deadline < today, status != completed
 */
export function useOverdueTodos() {
  const { user, role } = useAuth();
  const [mine, setMine] = useState(0);
  const [all, setAll] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);

    const load = async () => {
      const mineRes = await supabase
        .from("todo_tasks")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", user.id)
        .neq("status", "completed")
        .lt("deadline", today);
      if (cancelled) return;
      setMine(mineRes?.count ?? 0);

      if (role === "admin" || role === "sub_admin" || role === "editor") {
        const allRes = await supabase
          .from("todo_tasks")
          .select("id", { count: "exact", head: true })
          .neq("status", "completed")
          .lt("deadline", today);
        if (cancelled) return;
        setAll(allRes?.count ?? 0);
      }
    };

    load();
    const iv = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [user, role]);

  return { mine, all };
}
