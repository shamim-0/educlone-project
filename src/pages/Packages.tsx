import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/appClient";
import { CrudTable } from "@/components/CrudTable";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Pkg { id: string; name: string; price: number; duration_working_days: number | null; }

/** Working days entered by admin always get +7 added for the effective duration. */
const EXTRA_WORKING_DAYS = 7;

export default function PackagesPage() {
  const [rows, setRows] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pkg | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("packages")
      .select("id, name, price, duration_working_days")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Pkg[]);
    setLoading(false);
  };
  useEffect(() => { document.title = "Packages | ISBI Tracker"; load(); }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const price = Number(fd.get("price") ?? 0);
    const durationRaw = String(fd.get("duration_working_days") ?? "").trim();
    const duration_working_days = durationRaw ? Number(durationRaw) : null;
    if (!name) { toast.error("Name required"); return; }
    if (Number.isNaN(price)) { toast.error("Invalid price"); return; }
    if (duration_working_days !== null && (Number.isNaN(duration_working_days) || duration_working_days < 1)) { toast.error("Invalid duration"); return; }
    const payload = { name, price, duration_working_days };
    const { error } = editing
      ? await supabase.from("packages").update(payload).eq("id", editing.id)
      : await supabase.from("packages").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Updated" : "Created");
    setOpen(false); setEditing(null); load();
  };

  const onDelete = async (row: Pkg) => {
    if (!confirm(`Delete "${row.name}"?`)) return;
    const { error } = await supabase.from("packages").delete().eq("id", row.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <>
      <CrudTable<Pkg>
        title="Packages"
        description="Manage your packages."
        rows={rows}
        loading={loading}
        showIndex
        columns={[
          { key: "name", header: "Name" },
          { key: "price", header: "Price", render: (r) => r.price.toLocaleString() },
          {
            key: "duration_working_days",
            header: "Duration",
            render: (r) =>
              r.duration_working_days ? (
                <span>
                  {r.duration_working_days + EXTRA_WORKING_DAYS} working days
                  <span className="text-muted-foreground text-xs ml-1">
                    ({r.duration_working_days} + {EXTRA_WORKING_DAYS})
                  </span>
                </span>
              ) : (
                "—"
              ),
          },
        ]}
        onAdd={() => { setEditing(null); setOpen(true); }}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={onDelete}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Package</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={editing?.name} required maxLength={120} />
            </div>
            <div>
              <Label htmlFor="price">Price</Label>
              <Input id="price" name="price" type="number" step="0.01" defaultValue={editing?.price ?? 0} required />
            </div>
            <div>
              <Label htmlFor="duration_working_days">Duration (working days)</Label>
              <Input id="duration_working_days" name="duration_working_days" type="number" min={1} step={1} defaultValue={editing?.duration_working_days ?? ""} placeholder="e.g. 20" />
              <p className="text-xs text-muted-foreground mt-1">+{EXTRA_WORKING_DAYS} working days are added automatically to the total duration.</p>
            </div>
            <DialogFooter><Button type="submit">{editing ? "Save" : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
