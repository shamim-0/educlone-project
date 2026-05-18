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
const TOTAL_STEPS = 17;

function deriveProgress(createdAt: string, done: number, processing: number) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000));
  const remaining = TARGET_DAYS - days;
  const percent = Math.round((done / TOTAL_STEPS) * 100);
  const overdue = remaining < 0;
  return { days, remaining, done, processing, percent, overdue };
}

function CompanyCard({ c, done, processing }: { c: Company; done: number; processing: number }) {
  const p = deriveProgress(c.created_at, done, processing);
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

      {/* Step dots — green=done, blue=processing, muted=not started */}
      <div className="mt-5 flex items-center gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
          let cls = "bg-muted";
          if (i < p.done) cls = "bg-accent";
          else if (i < p.done + p.processing) cls = "bg-primary";
          return <span key={i} className={cn("h-2 w-2 rounded-full", cls)} />;
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
        <span className="text-muted-foreground">{p.done}/{TOTAL_STEPS} steps completed</span>
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
    </Link>
  );
}

export default function Index() {
  const { role, branchId } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stepCounts, setStepCounts] = useState<Record<string, { done: number; processing: number }>>({});
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
      const [cRes, sRes] = await Promise.all([
        q,
        supabase.from("company_steps").select("company_id, status"),
      ]);
      if (!cRes.error) setCompanies((cRes.data as Company[]) ?? []);
      const counts: Record<string, { done: number; processing: number }> = {};
      (sRes.data ?? []).forEach((r: any) => {
        const c = counts[r.company_id] ?? { done: 0, processing: 0 };
        if (r.status === "done") c.done++;
        else if (r.status === "processing") c.processing++;
        counts[r.company_id] = c;
      });
      setStepCounts(counts);
      setLoading(false);
    };
    if (role !== null) load();
  }, [role, branchId]);

  const extractCode = (name: string) => {
    const m = name.match(/ISBI[A-Z]*(\d+)/i);
    return m ? parseInt(m[1], 10) : -1;
  };

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
          {sorted.map((c) => (
            <CompanyCard
              key={c.id}
              c={c}
              done={stepCounts[c.id]?.done ?? 0}
              processing={stepCounts[c.id]?.processing ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
