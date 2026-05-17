import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Company {
  id: string;
  name: string;
  type: string;
  branch_id: string | null;
  created_at: string;
  branches?: { name: string } | null;
}

const TARGET_DAYS = 45;
const TOTAL_STEPS = 18;

function deriveProgress(createdAt: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000));
  const remaining = TARGET_DAYS - days;
  const steps = Math.min(TOTAL_STEPS, Math.max(1, Math.floor((days / TARGET_DAYS) * TOTAL_STEPS) + 1));
  const percent = Math.round((steps / TOTAL_STEPS) * 100);
  const overdue = remaining < 0;
  return { days, remaining, steps, percent, overdue };
}

function CompanyCard({ c }: { c: Company }) {
  const p = deriveProgress(c.created_at);
  const branchName = c.branches?.name ?? "—";

  return (
    <Card
      className={cn(
        "relative p-5 shadow-card overflow-hidden transition-all hover:shadow-elegant",
        p.overdue && "border-destructive/40 ring-1 ring-destructive/30"
      )}
    >
      {p.overdue && (
        <div className="-mx-5 -mt-5 mb-4 px-5 py-2 bg-destructive/10 border-b border-destructive/30 flex items-center gap-2 text-destructive text-[11px] font-bold tracking-wider">
          <Zap className="h-3.5 w-3.5 fill-current" />
          TAKE ACTION — ATTENTION NEEDED
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <h3 className="text-foreground font-semibold leading-tight">{c.name}</h3>
        <span
          className={cn(
            "mt-1 h-2.5 w-2.5 rounded-full shrink-0",
            p.overdue ? "bg-destructive" : "bg-accent"
          )}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="secondary">{branchName}</Badge>
        <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 capitalize">
          {c.type}
        </Badge>
      </div>

      {/* Step dots */}
      <div className="mt-5 flex items-center gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
          const filled = i < p.steps;
          const isLast = i === p.steps - 1;
          return (
            <span
              key={i}
              className={cn(
                "h-2 w-2 rounded-full",
                filled
                  ? isLast
                    ? "bg-primary"
                    : "bg-accent"
                  : "bg-muted"
              )}
            />
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            p.overdue ? "bg-destructive" : "bg-gradient-accent"
          )}
          style={{ width: `${p.percent}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{p.steps}/{TOTAL_STEPS} steps completed</span>
        <span className={cn("font-semibold", p.overdue ? "text-destructive" : "text-primary")}>
          {p.percent}%
        </span>
      </div>

      {/* Days status */}
      <div className="mt-4 pt-4 border-t flex items-center gap-2 text-xs">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            p.overdue ? "bg-destructive" : "bg-accent"
          )}
        />
        {p.overdue ? (
          <span className="text-foreground">
            <span className="font-semibold text-destructive">{p.days} দিন হয়ে গেছে</span>
            {" "}— <span className="text-destructive">{Math.abs(p.remaining)} দিন অতিরিক্ত</span>
          </span>
        ) : (
          <span className="text-foreground">
            <span className="font-semibold text-primary">{p.days} দিন</span>
            {" "}— <span className="text-muted-foreground">{p.remaining} দিন বাকি আছে</span>
          </span>
        )}
      </div>

      {p.overdue && (
        <p className="mt-2 text-[11px] text-muted-foreground">Target ছিল {TARGET_DAYS} দিন</p>
      )}
    </Card>
  );
}

export default function Index() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Dashboard | ISBI Tracker";
    const load = async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, type, branch_id, created_at, branches!companies_branch_id_fkey(name)")
        .order("created_at", { ascending: false });
      if (!error) setCompanies((data as Company[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const sorted = [...companies].sort((a, b) => {
    const ao = deriveProgress(a.created_at).overdue ? 0 : 1;
    const bo = deriveProgress(b.created_at).overdue ? 0 : 1;
    return ao - bo;
  });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Company Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">{companies.length} companies</p>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-12">Loading…</p>
      ) : sorted.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          No companies yet. Add one from the Company page.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((c) => <CompanyCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  );
}
