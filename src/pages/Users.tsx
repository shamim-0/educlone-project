import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Profile { id: string; username: string; email: string | null; }
interface RoleRow { user_id: string; role: AppRole; }

const ROLES: AppRole[] = ["admin", "editor", "viewer"];

export default function UsersPage() {
  const { role: myRole, user: me } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, AppRole>>({});
  const [loading, setLoading] = useState(true);

  const isAdmin = myRole === "admin";

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("id, username, email").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setProfiles(p ?? []);
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
    // Replace existing role rows for this user
    const del = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (del.error) { toast.error(del.error.message); return; }
    const ins = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (ins.error) { toast.error(ins.error.message); return; }
    toast.success("Role updated");
    setRoles((s) => ({ ...s, [userId]: newRole }));
  };

  return (
    <Card className="p-6 shadow-card">
      <div className="mb-4">
        <h1 className="text-2xl font-display font-bold">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin ? "Manage user roles." : "Read-only view of users (admin can edit roles)."}
        </p>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-48">Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : profiles.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">No users.</TableCell></TableRow>
            ) : profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.username}{p.id === me?.id && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}</TableCell>
                <TableCell>{p.email ?? "—"}</TableCell>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
