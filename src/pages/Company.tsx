import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CrudTable } from "@/components/CrudTable";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type CompanyType = "entrepreneur" | "trading" | "services";
interface Company {
  id: string;
  name: string;
  type: CompanyType;
  branch_id: string | null;
  branches?: { name: string } | null;
}
interface Branch { id: string; name: string; }

const TYPES: { value: CompanyType; label: string }[] = [
  { value: "entrepreneur", label: "Entrepreneur" },
  { value: "trading", label: "Trading" },
  { value: "services", label: "Services" },
];

export default function CompanyPage() {
  const { role, branchId } = useAuth();
  const [rows, setRows] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [type, setType] = useState<CompanyType>("trading");
  const [branchId2, setBranchId] = useState<string>("");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("companies").select("id, name, type, branch_id, branches!companies_branch_id_fkey(name)").order("created_at", { ascending: false });
    if (role && role !== "admin" && branchId) q = q.eq("branch_id", branchId);
    const [{ data: c, error }, { data: b }] = await Promise.all([
      q,
      supabase.from("branches").select("id, name").order("name"),
    ]);
    if (error) toast.error(error.message);
    setRows((c as Company[]) ?? []);
    setBranches(b ?? []);
    setLoading(false);
  };
  useEffect(() => { document.title = "Company | ISBI Tracker"; if (role !== null) load(); }, [role, branchId]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      type,
      branch_id: branchId2 || null,
    };
    if (!payload.name) { toast.error("Company name required"); return; }
    const { error } = editing
      ? await supabase.from("companies").update(payload).eq("id", editing.id)
      : await supabase.from("companies").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Updated" : "Created");
    setOpen(false); setEditing(null); load();
  };

  const onDelete = async (row: Company) => {
    if (!confirm(`Delete "${row.name}"?`)) return;
    const { error } = await supabase.from("companies").delete().eq("id", row.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const openAdd = () => { setEditing(null); setType("trading"); setBranchId(""); setOpen(true); };
  const openEdit = (r: Company) => { setEditing(r); setType(r.type); setBranchId(r.branch_id ?? ""); setOpen(true); };

  return (
    <>
      <CrudTable<Company>
        title="Companies"
        description="Manage your companies with branch and type."
        rows={rows}
        loading={loading}
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
            <DialogFooter><Button type="submit">{editing ? "Save" : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
