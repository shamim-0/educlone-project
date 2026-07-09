import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Search, ListChecks, Clock, Building2, Download, FileText, FileSpreadsheet } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useServiceDefs } from "@/hooks/useServiceDefs";
import { useAuth } from "@/hooks/useAuth";
import { getApplicableServiceDefs } from "@/lib/steps";

interface Company { id: string; name: string; type: string; branch_id: string | null; created_at?: string; emergency?: boolean | null; take_action?: boolean | null; }
interface Branch { id: string; name: string; }
interface StepRow { company_id: string; step_key: string; status: string; }

export default function PendingPage() {
  const { role, branchId } = useAuth();
  const STEP_DEFS = useServiceDefs();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("default");
  const [companySortBy, setCompanySortBy] = useState<string>("default");

  useEffect(() => {
    document.title = "Pending Services | ISBI Tracker";
    if (role === null) return;
    (async () => {
      // Paginate company_steps to bypass the 1000-row default cap
      const fetchAllSteps = async () => {
        const pageSize = 1000;
        let from = 0;
        const all: StepRow[] = [];
        // eslint-disable-next-line no-constant-condition
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
      let cq = supabase.from("companies").select("id,name,type,branch_id,created_at,emergency,take_action").order("name");
      if (role !== "admin" && branchId) cq = cq.eq("branch_id", branchId);
      const [c, b, s] = await Promise.all([
        cq,
        supabase.from("branches").select("id,name"),
        fetchAllSteps(),
      ]);
      if (c.error) toast.error(c.error.message);
      setCompanies((c.data ?? []) as Company[]);
      setBranches((b.data ?? []) as Branch[]);
      setSteps(s);
      setLoading(false);
    })();
  }, [role, branchId]);

  const branchName = (id: string | null) => branches.find(x => x.id === id)?.name ?? "—";

  // Map: company_id -> step_key -> status
  const stepMap = useMemo(() => {
    const m = new Map<string, Map<string, string>>();
    steps.forEach(r => {
      if (!m.has(r.company_id)) m.set(r.company_id, new Map());
      m.get(r.company_id)!.set(r.step_key, r.status);
    });
    return m;
  }, [steps]);

  // Apply branch filter to companies first
  const branchScopedCompanies = useMemo(() => {
    if (branchFilter === "all") return companies;
    return companies.filter(co => branchName(co.branch_id) === branchFilter);
  }, [companies, branchFilter, branches]);

  // For each service, list companies where status !== done/no_need
  // AND all earlier services in STEP_DEFS order are done/no_need (sequential gating).
  const pendingByService = useMemo(() => {
    const out: Record<string, Company[]> = {};
    STEP_DEFS.forEach((def) => {
      out[def.key] = branchScopedCompanies.filter(co => {
        const applicable = getApplicableServiceDefs(co.type, STEP_DEFS);
        const applicableKeys = new Set(applicable.map(d => d.key));
        if (!applicableKeys.has(def.key)) return false;
        const cMap = stepMap.get(co.id);
        const defIndex = applicable.findIndex(d => d.key === def.key);
        for (let i = 0; i < defIndex; i++) {
          const prevKey = applicable[i].key;
          const prev = cMap?.get(prevKey) ?? "not_started";
          if (prev !== "done" && prev !== "no_need" && prev !== "applied") return false;
        }
        const st = cMap?.get(def.key) ?? "not_started";
        return st !== "done" && st !== "no_need" && st !== "applied";
      });
    });
    return out;
  }, [branchScopedCompanies, stepMap, STEP_DEFS]);

  const branchTabs = useMemo(() => {
    const map = new Map<string, number>();
    companies.forEach((c) => {
      const name = branchName(c.branch_id);
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [companies, branches]);

  const filteredDefs = useMemo(() => {
    const arr = STEP_DEFS.filter(d =>
      d.label.toLowerCase().includes(search.toLowerCase())
    );
    switch (sortBy) {
      case "count_desc":
        return [...arr].sort((a, b) => (pendingByService[b.key]?.length ?? 0) - (pendingByService[a.key]?.length ?? 0));
      case "count_asc":
        return [...arr].sort((a, b) => (pendingByService[a.key]?.length ?? 0) - (pendingByService[b.key]?.length ?? 0));
      case "name_asc":
        return [...arr].sort((a, b) => a.label.localeCompare(b.label));
      case "name_desc":
        return [...arr].sort((a, b) => b.label.localeCompare(a.label));
      default:
        return arr;
    }
  }, [STEP_DEFS, search, sortBy, pendingByService]);

  const totalPending = Object.values(pendingByService).reduce((a, b) => a + b.length, 0);

  const exportRows = (def: typeof STEP_DEFS[number]) => {
    const list = pendingByService[def.key] ?? [];
    return list.map((co, i) => {
      const st = stepMap.get(co.id)?.get(def.key) ?? "not_started";
      return {
        "#": i + 1,
        "Company": co.name,
        "Type": co.type,
        "Branch": branchName(co.branch_id),
        "Status": st === "processing" ? "Processing" : "Not Started",
      };
    });
  };

  const exportExcel = (def: typeof STEP_DEFS[number]) => {
    const rows = exportRows(def);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pending");
    XLSX.writeFile(wb, `Pending - ${def.label}.xlsx`);
  };

  const exportPDF = (def: typeof STEP_DEFS[number]) => {
    const rows = exportRows(def);
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Pending: ${def.label}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Total: ${rows.length}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["#", "Company", "Type", "Branch", "Status"]],
      body: rows.map(r => [r["#"], r.Company, r.Type, r.Branch, r.Status]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [99, 102, 241] },
    });
    doc.save(`Pending - ${def.label}.pdf`);
  };


  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 via-background to-accent/10 border-primary/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <ListChecks className="h-6 w-6 text-primary" /> Pending Services
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Click any service to see the companies where it's still pending.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold">{totalPending}</div>
              <div className="text-xs text-muted-foreground">Total pending</div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-right">
              <div className="text-2xl font-bold">{STEP_DEFS.length}</div>
              <div className="text-xs text-muted-foreground">Services</div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search services..."
              className="pl-9 bg-background/80"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="md:w-56 bg-background/80"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default order</SelectItem>
              <SelectItem value="count_desc">📊 Most pending</SelectItem>
              <SelectItem value="count_asc">✅ Least pending</SelectItem>
              <SelectItem value="name_asc">A–Z</SelectItem>
              <SelectItem value="name_desc">Z–A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Branch tabs */}
      <div className="flex flex-wrap gap-2">
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

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDefs.map(def => {
            const list = pendingByService[def.key] ?? [];
            const count = list.length;
            const isOpen = openKey === def.key;
            const ratio = companies.length ? count / companies.length : 0;
            return (
              <Card
                key={def.key}
                className={cn(
                  "overflow-hidden border bg-card transition-all relative",
                  isOpen && "ring-2 ring-primary/40"
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenKey(isOpen ? null : def.key)}
                  className="w-full text-left p-5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                        count > 0 ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"
                      )}>
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{def.label}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {def.tags.map(t => (
                            <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={cn(
                        "rounded-full px-3 py-1 text-sm font-bold border-0",
                        count > 0 ? "bg-destructive text-destructive-foreground" : "bg-success text-success-foreground"
                      )}>
                        {count}
                      </Badge>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                  <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full transition-all duration-700", count > 0 ? "bg-destructive" : "bg-success")}
                      style={{ width: `${Math.max(4, ratio * 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {isOpen ? "Hide" : "Click to view"} {count} pending company{count === 1 ? "" : "(ies)"}
                  </div>
                </button>

                <div className="absolute bottom-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" disabled={count === 0}>
                        <Download className="h-3 w-3" /> Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => exportPDF(def)}>
                        <FileText className="h-4 w-4 mr-2" /> Export PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportExcel(def)}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {isOpen && (
                  <div className="border-t bg-muted/20 px-4 py-3 space-y-2 max-h-[420px] overflow-y-auto">
                    <div className="sticky top-0 z-10 -mx-4 -mt-3 mb-2 px-4 pt-3 pb-2 bg-muted/40 backdrop-blur border-b flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{count} pending</span>
                      <Select value={companySortBy} onValueChange={setCompanySortBy}>
                        <SelectTrigger className="h-8 w-44 text-xs bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">🚨 Priority (default)</SelectItem>
                          <SelectItem value="name_asc">A–Z</SelectItem>
                          <SelectItem value="name_desc">Z–A</SelectItem>
                          <SelectItem value="recent">🕐 Recent</SelectItem>
                          <SelectItem value="oldest">⏳ Oldest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {count === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                        <Building2 className="h-6 w-6 opacity-50" />
                        All companies completed this service.
                      </div>
                    ) : (
                      (() => {
                        const extractCode = (name: string) => {
                          const m = name.match(/ISBI[A-Z]*(\d+)/i);
                          return m ? parseInt(m[1], 10) : -1;
                        };
                        const sortedList = [...list];
                        switch (companySortBy) {
                          case "name_asc": sortedList.sort((a, b) => a.name.localeCompare(b.name)); break;
                          case "name_desc": sortedList.sort((a, b) => b.name.localeCompare(a.name)); break;
                          case "recent": sortedList.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()); break;
                          case "oldest": sortedList.sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()); break;
                          default: sortedList.sort((a, b) => {
                            const ae = a.emergency ? 0 : 1; const be = b.emergency ? 0 : 1;
                            if (ae !== be) return ae - be;
                            const at = a.take_action ? 0 : 1; const bt = b.take_action ? 0 : 1;
                            if (at !== bt) return at - bt;
                            const ac = extractCode(a.name); const bc = extractCode(b.name);
                            if (ac !== bc) return bc - ac;
                            return b.name.localeCompare(a.name);
                          });
                        }
                        return sortedList.map(co => {
                        const st = stepMap.get(co.id)?.get(def.key) ?? "not_started";
                        return (
                          <div
                            key={co.id}
                            className="flex items-center justify-between gap-3 rounded-md border bg-card p-3 hover:border-primary/40 transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="font-medium truncate">{co.name}</div>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                <Badge variant="outline" className="capitalize text-[10px]">{co.type}</Badge>
                                <Badge variant="secondary" className="text-[10px]">{branchName(co.branch_id)}</Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                className={cn(
                                  "text-[10px] border",
                                  st === "processing"
                                    ? "bg-primary/15 text-primary border-primary/30"
                                    : "bg-muted text-muted-foreground border-border"
                                )}
                              >
                                {st === "processing" ? "Processing" : "Not Started"}
                              </Badge>
                              <Button asChild size="sm" variant="outline">
                                <Link to={`/company/${co.id}`}>Update</Link>
                              </Button>
                            </div>
                          </div>
                        );
                        });
                      })()
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
