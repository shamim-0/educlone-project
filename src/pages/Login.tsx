import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckSquare } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().trim().email("Valid email required").max(255),
  password: z.string().min(6, "Min 6 chars").max(72),
});

export default function Login() {
  const { user, signIn, loading } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Login | ISBI Tracker";
    if (!loading && user) nav("/", { replace: true });
  }, [user, loading, nav]);

  const onLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.success("Welcome back!");
      nav("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md p-8 shadow-elegant">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-accent shadow-glow">
            <CheckSquare className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold">ISBI Tracker</h1>
          <p className="text-sm text-muted-foreground">Task management system</p>
        </div>

        <form onSubmit={onLogin} className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">Email</Label>
            <Input id="login-email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-password">Password</Label>
            <Input id="login-password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Only admins can create new user accounts.
          </p>
        </form>
      </Card>
    </div>
  );
}
