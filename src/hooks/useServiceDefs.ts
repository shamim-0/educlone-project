import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STEP_DEFS as FALLBACK } from "@/lib/steps";

export interface ServiceDef {
  id?: string;
  key: string;
  label: string;
  tags: string[];
  hasCreds?: boolean;
  sort_order?: number;
}

let cache: ServiceDef[] | null = null;
const listeners = new Set<(d: ServiceDef[]) => void>();

async function load() {
  const { data, error } = await supabase
    .from("services")
    .select("id,key,label,tags,has_creds,sort_order")
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
      sort_order: r.sort_order,
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
