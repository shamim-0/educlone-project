import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CrudTable } from "@/components/CrudTable";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Branch { id: string; name: string; location: string | null; company_id: string; companies?: { name: string } | null; }
interface Company { id: string; name: string; }

export default function BranchPage() {
  const [rows, setRows] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [companyId, setCompanyId] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [{ data: b }, { data: c }] = await Promise.all([
      supabase.from("branches").select("*, companies(name)").order("created_at", { ascending: false }),
      supabase.from("companies").select("id,name").order("name"),
    ]);
    setRows((b as Branch[]) ?? []);
    setCompanies(c ?? []);
    setLoading(false);
  };
  useEffect(() => { document.title = "Branch | ISBI Tracker"; load(); }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const cid = companyId || editing?.company_id;
    if (!cid) { toast.error("Select a company"); return; }
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      location: String(fd.get("location") ?? "").trim() || null,
      company_id: cid,
    };
    if (!payload.name) { toast.error("Name required"); return; }
    const { error } = editing
      ? await supabase.from("branches").update(payload).eq("id", editing.id)
      : await supabase.from("branches").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Updated" : "Created");
    setOpen(false); setEditing(null); setCompanyId(""); load();
  };

  const onDelete = async (row: Branch) => {
    if (!confirm(`Delete "${row.name}"?`)) return;
    const { error } = await supabase.from("branches").delete().eq("id", row.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <>
      <CrudTable<Branch>
        title="Branches"
        description="Branches grouped under each company."
        rows={rows}
        loading={loading}
        columns={[
          { key: "name", header: "Branch" },
          { key: "company", header: "Company", render: (r) => r.companies?.name ?? "—" },
          { key: "location", header: "Location" },
        ]}
        onAdd={() => { setEditing(null); setCompanyId(""); setOpen(true); }}
        onEdit={(r) => { setEditing(r); setCompanyId(r.company_id); setOpen(true); }}
        onDelete={onDelete}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Branch</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>Company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="name">Name</Label><Input id="name" name="name" defaultValue={editing?.name} required maxLength={120} /></div>
            <div><Label htmlFor="location">Location</Label><Input id="location" name="location" defaultValue={editing?.location ?? ""} maxLength={255} /></div>
            <DialogFooter><Button type="submit">{editing ? "Save" : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
