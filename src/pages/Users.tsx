import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, KeyRound } from "lucide-react";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";

interface Profile { id: string; username: string; email: string | null; branch_id: string | null; accounts_access: boolean; }
interface RoleRow { user_id: string; role: AppRole; }
interface Branch { id: string; name: string; }

const ROLES: AppRole[] = ["admin", "editor", "viewer"];

export default function UsersPage() {
  const { role: myRole, user: me } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, AppRole>>({});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", branch_id: "", role: "viewer" as AppRole, accounts_access: false });
  const [pwdTarget, setPwdTarget] = useState<Profile | null>(null);

  const isAdmin = myRole === "admin";

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: r }, { data: b }] = await Promise.all([
      supabase.from("profiles").select("id, username, email, branch_id, accounts_access").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("branches").select("id, name").order("name"),
    ]);
    setProfiles((p as Profile[]) ?? []);
    setBranches((b as Branch[]) ?? []);
    const map: Record<string, AppRole> = {};
    (r as RoleRow[] | null)?.forEach((row) => {
      const cur = map[row.user_id];
      const order: Record<AppRole, number> = { admin: 1, editor: 2, viewer: 3 };
      if (!cur || order[row.role] < order[cur]) map[row.user_id] = row.role;
    });
    setRoles(map);
    setLoading(false);
  };
  useEffect(() => { document.title = "Users | ISBI Tracker"; load(); }, []);

  const changeRole = async (userId: string, newRole: AppRole) => {
    if (userId === me?.id) { toast.error("You cannot change your own role"); return; }
    const del = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (del.error) { toast.error(del.error.message); return; }
    const ins = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (ins.error) { toast.error(ins.error.message); return; }
    toast.success("Role updated");
    setRoles((s) => ({ ...s, [userId]: newRole }));
  };

  const changeBranch = async (userId: string, branchId: string) => {
    const value = branchId === "__none__" ? null : branchId;
    const { error } = await supabase.from("profiles").update({ branch_id: value }).eq("id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success("Branch updated");
    setProfiles((s) => s.map((p) => p.id === userId ? { ...p, branch_id: value } : p));
  };

  const toggleAccountsAccess = async (userId: string, value: boolean) => {
    const { error } = await supabase.from("profiles").update({ accounts_access: value }).eq("id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success("Accounts access updated");
    setProfiles((s) => s.map((p) => p.id === userId ? { ...p, accounts_access: value } : p));
  };

  const branchName = (id: string | null) => branches.find((b) => b.id === id)?.name ?? "—";

  const createUser = async () => {
    if (!form.username || !form.email || !form.password) { toast.error("All fields required"); return; }
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        username: form.username,
        email: form.email,
        password: form.password,
        branch_id: form.branch_id || null,
        role: form.role,
        accounts_access: form.accounts_access,
      },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Failed");
      return;
    }
    toast.success("User created");
    setOpen(false);
    setForm({ username: "", email: "", password: "", branch_id: "", role: "viewer", accounts_access: false });
    load();
  };

  return (
    <Card className="p-6 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "Manage users, roles, and branch access." : "Read-only view of users."}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Add User</Button>
        )}
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-56">Branch</TableHead>
              <TableHead className="w-48">Role</TableHead>
              <TableHead className="w-40">Accounts Access</TableHead>
              {isAdmin && <TableHead className="w-32 text-right">Password</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : profiles.length === 0 ? (
              <TableRow><TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-10 text-muted-foreground">No users.</TableCell></TableRow>
            ) : profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.username}{p.id === me?.id && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}</TableCell>
                <TableCell>{p.email ?? "—"}</TableCell>
                <TableCell>
                  {isAdmin ? (
                    <Select value={p.branch_id ?? "__none__"} onValueChange={(v) => changeBranch(p.id, v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">All branches</SelectItem>
                        {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">{branchName(p.branch_id)}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {isAdmin && p.id !== me?.id ? (
                    <Select value={roles[p.id] ?? "viewer"} onValueChange={(v) => changeRole(p.id, v as AppRole)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className="capitalize">{roles[p.id] ?? "viewer"}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {isAdmin ? (
                    <Switch checked={!!p.accounts_access} onCheckedChange={(v) => toggleAccountsAccess(p.id, v)} />
                  ) : (
                    <Badge variant="secondary">{p.accounts_access ? "Yes" : "No"}</Badge>
                  )}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setPwdTarget(p)}>
                      <KeyRound className="h-3.5 w-3.5" /> Change
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name (Username)</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={form.branch_id || "__none__"} onValueChange={(v) => setForm({ ...form, branch_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">All branches (no restriction)</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>Accounts Access</Label>
                <p className="text-xs text-muted-foreground">Allow this user to open the Accounts page.</p>
              </div>
              <Switch checked={form.accounts_access} onCheckedChange={(v) => setForm({ ...form, accounts_access: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createUser} disabled={submitting}>{submitting ? "Creating…" : "Create User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChangePasswordDialog
        open={!!pwdTarget}
        onOpenChange={(v) => { if (!v) setPwdTarget(null); }}
        targetUserId={pwdTarget?.id}
        targetLabel={pwdTarget?.username}
      />
    </Card>
  );
}
