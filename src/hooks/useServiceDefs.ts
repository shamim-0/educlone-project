import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STEP_DEFS as FALLBACK } from "@/lib/steps";

export interface ServiceDef {
  id?: string;
  key: string;
  label: string;
  tags: string[];
  hasCreds?: boolean;
  subtasks?: string[];
  sort_order?: number;
  followupMessages?: string[];
  allowedStatuses?: string[];
}

let cache: ServiceDef[] | null = null;
const listeners = new Set<(d: ServiceDef[]) => void>();

async function load() {
  const { data, error } = await supabase
    .from("services")
    .select("id,key,label,tags,has_creds,subtasks,sort_order,followup_messages,allowed_statuses")
    .order("sort_order", { ascending: true });
  if (error || !data || data.length === 0) {
    cache = FALLBACK;
  } else {
    cache = data.map((r: any) => ({
      id: r.id,
      key: r.key,
      label: r.label,
      tags: r.tags ?? [],
      hasCreds: !!r.has_creds,
      subtasks: r.subtasks ?? [],
      sort_order: r.sort_order,
      followupMessages: r.followup_messages ?? [],
      allowedStatuses: r.allowed_statuses ?? [],
    }));
  }

  listeners.forEach((fn) => fn(cache!));
}

export function refreshServiceDefs() {
  return load();
}

export function useServiceDefs(): ServiceDef[] {
  const [defs, setDefs] = useState<ServiceDef[]>(cache ?? FALLBACK);
  useEffect(() => {
    listeners.add(setDefs);
    if (!cache) load();
    else setDefs(cache);
    return () => {
      listeners.delete(setDefs);
    };
  }, []);
  return defs;
}
