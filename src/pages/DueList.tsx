import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface DueItem {
  id: string;
  name: string;
  due: number;
  deal: number;
  received: number;
}

const fmt = (n: number) =>
  `${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SR`;

export default function DueList() {
  const { role, branchId } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<DueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

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
        .filter((x) => allowedIds.has(x.company_id))
        .forEach((x) => {
          instMap[x.company_id] = (instMap[x.company_id] ?? 0) + Number(x.amount || 0);
        });

      const extraMap: Record<string, number> = {};
      ((e.data as any[]) ?? [])
        .filter((x) => allowedIds.has(x.company_id))
        .forEach((x) => {
          extraMap[x.company_id] = (extraMap[x.company_id] ?? 0) + Number(x.amount || 0);
        });

      const dues = cList
        .map((x) => {
          const deal = Number(x.total_deal || 0) + (extraMap[x.id] ?? 0);
          const net = deal - Number(x.discount || 0);
          const received = instMap[x.id] ?? 0;
          return {
            id: x.id,
            name: x.name,
            deal: net,
            received,
            due: net - received,
          };
        })
        .filter((x) => x.due > 0)
        .sort((a, b) => b.due - a.due);

      setItems(dues);
      setLoading(false);
    };

    load();
  }, [role, branchId]);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          !q ||
          i.name.toLowerCase().includes(q.toLowerCase())
      ),
    [items, q]
  );
  const total = useMemo(() => filtered.reduce((s, i) => s + i.due, 0), [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Due List</h1>
          <p className="text-sm text-muted-foreground">
            Outstanding balances across active companies
          </p>
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2">
          <div className="text-[11px] font-semibold uppercase text-destructive/80">Total Due</div>
          <div className="text-lg font-bold text-destructive">{fmt(total)}</div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search company…"
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr className="text-left text-xs font-semibold uppercase text-muted-foreground">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3 text-right">Net Deal</th>
              <th className="px-4 py-3 text-right">Received</th>
              <th className="px-4 py-3 text-right">Due</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  <AlertCircle className="mx-auto mb-2 h-5 w-5" />
                  No outstanding dues.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => nav(`/company/${c.id}`)}
                  className="cursor-pointer border-t border-border transition-colors hover:bg-secondary/50"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(c.deal)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(c.received)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-destructive">
                    {fmt(c.due)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
