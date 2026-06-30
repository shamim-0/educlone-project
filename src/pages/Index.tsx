import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useServiceDefs } from "@/hooks/useServiceDefs";
import { getApplicableServiceDefs } from "@/lib/steps";


interface Company {
  id: string;
  name: string;
  type: string;
  branch_id: string | null;
  created_at: string;
  emergency?: boolean | null;
  take_action?: boolean | null;
  branches?: { name: string } | null;
}

const TARGET_DAYS = 45;

function deriveProgress(startAt: string | null, done: number, processing: number, total: number) {
  const started = !!startAt;
  const days = started ? Math.max(0, Math.floor((Date.now() - new Date(startAt!).getTime()) / 86400000)) : 0;
  const remaining = TARGET_DAYS - days;
  const safeTotal = Math.max(1, total);
  const cappedDone = Math.min(done, safeTotal);
  const percent = Math.round((cappedDone / safeTotal) * 100);
  const overdue = started && remaining < 0;
  return { days, remaining, done: cappedDone, processing, percent, overdue, total: safeTotal, started };
}

function CompanyCard({ c, done, processing, totalSteps, applicableDefs, stepStatuses, startAt }: { c: Company; done: number; processing: number; totalSteps: number; applicableDefs: { key: string; label: string }[]; stepStatuses: Record<string, string>; startAt: string | null }) {
  const p = deriveProgress(startAt, done, processing, totalSteps);

  const branchName = c.branches?.name ?? "—";
  const isEmergency = !!c.emergency;
  const isTakeAction = !!c.take_action;

  return (
    <Link to={`/company/${c.id}`} className="block">
    <Card
      className={cn(
        "relative p-5 shadow-card overflow-hidden transition-all hover:shadow-elegant cursor-pointer hover:-translate-y-0.5 border-2",
        isEmergency && "border-destructive animate-border-pulse-red",
        !isEmergency && isTakeAction && "border-[rgb(249,115,22)] animate-border-pulse-orange",
        !isEmergency && !isTakeAction && p.overdue && "border-destructive/40 ring-1 ring-destructive/30"
      )}
    >
      {(isEmergency || isTakeAction) && (
        <div className={cn(
          "-mx-5 -mt-5 mb-4 px-5 py-2 border-b flex items-center gap-2 text-[11px] font-bold tracking-wider",
          isEmergency ? "bg-destructive/15 border-destructive/40 text-destructive"
            : "bg-[rgb(249,115,22)]/15 border-[rgb(249,115,22)]/40 text-[rgb(234,88,12)]"
        )}>
          <Zap className="h-3.5 w-3.5 fill-current" />
          {isEmergency ? "EMERGENCY — IMMEDIATE ATTENTION" : "TAKE ACTION REQUIRED"}
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

      {/* Step name chips — green=done, blue=processing, white=no_need, red=not_started */}
      <div className="mt-5 flex flex-wrap gap-1">
        {applicableDefs.map((def) => {
          const st = stepStatuses[def.key] ?? "not_started";
          const clean = def.label.replace(/\s*\([^)]*\)/g, "").trim();
          const words = clean.split(/\s+/);
          const short = words.length <= 2 ? clean : words.slice(0, 2).join(" ");
          const cls =
            st === "done"
              ? "bg-success text-success-foreground border-success"
              : st === "processing"
              ? "bg-primary text-primary-foreground border-primary"
              : st === "applied"
              ? "bg-blue-700 text-white border-blue-700"
              : st === "no_need"
              ? "bg-white text-black border-border"
              : "bg-destructive text-destructive-foreground border-destructive";
          return (
            <span
              key={def.key}
              className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded border whitespace-nowrap", cls)}
              title={`${def.label}: ${st}`}
            >
              {short}
            </span>
          );
        })}
      </div>


      {/* Progress bar */}
      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            p.overdue ? "bg-destructive" : "bg-success"
          )}
          style={{ width: `${p.percent}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{p.done}/{p.total} steps completed</span>
        <span className={cn("font-semibold", p.overdue ? "text-destructive" : "text-primary")}>
          {p.percent}%
        </span>
      </div>


      {/* Days status */}
      <div className="mt-4 pt-4 border-t flex items-center gap-2 text-xs">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            !p.started ? "bg-muted-foreground" : p.overdue ? "bg-destructive" : "bg-accent"
          )}
        />
        {!p.started ? (
          <span className="text-muted-foreground">
            <span className="font-semibold">কাউন্টডাউন শুরু হয়নি</span> — All Papers Recieved এর অপেক্ষায়
          </span>
        ) : p.overdue ? (
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
        <p className="mt-2 text-[11px] text-muted-foreground">Target ছিল {TARGET_DAYS} দিন All Papers Recieved এর পর</p>
      )}
    </Card>
    </Link>
  );
}

export default function Index() {
  const { role, branchId } = useAuth();
  const serviceDefs = useServiceDefs();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stepCounts, setStepCounts] = useState<Record<string, { done: number; processing: number }>>({});
  const [stepStatuses, setStepStatuses] = useState<Record<string, Record<string, string>>>({});
  const [allPapersAt, setAllPapersAt] = useState<Record<string, string | null>>({});

  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("default");

  useEffect(() => {
    document.title = "Dashboard | ISBI Tracker";
    const load = async () => {
      let q = supabase
        .from("companies")
        .select("id, name, type, branch_id, created_at, emergency, take_action, branches!companies_branch_id_fkey(name)")
        .order("created_at", { ascending: false });
      if (role && role !== "admin" && branchId) {
        q = q.eq("branch_id", branchId);
      }
      // Paginate company_steps to bypass the 1000-row default cap
      const fetchAllSteps = async () => {
        const pageSize = 1000;
        let from = 0;
        const all: { company_id: string; step_key: string; status: string; updated_at: string }[] = [];
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data, error } = await supabase
            .from("company_steps")
            .select("company_id, step_key, status, updated_at")
            .range(from, from + pageSize - 1);
          if (error || !data) break;
          all.push(...(data as any));
          if (data.length < pageSize) break;
          from += pageSize;
        }
        return all;
      };
      const [cRes, sRows] = await Promise.all([q, fetchAllSteps()]);
      if (!cRes.error) setCompanies((cRes.data as Company[]) ?? []);
      const companyMap = new Map((cRes.data ?? []).map((c: any) => [c.id, c]));
      const counts: Record<string, { done: number; processing: number; seen: Set<string> }> = {};
      const statuses: Record<string, Record<string, string>> = {};
      const papersAt: Record<string, string | null> = {};
      sRows.forEach((r) => {
        if (r.step_key === "all_papers_recieved" && r.status === "done") {
          papersAt[r.company_id] = r.updated_at;
        }
        const co = companyMap.get(r.company_id);
        const applicable = getApplicableServiceDefs(co?.type ?? "", serviceDefs);
        const applicableKeys = new Set(applicable.map((d) => d.key));
        if (!applicableKeys.has(r.step_key)) return;
        const c = counts[r.company_id] ?? { done: 0, processing: 0, seen: new Set() };
        if (c.seen.has(r.step_key)) return;
        c.seen.add(r.step_key);
        if (r.status === "done" || r.status === "no_need") c.done++;
        else if (r.status === "processing") c.processing++;
        counts[r.company_id] = c;
        statuses[r.company_id] = statuses[r.company_id] ?? {};
        statuses[r.company_id][r.step_key] = r.status;
      });
      const stripped: Record<string, { done: number; processing: number }> = {};
      Object.entries(counts).forEach(([k, v]) => { stripped[k] = { done: v.done, processing: v.processing }; });
      setStepCounts(stripped);
      setStepStatuses(statuses);
      setAllPapersAt(papersAt);
      setLoading(false);
    };

    if (role !== null && serviceDefs.length > 0) load();
  }, [role, branchId, serviceDefs]);

  const extractCode = (name: string) => {
    const m = name.match(/ISBI[A-Z]*(\d+)/i);
    return m ? parseInt(m[1], 10) : -1;
  };

  const stats = useMemo(() => {
    const total = companies.length;
    const service = companies.filter((c) => c.type === "services").length;
    const trading = companies.filter((c) => c.type === "trading").length;
    const entrepreneur = companies.filter((c) => c.type === "entrepreneur").length;
    const completed = companies.filter((c) => {
      const applicableTotal = getApplicableServiceDefs(c.type, serviceDefs).length || 1;
      return (stepCounts[c.id]?.done ?? 0) >= applicableTotal;
    }).length;
    const takeAction = companies.filter((c) => c.take_action).length;
    const emergency = companies.filter((c) => c.emergency).length;
    const avgProgress =
      total > 0
        ? Math.round(
            companies.reduce((sum, c) => {
              const applicableTotal = getApplicableServiceDefs(c.type, serviceDefs).length || 1;
              return sum + (Math.min(stepCounts[c.id]?.done ?? 0, applicableTotal) / applicableTotal) * 100;
            }, 0) / total
          )
        : 0;
    return { total, service, trading, entrepreneur, completed, takeAction, emergency, avgProgress };
  }, [companies, stepCounts, serviceDefs]);


  const branchTabs = useMemo(() => {
    const map = new Map<string, number>();
    companies.forEach((c) => {
      const name = c.branches?.name ?? "—";
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [companies]);

  const typeOptions = useMemo(() => {
    const s = new Set<string>();
    companies.forEach((c) => c.type && s.add(c.type));
    return Array.from(s).sort();
  }, [companies]);

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (branchFilter !== "all" && (c.branches?.name ?? "—") !== branchFilter) return false;
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (search.trim() && !c.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [companies, branchFilter, typeFilter, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const defaultSort = (a: Company, b: Company) => {
      const ae = a.emergency ? 0 : 1;
      const be = b.emergency ? 0 : 1;
      if (ae !== be) return ae - be;
      const at = a.take_action ? 0 : 1;
      const bt = b.take_action ? 0 : 1;
      if (at !== bt) return at - bt;
      const ac = extractCode(a.name);
      const bc = extractCode(b.name);
      if (ac !== bc) return bc - ac;
      return b.name.localeCompare(a.name);
    };
    switch (sortBy) {
      case "name_asc":
        return arr.sort((a, b) => a.name.localeCompare(b.name));
      case "name_desc":
        return arr.sort((a, b) => b.name.localeCompare(a.name));
      case "recent":
        return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "oldest":
        return arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case "progress": {
        return arr.sort((a, b) => {
          const ap = stepCounts[a.id]?.done ?? 0;
          const bp = stepCounts[b.id]?.done ?? 0;
          return bp - ap;
        });
      }
      default:
        return arr.sort(defaultSort);
    }
  }, [filtered, sortBy, stepCounts]);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Company Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">{companies.length} companies</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center shadow-card">
          <div className="text-lg font-bold text-foreground">{stats.total}</div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Total</div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center shadow-card">
          <div className="text-lg font-bold text-primary">{stats.service}</div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Service</div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center shadow-card">
          <div className="text-lg font-bold text-primary">{stats.trading}</div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Trading</div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center shadow-card">
          <div className="text-lg font-bold text-primary">{stats.entrepreneur}</div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Entrepreneur</div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center shadow-card">
          <div className="text-lg font-bold text-success">{stats.completed}</div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">সম্পন্ন</div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center shadow-card">
          <div className="text-lg font-bold text-[rgb(234,88,12)]">{stats.takeAction}</div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
            <Zap className="h-3 w-3" /> Take Action
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center shadow-card">
          <div className="text-lg font-bold text-destructive">{stats.emergency}</div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Emergency</div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center shadow-card">
          <div className="text-lg font-bold text-foreground">{stats.avgProgress}%</div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Avg Progress</div>
        </div>
      </div>

      {/* Branch tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setBranchFilter("all")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium border transition-colors",
            branchFilter === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-foreground border-border hover:bg-muted"
          )}
        >
          All <span className="opacity-70">({companies.length})</span>
        </button>
        {branchTabs.map(([name, count]) => (
          <button
            key={name}
            onClick={() => setBranchFilter(name)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium border transition-colors",
              branchFilter === name
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted"
            )}
          >
            {name} <span className="opacity-70">({count})</span>
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company by name..."
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="md:w-48"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {typeOptions.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="default">🚨 Priority (default)</SelectItem>
            <SelectItem value="name_asc">A–Z</SelectItem>
            <SelectItem value="name_desc">Z–A</SelectItem>
            <SelectItem value="progress">📈 Progress</SelectItem>
            <SelectItem value="recent">🕐 Recent</SelectItem>
            <SelectItem value="oldest">⏳ Oldest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-12">Loading…</p>
      ) : sorted.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          No companies match your filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((c) => {
            const applicable = getApplicableServiceDefs(c.type, serviceDefs);
            const applicableTotal = applicable.length || 1;
            return (
              <CompanyCard
                key={c.id}
                c={c}
                done={stepCounts[c.id]?.done ?? 0}
                processing={stepCounts[c.id]?.processing ?? 0}
                totalSteps={applicableTotal}
                applicableDefs={applicable}
                stepStatuses={stepStatuses[c.id] ?? {}}
                startAt={allPapersAt[c.id] ?? null}
              />
            );
          })}

        </div>
      )}
    </div>
  );
}
