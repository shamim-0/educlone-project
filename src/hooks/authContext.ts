import { createContext } from "react";
import { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "sub_admin" | "editor" | "viewer";

export interface AuthCtx {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  username: string | null;
  branchId: string | null;
  accountsAccess: boolean;
  expensesAccess: boolean;
  expensesBranchId: string | null;
  officeAccess: boolean;
  officeBranchId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (username: string, email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const Ctx = createContext<AuthCtx | undefined>(undefined);
