import { useEffect, useState } from "react";
import { Building2, GitBranch, Wallet, ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Counts {
  companies: number;
  branches: number;
  accounts: number;
  pending: number;
}

export default function Index() {
  const { username, role } = useAuth();
  const [counts, setCounts] = useState<Counts>({ companies: 0, branches: 0, accounts: 0, pending: 0 });

  useEffect(() => {
    document.title = "Dashboard | ISBI Tracker";
    const load = async () => {
      const [c, b, a, p] = await Promise.all([
        supabase.from("companies").select("*", { count: "exact", head: true }),
        supabase.from("branches").select("*", { count: "exact", head: true }),
        supabase.from("accounts").select("*", { count: "exact", head: true }),
        supabase.from("pending_tasks").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      setCounts({
        companies: c.count ?? 0,
        branches: b.count ?? 0,
        accounts: a.count ?? 0,
        pending: p.count ?? 0,
      });
    };
    load();
  }, []);

  const stats = [
    { label: "Companies", value: counts.companies, icon: Building2, tint: "bg-primary/10 text-primary" },
    { label: "Branches", value: counts.branches, icon: GitBranch, tint: "bg-accent/10 text-accent" },
    { label: "Accounts", value: counts.accounts, icon: Wallet, tint: "bg-gold/10 text-gold-foreground" },
    { label: "Pending Tasks", value: counts.pending, icon: ClipboardList, tint: "bg-destructive/10 text-destructive" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Welcome back{username ? `, ${username}` : ""}</h1>
        <p className="text-muted-foreground mt-1">
          Role: <span className="font-medium capitalize text-foreground">{role ?? "—"}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-display font-bold mt-1">{s.value}</p>
              </div>
              <div className={`h-12 w-12 rounded-xl grid place-items-center ${s.tint}`}>
                <s.icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 shadow-card">
        <h2 className="font-display text-xl font-semibold mb-2">Getting started</h2>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>Use the top menu to manage Company, Branch, Accounts, Pending tasks, and Users.</li>
          <li><span className="font-semibold text-foreground">Admin</span> can manage users & delete records.</li>
          <li><span className="font-semibold text-foreground">Editor</span> can create and edit data.</li>
          <li><span className="font-semibold text-foreground">Viewer</span> has read-only access.</li>
        </ul>
      </Card>
    </div>
  );
}
