import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CrudTable } from "@/components/CrudTable";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type CompanyType = "entrepreneur" | "trading" | "services";
interface Company {
  id: string;
  name: string;
  type: CompanyType;
  branch_id: string | null;
  package_id?: string | null;
  created_at?: string;
  emergency?: boolean | null;
  take_action?: boolean | null;
  branches?: { name: string } | null;
}
interface Branch { id: string; name: string; }
interface Pkg { id: string; name: string; price: number; }

const TYPES: { value: CompanyType; label: string }[] = [
  { value: "entrepreneur", label: "Entrepreneur" },
  { value: "trading", label: "Trading" },
  { value: "services", label: "Services" },
];

export default function CompanyPage() {
  const { role, branchId } = useAuth();
  const [rows, setRows] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [stepCounts, setStepCounts] = useState<Record<string, { done: number }>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [type, setType] = useState<CompanyType>("trading");
  const [branchId2, setBranchId] = useState<string>("");
  const [packageId, setPackageId] = useState<string>("");

  // Filter / sort state
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("default");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("companies")
      .select("id, name, type, branch_id, package_id, created_at, emergency, take_action, branches!companies_branch_id_fkey(name)")
      .order("created_at", { ascending: false });
    if (role && role !== "admin" && branchId) q = q.eq("branch_id", branchId);
    const [{ data: c, error }, { data: b }, { data: s }, { data: pk }] = await Promise.all([
      q,
      supabase.from("branches").select("id, name").order("name"),
      supabase.from("company_steps").select("company_id, status"),
      supabase.from("packages").select("id, name, price").order("name"),
    ]);
    if (error) toast.error(error.message);
    setRows((c as Company[]) ?? []);
    setBranches(b ?? []);
    setPackages((pk ?? []) as Pkg[]);
    const counts: Record<string, { done: number }> = {};
    (s ?? []).forEach((r: any) => {
      const x = counts[r.company_id] ?? { done: 0 };
      if (r.status === "done") x.done++;
      counts[r.company_id] = x;
    });
    setStepCounts(counts);
    setLoading(false);
  };
  useEffect(() => { document.title = "Company | ISBI Tracker"; if (role !== null) load(); }, [role, branchId]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const selectedPkg = packages.find((p) => p.id === packageId);
    const payload: Record<string, unknown> = {
      name: String(fd.get("name") ?? "").trim(),
      type,
      branch_id: branchId2 || null,
      package_id: packageId || null,
    };
    if (selectedPkg) payload.total_deal = selectedPkg.price;
    if (!payload.name) { toast.error("Company name required"); return; }
    const { error } = editing
      ? await supabase.from("companies").update(payload as any).eq("id", editing.id)
      : await supabase.from("companies").insert(payload as any);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Updated" : "Created");
    setOpen(false); setEditing(null); load();
  };

  const onDelete = async (row: Company) => {
    if (!confirm(`Delete "${row.name}"?`)) return;
    const { error } = await supabase.from("companies").delete().eq("id", row.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const openAdd = () => { setEditing(null); setType("trading"); setBranchId(""); setPackageId(""); setOpen(true); };
  const openEdit = (r: Company) => { setEditing(r); setType(r.type); setBranchId(r.branch_id ?? ""); setPackageId((r as any).package_id ?? ""); setOpen(true); };

  const branchTabs = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((c) => {
      const name = c.branches?.name ?? "—";
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const typeOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((c) => c.type && s.add(c.type));
    return Array.from(s).sort();
  }, [rows]);

  const extractCode = (name: string) => {
    const m = name.match(/ISBI[A-Z]*(\d+)/i);
    return m ? parseInt(m[1], 10) : -1;
  };

  const filtered = useMemo(() => {
    return rows.filter((c) => {
      if (branchFilter !== "all" && (c.branches?.name ?? "—") !== branchFilter) return false;
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (search.trim() && !c.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [rows, branchFilter, typeFilter, search]);

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
      case "name_asc": return arr.sort((a, b) => a.name.localeCompare(b.name));
      case "name_desc": return arr.sort((a, b) => b.name.localeCompare(a.name));
      case "recent": return arr.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
      case "oldest": return arr.sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
      case "progress": return arr.sort((a, b) => (stepCounts[b.id]?.done ?? 0) - (stepCounts[a.id]?.done ?? 0));
      default: return arr.sort(defaultSort);
    }
  }, [filtered, sortBy, stepCounts]);

  return (
    <>
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
          All <span className="opacity-70">({rows.length})</span>
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
      <div className="mb-4 flex flex-col md:flex-row gap-3">
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

      <CrudTable<Company>
        title="Companies"
        description="Manage your companies with branch and type."
        rows={sorted}
        loading={loading}
        showIndex
        columns={[
          { key: "name", header: "Company Name" },
          { key: "branch", header: "Branch", render: (r) => r.branches?.name ?? "—" },
          { key: "type", header: "Type", render: (r) => <Badge variant="secondary" className="capitalize">{r.type}</Badge> },
        ]}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={onDelete}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Company</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>Branch</Label>
              <Select value={branchId2} onValueChange={setBranchId}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No branches yet</div>
                  ) : branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Company Name</Label>
              <Input id="name" name="name" defaultValue={editing?.name} required maxLength={120} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as CompanyType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Package (optional)</Label>
              <Select value={packageId || "none"} onValueChange={(v) => setPackageId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="No package" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No package</SelectItem>
                  {packages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {p.price.toLocaleString()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {packageId && (
                <p className="text-xs text-muted-foreground mt-1">
                  Deal amount will be set to {packages.find((p) => p.id === packageId)?.price.toLocaleString()}
                </p>
              )}
            </div>
            <DialogFooter><Button type="submit">{editing ? "Save" : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
