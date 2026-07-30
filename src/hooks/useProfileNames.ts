import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Maps user id -> username, for resolving audit fields that store uuids. */
export function useProfileNames() {
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from("profiles").select("id, username");
      if (!active || !data) return;
      const map: Record<string, string> = {};
      data.forEach((p: any) => { if (p.id) map[p.id] = p.username ?? ""; });
      setNames(map);
    })();
    return () => { active = false; };
  }, []);

  return names;
}
