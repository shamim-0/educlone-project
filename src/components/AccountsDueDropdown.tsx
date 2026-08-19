import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DueItem {
  id: string;
  name: string;
  due: number;
}

const fmt = (n: number) =>
  `${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SR`;

export function AccountsDueDropdown() {
  const { role, branchId } = useAuth();
  const [items, setItems] = useState<DueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const restrictToBranch = role !== "admin" && !!branchId;
      let cq = supabase
        .from("companies")
        .select("id, name, total_deal, discount, branch_id")
        .eq("status", "active");
      if (restrictToBranch) cq = cq.eq("branch_id", branchId as string);

      const [c, i, e] = await Promise.all([
        cq,
        supabase.from("company_installments").select("company_id, amount"),
        supabase.from("company_extra_deals").select("company_id, amount"),
      ]);

      if (c.error) {
        setLoading(false);
        return;
      }

      const cList = (c.data as any[]) ?? [];
      const allowedIds = new Set(cList.map((x) => x.id));

      const instMap: Record<string, number> = {};
      ((i.data as any[]) ?? [])
        .filter((x) => !restrictToBranch || allowedIds.has(x.company_id))
        .forEach((x) => {
          instMap[x.company_id] = (instMap[x.company_id] ?? 0) + Number(x.amount || 0);
        });

      const extraMap: Record<string, number> = {};
      ((e.data as any[]) ?? [])
        .filter((x) => !restrictToBranch || allowedIds.has(x.company_id))
        .forEach((x) => {
          extraMap[x.company_id] = (extraMap[x.company_id] ?? 0) + Number(x.amount || 0);
        });

      const dues = cList
        .map((x) => {
          const deal = Number(x.total_deal || 0) + (extraMap[x.id] ?? 0);
          const net = deal - Number(x.discount || 0);
          const due = net - (instMap[x.id] ?? 0);
          return { id: x.id, name: x.name, due };
        })
        .filter((x) => x.due > 0)
        .sort((a, b) => b.due - a.due);

      setItems(dues);
      setLoading(false);
    };

    load();
  }, [role, branchId]);

  const total = useMemo(() => items.reduce((s, i) => s + i.due, 0), [items]);

  return (
    <div className="min-w-[260px] max-w-xs rounded-lg border border-border bg-popover p-3 shadow-elegant">
      <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-popover-foreground">
          <AlertCircle className="h-4 w-4 text-rose-500" />
          Due List
        </div>
        <div className="text-xs font-medium text-muted-foreground">
          {items.length} companies
        </div>
      </div>
      {loading ? (
        <div className="py-3 text-center text-xs text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-3 text-center text-xs text-muted-foreground">No outstanding dues.</div>
      ) : (
        <div className="max-h-[320px] overflow-y-auto pr-1">
          <div className="mb-2 flex items-center justify-between rounded-md bg-rose-50 px-2 py-1.5 dark:bg-rose-950/30">
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Total Due</span>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{fmt(total)}</span>
          </div>
          <ul className="space-y-1">
            {items.map((c) => (
              <li
                key={c.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm",
                  "hover:bg-secondary"
                )}
              >
                <span className="truncate font-medium text-popover-foreground">{c.name}</span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                  {fmt(c.due)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
