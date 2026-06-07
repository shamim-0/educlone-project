import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Building2,
  GitBranch,
  Wallet,
  ClipboardList,
  Users,
  LogOut,
  CheckSquare,
  Moon,
  Sun,
  KeyRound,
  ListChecks,
  Package,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { cn } from "@/lib/utils";

const menu = [
  { to: "/", label: "Dashboard", icon: CheckSquare, end: true },
  { to: "/company", label: "Company", icon: Building2, roles: ["admin", "sub_admin"] as string[] },
  { to: "/branch", label: "Branch", icon: GitBranch, adminOnly: true },
  { to: "/accounts", label: "Accounts", icon: Wallet, requiresAccounts: true },
  { to: "/pending", label: "Pending", icon: ClipboardList },
  { to: "/users", label: "Users", icon: Users, adminOnly: true },
  { to: "/services", label: "Services", icon: ListChecks, roles: ["admin", "sub_admin"] as string[] },
];

export default function AppLayout() {
  const { signOut, username, role, accountsAccess } = useAuth();
  const nav = useNavigate();
  const { theme, toggle } = useTheme();
  const [pwdOpen, setPwdOpen] = useState(false);
  const visibleMenu = menu.filter((m: any) => {
    if (m.adminOnly && role !== "admin") return false;
    if (m.roles && !m.roles.includes(role ?? "")) return false;
    if (m.requiresAccounts && role !== "admin" && !accountsAccess) return false;
    return true;
  });

  const handleLogout = async () => {
    await signOut();
    nav("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur shadow-card">
        <div className="container flex h-16 items-center justify-between gap-4">
          {/* Left: menu */}
          <nav className="flex items-center gap-1 overflow-x-auto">
            {visibleMenu.map((m) => (
              <NavLink
                key={m.to}
                to={m.to}
                end={m.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-card"
                      : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                  )
                }
              >
                <m.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{m.label}</span>
              </NavLink>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPwdOpen(true)}
              className="flex items-center gap-2 text-foreground/70 hover:text-foreground"
            >
              <KeyRound className="h-4 w-4" />
              <span className="hidden sm:inline">Password</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2 text-foreground/70 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </nav>

          {/* Right: logo + user */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Toggle theme"
              className="text-foreground/70 hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {username && (
              <div className="hidden md:flex flex-col items-end leading-tight">
                <span className="text-sm font-semibold">{username}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {role}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-lg bg-gradient-hero px-3 py-2 shadow-elegant">
              <CheckSquare className="h-5 w-5 text-primary-foreground" />
              <span className="font-display text-lg font-bold tracking-tight text-primary-foreground">
                ISBI Tracker
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Outlet />
      </main>

      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />
    </div>
  );
}
