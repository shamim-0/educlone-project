import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "sub_admin" | "editor" | "viewer";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  username: string | null;
  branchId: string | null;
  accountsAccess: boolean;
  expensesAccess: boolean;
  expensesBranchId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (username: string, email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [accountsAccess, setAccountsAccess] = useState<boolean>(false);
  const [expensesAccess, setExpensesAccess] = useState<boolean>(false);
  const [expensesBranchId, setExpensesBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const [{ data: roleRow }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid).order("role").limit(1).maybeSingle(),
      supabase.from("profiles").select("username, branch_id, accounts_access, expenses_access, expenses_branch_id").eq("id", uid).maybeSingle(),
    ]);
    setRole((roleRow?.role as AppRole) ?? "viewer");
    setUsername(profile?.username ?? null);
    setBranchId((profile as any)?.branch_id ?? null);
    setAccountsAccess(!!(profile as any)?.accounts_access);
    setExpensesAccess(!!(profile as any)?.expenses_access);
    setExpensesBranchId((profile as any)?.expenses_branch_id ?? null);
  };


  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setRole(null);
        setUsername(null);
        setBranchId(null);
        setAccountsAccess(false);
        setExpensesAccess(false);
        setExpensesBranchId(null);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (username: string, email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { username },
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ session, user, role, username, branchId, accountsAccess, expensesAccess, expensesBranchId, loading, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
};
