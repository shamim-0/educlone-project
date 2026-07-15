import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
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
  ChevronDown,
  UserCheck,
  ListTodo,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { cn } from "@/lib/utils";

const menu = [
  { to: "/", label: "Dashboard", icon: CheckSquare, end: true },
  { to: "/company", label: "Company", icon: Building2 },
  { to: "/branch", label: "Branch", icon: GitBranch, adminOnly: true },
  { to: "/accounts", label: "Accounts", icon: Wallet, requiresAccounts: true },
  { to: "/pending", label: "Pending", icon: ClipboardList },
  { to: "/users", label: "Users", icon: Users, adminOnly: true },
  { to: "/services", label: "Services", icon: ListChecks, roles: ["admin", "sub_admin"] as string[] },
  { to: "/packages", label: "Packages", icon: Package, adminOnly: true },
  { to: "/my-tasks", label: "My Tasks", icon: UserCheck, roles: ["editor", "sub_admin"] as string[] },
  { to: "/todo-list", label: "To Do List", icon: ListTodo, adminOnly: true },
  { to: "/my-todo-list", label: "To Do List", icon: ListTodo, roles: ["editor", "sub_admin"] as string[] },
];

export default function AppLayout() {
  const { signOut, username, role, accountsAccess } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const [pwdOpen, setPwdOpen] = useState(false);

  const pendingStatusItems = [
    { value: "", label: "🕐 Pending (default)" },
    { value: "not_started", label: "⚪ Not Started" },
    { value: "processing", label: "🔵 Processing" },
    { value: "applied", label: "🟣 Applied" },
    { value: "done", label: "🟢 Done" },
    { value: "no_need", label: "⚫ No Need" },
  ];
  const visibleMenu = menu.filter((m: any) => {
    if (m.adminOnly && role !== "admin") return false;
    if (m.roles && !m.roles.includes(role ?? "")) return false;
    if (m.requiresAccounts && role !== "admin" && !accountsAccess) return false;
    return true;
  });
  const currentStatus = new URLSearchParams(location.search).get("status") ?? "";
  const activePendingItem = pendingStatusItems.find((s) => s.value === currentStatus);
  const pendingLabel = location.pathname === "/pending" && activePendingItem && currentStatus
    ? activePendingItem.label.replace(/^[^\s]+\s/, "")
    : "Pending";

  const handleLogout = async () => {
    await signOut();
    nav("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/90 backdrop-blur-xl shadow-sm">
        <div className="container">
          <div className="flex min-h-16 items-center justify-between gap-4 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-hero shadow-elegant">
                <CheckSquare className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-lg font-bold leading-tight text-primary">
                  ISBI Tracker
                </div>
                <div className="hidden text-xs font-medium text-muted-foreground sm:block">
                  Service workflow dashboard
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {username && (
                <div className="mr-2 hidden flex-col items-end leading-tight md:flex">
                  <span className="max-w-32 truncate text-sm font-semibold">{username}</span>
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                    {role}
                  </span>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                aria-label="Toggle theme"
                className="h-9 w-9 rounded-lg text-foreground/70 hover:text-foreground"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPwdOpen(true)}
                aria-label="Change password"
                className="h-9 w-9 rounded-lg text-foreground/70 hover:text-foreground"
              >
                <KeyRound className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                aria-label="Logout"
                className="h-9 w-9 rounded-lg text-foreground/70 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <nav className="flex min-h-12 items-center gap-1 overflow-visible pb-2">
            {visibleMenu.map((m) => {
              const linkEl = (
                <NavLink
                  to={m.to}
                  end={m.end}
                  className={({ isActive }) =>
                    cn(
                      "flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-all whitespace-nowrap",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-elegant"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )
                  }
                >
                  <m.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{m.label}</span>
                </NavLink>
              );
              if (m.to === "/pending") {
                const pendingLinkEl = (
                  <NavLink
                    to={m.to}
                    end={m.end}
                    className={({ isActive }) =>
                      cn(
                        "flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-all whitespace-nowrap",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-elegant"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )
                    }
                  >
                    <m.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{pendingLabel}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-75" />
                  </NavLink>
                );
                return (
                  <div key={m.to} className="group relative">
                    {pendingLinkEl}
                    <div className="absolute left-0 top-full z-50 hidden pt-2 group-hover:block">
                      <div className="min-w-[210px] rounded-lg border border-border bg-popover p-1.5 shadow-elegant">
                        {pendingStatusItems.map((s) => {
                          const to = s.value ? `/pending?status=${s.value}` : "/pending";
                          const active = location.pathname === "/pending" &&
                            (s.value ? location.search.includes(`status=${s.value}`) : !location.search);
                          return (
                            <button
                              key={s.value || "all"}
                              onClick={() => nav(to)}
                              className={cn(
                                "w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                                active ? "bg-primary text-primary-foreground" : "text-popover-foreground hover:bg-secondary"
                              )}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }
              return <div key={m.to}>{linkEl}</div>;
            })}
          </nav>
        </div>
      </header>


      <main className="container py-8">
        <Outlet />
      </main>

      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />
    </div>
  );
}
