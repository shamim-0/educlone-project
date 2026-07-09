import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useServiceDefs } from "@/hooks/useServiceDefs";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId?: string;
  username?: string;
}

export function AssignTaskDialog({ open, onOpenChange, userId, username }: Props) {
  const defs = useServiceDefs();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open || !userId) return;
    setSearch("");
    setLoading(true);
    supabase
      .from("user_service_assignments")
      .select("service_key")
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setSelected(new Set((data ?? []).map((r: any) => r.service_key)));
        setLoading(false);
      });
  }, [open, userId]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const del = await supabase.from("user_service_assignments").delete().eq("user_id", userId);
    if (del.error) {
      setSaving(false);
      toast.error(del.error.message);
      return;
    }
    if (selected.size > 0) {
      const rows = Array.from(selected).map((service_key) => ({ user_id: userId, service_key }));
      const ins = await supabase.from("user_service_assignments").insert(rows);
      if (ins.error) {
        setSaving(false);
        toast.error(ins.error.message);
        return;
      }
    }
    setSaving(false);
    toast.success("Tasks assigned");
    onOpenChange(false);
  };

  const filtered = defs.filter((d) => d.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Task {username ? `— ${username}` : ""}</DialogTitle>
        </DialogHeader>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search services..."
        />
        <div className="max-h-[420px] overflow-y-auto rounded-md border divide-y">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No services.</div>
          ) : (
            filtered.map((d) => (
              <label
                key={d.key}
                className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50"
              >
                <Checkbox
                  checked={selected.has(d.key)}
                  onCheckedChange={() => toggle(d.key)}
                />
                <span className="text-sm font-medium">{d.label}</span>
              </label>
            ))
          )}
        </div>
        <div className="text-xs text-muted-foreground">{selected.size} selected</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
