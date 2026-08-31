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
import { Plus, KeyRound, ClipboardCheck, ListTodo, Activity, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { AssignTaskDialog } from "@/components/AssignTaskDialog";
import { TodoTaskDialog } from "@/components/TodoTaskDialog";
import { UserActivityDialog } from "@/components/UserActivityDialog";

interface Profile { id: string; username: string; email: string | null; branch_id: string | null; accounts_access: boolean; expenses_access: boolean; expenses_branch_id: string | null; }
interface RoleRow { user_id: string; role: AppRole; }
interface Branch { id: string; name: string; }

const ROLES: AppRole[] = ["admin", "sub_admin", "editor", "viewer"];
const roleLabel = (r: AppRole) => r === "sub_admin" ? "Sub Admin" : r.charAt(0).toUpperCase() + r.slice(1);

export default function UsersPage() {
  const { role: myRole, user: me } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, AppRole>>({});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", branch_id: "", role: "viewer" as AppRole, accounts_access: false, expenses_access: false, expenses_branch_id: "" });
  const [pwdTarget, setPwdTarget] = useState<Profile | null>(null);
  const [assignTarget, setAssignTarget] = useState<Profile | null>(null);
  const [todoTarget, setTodoTarget] = useState<Profile | null>(null);
  const [activityTarget, setActivityTarget] = useState<Profile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = myRole === "admin";

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: r }, { data: b }] = await Promise.all([
      supabase.from("profiles").select("id, username, email, branch_id, accounts_access, expenses_access, expenses_branch_id").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("branches").select("id, name").order("name"),
    ]);
    setProfiles((p as Profile[]) ?? []);
    setBranches((b as Branch[]) ?? []);
    const map: Record<string, AppRole> = {};
    (r as RoleRow[] | null)?.forEach((row) => {
      const cur = map[row.user_id];
      const order: Record<AppRole, number> = { admin: 1, sub_admin: 2, editor: 3, viewer: 4 };
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

  const toggleExpensesAccess = async (userId: string, value: boolean) => {
    const patch: any = { expenses_access: value };
    if (!value) patch.expenses_branch_id = null;
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success("Expenses access updated");
    setProfiles((s) => s.map((p) => p.id === userId ? { ...p, expenses_access: value, expenses_branch_id: value ? p.expenses_branch_id : null } : p));
  };

  const changeExpensesBranch = async (userId: string, branchId: string) => {
    const value = branchId === "__all__" ? null : branchId;
    const { error } = await supabase.from("profiles").update({ expenses_branch_id: value } as any).eq("id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success("Expenses branch updated");
    setProfiles((s) => s.map((p) => p.id === userId ? { ...p, expenses_branch_id: value } : p));
  };


  const branchName = (id: string | null) => branches.find((b) => b.id === id)?.name ?? "—";

  const deleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("admin-delete-user", {
      body: { user_id: deleteTarget.id },
    });
    setDeleting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Failed to delete user");
      return;
    }
    toast.success(`User "${deleteTarget.username}" deleted`);
    setDeleteTarget(null);
    load();
  };

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
        expenses_access: form.expenses_access,
        expenses_branch_id: form.expenses_access ? (form.expenses_branch_id || null) : null,
      },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Failed");
      return;
    }
    toast.success("User created");
    setOpen(false);
    setForm({ username: "", email: "", password: "", branch_id: "", role: "viewer", accounts_access: false, expenses_access: false, expenses_branch_id: "" });

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
              <TableHead className="w-40">Expenses Access</TableHead>
              {isAdmin && <TableHead className="w-64 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : profiles.length === 0 ? (
              <TableRow><TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-10 text-muted-foreground">No users.</TableCell></TableRow>

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
                        {ROLES.map((r) => <SelectItem key={r} value={r} >{roleLabel(r)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">{roleLabel(roles[p.id] ?? "viewer")}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {isAdmin ? (
                    <Switch checked={!!p.accounts_access} onCheckedChange={(v) => toggleAccountsAccess(p.id, v)} />
                  ) : (
                    <Badge variant="secondary">{p.accounts_access ? "Yes" : "No"}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {isAdmin ? (
                    <div className="space-y-2">
                      <Switch checked={!!p.expenses_access} onCheckedChange={(v) => toggleExpensesAccess(p.id, v)} />
                      {p.expenses_access && (
                        <Select value={p.expenses_branch_id ?? "__all__"} onValueChange={(v) => changeExpensesBranch(p.id, v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">All branches</SelectItem>
                            {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ) : (
                    <Badge variant="secondary">
                      {p.expenses_access ? (p.expenses_branch_id ? branchName(p.expenses_branch_id) : "All branches") : "No"}
                    </Badge>
                  )}
                </TableCell>

                {isAdmin && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {((roles[p.id] ?? "viewer") === "editor" || (roles[p.id] ?? "viewer") === "sub_admin") && (
                        <>
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => setAssignTarget(p)}>
                            <ClipboardCheck className="h-3.5 w-3.5" /> Assign Task
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => setTodoTarget(p)}>
                            <ListTodo className="h-3.5 w-3.5" /> To Do List
                          </Button>
                        </>
                      )}
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setActivityTarget(p)}>
                        <Activity className="h-3.5 w-3.5" /> Activity
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setPwdTarget(p)}>
                        <KeyRound className="h-3.5 w-3.5" /> Change
                      </Button>
                      {p.id !== me?.id && (
                        <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p)}>
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      )}
                    </div>
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
                  {ROLES.map((r) => <SelectItem key={r} value={r} >{roleLabel(r)}</SelectItem>)}
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
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Expenses Access</Label>
                  <p className="text-xs text-muted-foreground">Allow this user to open the Expenses page.</p>
                </div>
                <Switch checked={form.expenses_access} onCheckedChange={(v) => setForm({ ...form, expenses_access: v, expenses_branch_id: v ? form.expenses_branch_id : "" })} />
              </div>
              {form.expenses_access && (
                <div>
                  <Label>Expenses Branch</Label>
                  <Select value={form.expenses_branch_id || "__all__"} onValueChange={(v) => setForm({ ...form, expenses_branch_id: v === "__all__" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All branches</SelectItem>
                      {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Only companies of this branch will be visible in Expenses.</p>
                </div>
              )}
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

      <TodoTaskDialog
        open={!!todoTarget}
        onOpenChange={(v) => { if (!v) setTodoTarget(null); }}
        mode="admin"
        presetAssignee={todoTarget ? { id: todoTarget.id, username: todoTarget.username } : undefined}
      />

      <AssignTaskDialog
        open={!!assignTarget}
        onOpenChange={(v) => { if (!v) setAssignTarget(null); }}
        userId={assignTarget?.id}
        username={assignTarget?.username}
      />
      <UserActivityDialog
        open={!!activityTarget}
        onOpenChange={(v) => { if (!v) setActivityTarget(null); }}
        userId={activityTarget?.id}
        username={activityTarget?.username}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-semibold">{deleteTarget?.username}</span> ({deleteTarget?.email ?? "no email"}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting…" : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
