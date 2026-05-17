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

type AccountType = "enterpaner" | "trading" | "services";
interface Account { id: string; name: string; type: AccountType; balance: number; branch_id: string | null; branches?: { name: string } | null; }
interface Branch { id: string; name: string; }

const TYPES: AccountType[] = ["enterpaner", "trading", "services"];

export default function AccountsPage() {
  const [rows, setRows] = useState<Account[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [type, setType] = useState<AccountType>("trading");
  const [branchId, setBranchId] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase.from("accounts").select("*, branches(name)").order("created_at", { ascending: false }),
      supabase.from("branches").select("id,name").order("name"),
    ]);
    setRows((a as Account[]) ?? []);
    setBranches(b ?? []);
    setLoading(false);
  };
  useEffect(() => { document.title = "Accounts | ISBI Tracker"; load(); }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      type,
      balance: Number(fd.get("balance") ?? 0) || 0,
      branch_id: branchId || null,
    };
    if (!payload.name) { toast.error("Name required"); return; }
    const { error } = editing
      ? await supabase.from("accounts").update(payload).eq("id", editing.id)
      : await supabase.from("accounts").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Updated" : "Created");
    setOpen(false); setEditing(null); load();
  };

  const onDelete = async (row: Account) => {
    if (!confirm(`Delete "${row.name}"?`)) return;
    const { error } = await supabase.from("accounts").delete().eq("id", row.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <>
      <CrudTable<Account>
        title="Accounts"
        description="Categorized as enterpaner, trading or services."
        rows={rows}
        loading={loading}
        columns={[
          { key: "name", header: "Account" },
          { key: "type", header: "Type", render: (r) => <Badge variant="secondary" className="capitalize">{r.type}</Badge> },
          { key: "branch", header: "Branch", render: (r) => r.branches?.name ?? "—" },
          { key: "balance", header: "Balance", render: (r) => r.balance.toLocaleString() },
        ]}
        onAdd={() => { setEditing(null); setType("trading"); setBranchId(""); setOpen(true); }}
        onEdit={(r) => { setEditing(r); setType(r.type); setBranchId(r.branch_id ?? ""); setOpen(true); }}
        onDelete={onDelete}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Account</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div><Label htmlFor="name">Name</Label><Input id="name" name="name" defaultValue={editing?.name} required maxLength={120} /></div>
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="balance">Balance</Label><Input id="balance" name="balance" type="number" step="0.01" defaultValue={editing?.balance ?? 0} /></div>
            <DialogFooter><Button type="submit">{editing ? "Save" : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
