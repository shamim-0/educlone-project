import { useEffect, useMemo, useState } from "react";
import { extractCompanyCode } from "@/lib/companySort";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useServiceDefs } from "@/hooks/useServiceDefs";
import { getApplicableServiceDefs, statusBadgeClass } from "@/lib/steps";
import { cn } from "@/lib/utils";

interface Company { id: string; name: string; type: string; branch_id: string | null; emergency: boolean; take_action: boolean; }
interface Branch { id: string; name: string; }
interface StepRow { company_id: string; step_key: string; status: string; }

export default function MyTasksPage() {
  const { user } = useAuth();
  const defs = useServiceDefs();
  const [assigned, setAssigned] = useState<string[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "My Tasks | ISBI Tracker";
    if (!user) return;
    (async () => {
      const fetchAllSteps = async () => {
        const pageSize = 1000;
        let from = 0;
        const all: StepRow[] = [];
        while (true) {
          const { data, error } = await supabase
            .from("company_steps")
            .select("company_id,step_key,status")
            .range(from, from + pageSize - 1);
          if (error) { toast.error(error.message); break; }
          const rows = (data ?? []) as StepRow[];
          all.push(...rows);
          if (rows.length < pageSize) break;
          from += pageSize;
        }
        return all;
      };
      const [a, c, b, s] = await Promise.all([
        supabase.from("user_service_assignments").select("service_key").eq("user_id", user.id),
        supabase.from("companies").select("id,name,type,branch_id,emergency,take_action").order("name"),
        supabase.from("branches").select("id,name"),
        fetchAllSteps(),
      ]);
      setAssigned(((a.data ?? []) as any[]).map((r) => r.service_key));
      setCompanies((c.data ?? []) as Company[]);
      setBranches((b.data ?? []) as Branch[]);
      setSteps(s);
      setLoading(false);
    })();
  }, [user]);

  const branchName = (id: string | null) => branches.find(x => x.id === id)?.name ?? "—";

  const stepMap = useMemo(() => {
    const m = new Map<string, Map<string, string>>();
    steps.forEach(r => {
      if (!m.has(r.company_id)) m.set(r.company_id, new Map());
      m.get(r.company_id)!.set(r.step_key, r.status);
    });
    return m;
  }, [steps]);

  const assignedSet = useMemo(() => new Set(assigned), [assigned]);

  const extractCode = extractCompanyCode;

  const defaultSort = (a: Company, b: Company) => {
    const ac = extractCode(a.name);
    const bc = extractCode(b.name);
    if (ac !== bc) return bc - ac;
    return b.name.localeCompare(a.name);
  };


  const grouped = useMemo(() => {
    const out: { def: (typeof defs)[number]; items: { company: Company; status: string }[] }[] = [];
    defs.forEach((def) => {
      if (!assignedSet.has(def.key)) return;
      const items: { company: Company; status: string }[] = [];
      companies.forEach((co) => {
        const applicable = getApplicableServiceDefs(co.type, defs);
        if (!applicable.some((d) => d.key === def.key)) return;
        const st = stepMap.get(co.id)?.get(def.key) ?? "not_started";
        if (st === "done" || st === "no_need") return;
        items.push({ company: co, status: st });
      });
      items.sort((x, y) => defaultSort(x.company, y.company));
      out.push({ def, items });
    });
    return out;
  }, [defs, assignedSet, companies, stepMap]);

  const total = grouped.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-primary/10 via-background to-accent/10 border-primary/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <ListChecks className="h-6 w-6 text-primary" /> My Tasks
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Companies with your assigned services still to complete.
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{total}</div>
            <div className="text-xs text-muted-foreground">Pending items</div>
          </div>
        </div>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : assigned.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No tasks have been assigned to you yet.
        </Card>
      ) : total === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          All assigned tasks are completed. 🎉
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ def, items }) => (
            <Card key={def.key} className="overflow-hidden">
              <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
                <div className="font-semibold">{def.label}</div>
                <Badge className="bg-primary text-primary-foreground">{items.length}</Badge>
              </div>
              {items.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">All done.</div>
              ) : (
                <ul className="divide-y">
                  {items.map(({ company, status }) => (
                    <li key={company.id} className="flex items-center justify-between px-5 py-3">
                      <Link
                        to={`/company/${company.id}`}
                        className="flex items-center gap-3 min-w-0 hover:underline"
                      >
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{company.name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {branchName(company.branch_id)}
                        </span>
                      </Link>
                      <Badge className={cn("border", statusBadgeClass(status))}>
                        {status.replace("_", " ")}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
