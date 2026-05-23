import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * If `targetUserId` is provided AND it's not the current user, the dialog calls
 * the admin-update-password edge function (admin-only on the server). Otherwise it
 * updates the currently logged-in user's password via supabase.auth.updateUser.
 */
export function ChangePasswordDialog({
  open,
  onOpenChange,
  targetUserId,
  targetLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targetUserId?: string;
  targetLabel?: string;
}) {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => { setPwd(""); setConfirm(""); };

  const submit = async () => {
    if (pwd.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (pwd !== confirm) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    const { data: me } = await supabase.auth.getUser();
    const isSelf = !targetUserId || targetUserId === me.user?.id;
    if (isSelf) {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Password updated");
    } else {
      const { data, error } = await supabase.functions.invoke("admin-update-password", {
        body: { user_id: targetUserId, password: pwd },
      });
      setBusy(false);
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error ?? error?.message ?? "Failed");
        return;
      }
      toast.success("Password updated");
    }
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password{targetLabel ? ` — ${targetLabel}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>New Password</Label>
            <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="new-password" />
          </div>
          <div>
            <Label>Confirm Password</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Update Password"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
