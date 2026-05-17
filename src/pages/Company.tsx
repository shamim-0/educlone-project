import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CrudTable } from "@/components/CrudTable";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Company { id: string; name: string; address: string | null; phone: string | null; }

export default function CompanyPage() {
  const [rows, setRows] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { document.title = "Company | ISBI Tracker"; load(); }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      address: String(fd.get("address") ?? "").trim() || null,
      phone: String(fd.get("phone") ?? "").trim() || null,
    };
    if (!payload.name) { toast.error("Name required"); return; }
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

  return (
    <>
      <CrudTable<Company>
        title="Companies"
        description="Manage your registered companies."
        rows={rows}
        loading={loading}
        columns={[
          { key: "name", header: "Name" },
          { key: "address", header: "Address" },
          { key: "phone", header: "Phone" },
        ]}
        onAdd={() => { setEditing(null); setOpen(true); }}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={onDelete}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Company</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div><Label htmlFor="name">Name</Label><Input id="name" name="name" defaultValue={editing?.name} required maxLength={120} /></div>
            <div><Label htmlFor="address">Address</Label><Input id="address" name="address" defaultValue={editing?.address ?? ""} maxLength={255} /></div>
            <div><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" defaultValue={editing?.phone ?? ""} maxLength={40} /></div>
            <DialogFooter><Button type="submit">{editing ? "Save" : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
