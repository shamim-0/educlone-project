import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

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
  // simple deterministic step derivation from age
  const steps = Math.min(TOTAL_STEPS, Math.max(1, Math.floor((days / TARGET_DAYS) * TOTAL_STEPS) + 1));
  const percent = Math.round((steps / TOTAL_STEPS) * 100);
  const overdue = remaining < 0;
  return { days, remaining, steps, percent, overdue };
}

function CompanyCard({ c }: { c: Company }) {
  const p = deriveProgress(c.created_at);
  const branchName = c.branches?.name ?? "—";

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-slate-900/80 border-slate-800 p-5 shadow-card overflow-hidden",
        p.overdue && "border-orange-500/60 ring-1 ring-orange-500/40"
      )}
    >
      {p.overdue && (
        <div className="-mx-5 -mt-5 mb-4 px-5 py-2 bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-transparent border-b border-orange-500/30 flex items-center gap-2 text-orange-400 text-[11px] font-bold tracking-wider">
          <Zap className="h-3.5 w-3.5 fill-current" />
          TAKE ACTION — ATTENTION NEEDED
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <h3 className="text-white font-semibold leading-tight">{c.name}</h3>
        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="px-2.5 py-0.5 rounded-md text-xs bg-slate-800 text-slate-200 border border-slate-700">
          {branchName}
        </span>
        <span className="px-2.5 py-0.5 rounded-md text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 capitalize">
          {c.type}
        </span>
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
                    ? "bg-amber-400"
                    : "bg-emerald-400"
                  : "bg-slate-700"
              )}
            />
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            p.overdue
              ? "bg-gradient-to-r from-emerald-500 via-amber-400 to-orange-500"
              : "bg-emerald-500"
          )}
          style={{ width: `${p.percent}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-slate-400">{p.steps}/{TOTAL_STEPS} steps completed</span>
        <span className={cn("font-semibold", p.overdue ? "text-orange-400" : "text-emerald-400")}>
          {p.percent}%
        </span>
      </div>

      {/* Days status */}
      <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-2 text-xs">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            p.overdue ? "bg-orange-500" : "bg-emerald-400"
          )}
        />
        {p.overdue ? (
          <span className="text-slate-200">
            <span className="font-semibold text-orange-300">{p.days} দিন হয়ে গেছে</span>
            {" "}— <span className="text-orange-400">{Math.abs(p.remaining)} দিন অতিরিক্ত</span>
          </span>
        ) : (
          <span className="text-slate-300">
            <span className="font-semibold text-emerald-300">{p.days} দিন</span>
            {" "}— <span className="text-slate-400">{p.remaining} দিন বাকি আছে</span>
          </span>
        )}
      </div>

      {p.overdue && (
        <div className="mt-3 -mx-5 -mb-5 px-5 py-1 bg-gradient-to-r from-orange-500/60 via-pink-500/40 to-orange-500/60" />
      )}
      {p.overdue && (
        <p className="mt-2 text-[11px] text-slate-500">Target ছিল {TARGET_DAYS} দিন</p>
      )}
    </div>
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

  // Show overdue first
  const sorted = [...companies].sort((a, b) => {
    const ao = deriveProgress(a.created_at).overdue ? 0 : 1;
    const bo = deriveProgress(b.created_at).overdue ? 0 : 1;
    return ao - bo;
  });

  return (
    <div className="rounded-2xl bg-slate-950 p-6 min-h-[calc(100vh-8rem)]">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Company Tracker</h1>
          <p className="text-sm text-slate-400 mt-1">{companies.length} companies</p>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-center py-12">Loading…</p>
      ) : sorted.length === 0 ? (
        <p className="text-slate-400 text-center py-12">No companies yet. Add one from the Company page.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((c) => <CompanyCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  );
}
