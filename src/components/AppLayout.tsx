import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Building2,
  GitBranch,
  Wallet,
  ClipboardList,
  Users,
  LogOut,
  CheckSquare,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const menu = [
  { to: "/", label: "Dashboard", icon: CheckSquare, end: true },
  { to: "/company", label: "Company", icon: Building2 },
  { to: "/branch", label: "Branch", icon: GitBranch },
  { to: "/accounts", label: "Accounts", icon: Wallet, requiresAccounts: true },
  { to: "/pending", label: "Pending", icon: ClipboardList },
  { to: "/users", label: "Users", icon: Users },
];

export default function AppLayout() {
  const { signOut, username, role, accountsAccess } = useAuth();
  const nav = useNavigate();
  const visibleMenu = menu.filter(
    (m) => !m.requiresAccounts || role === "admin" || accountsAccess,
  );

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
              onClick={handleLogout}
              className="flex items-center gap-2 text-foreground/70 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </nav>

          {/* Right: logo + user */}
          <div className="flex items-center gap-3">
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
    </div>
  );
}
