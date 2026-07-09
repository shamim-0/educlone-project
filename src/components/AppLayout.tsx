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

  const handleLogout = async () => {
    await signOut();
    nav("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/70 backdrop-blur-xl shadow-sm">
        <div className="container flex h-16 items-center gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0 mr-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero shadow-elegant">
              <CheckSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline font-display text-lg font-bold tracking-tight whitespace-nowrap bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              ISBI Tracker
            </span>
          </div>

          {/* Nav */}
          <nav className="flex flex-1 items-center gap-0.5 min-w-0">
            {visibleMenu.map((m) => {
              const linkEl = (
                <NavLink
                  to={m.to}
                  end={m.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all whitespace-nowrap",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                    )
                  }
                >
                  <m.icon className="h-4 w-4" />
                  <span className="hidden md:inline">{m.label}</span>
                </NavLink>
              );
              if (m.to === "/pending") {
                const currentStatus = new URLSearchParams(location.search).get("status") ?? "";
                const activeItem = pendingStatusItems.find((s) => s.value === currentStatus);
                const pendingLabel = location.pathname === "/pending" && activeItem && currentStatus
                  ? activeItem.label.replace(/^[^\s]+\s/, "")
                  : m.label;
                const pendingLinkEl = (
                  <NavLink
                    to={m.to}
                    end={m.end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all whitespace-nowrap",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                      )
                    }
                  >
                    <m.icon className="h-4 w-4" />
                    <span className="hidden md:inline">{pendingLabel}</span>
                  </NavLink>
                );
                return (
                  <div key={m.to} className="relative group">
                    {pendingLinkEl}
                    <div className="absolute left-0 top-full pt-1 hidden group-hover:block z-50">
                      <div className="min-w-[180px] rounded-lg border bg-popover shadow-lg p-1">
                        {pendingStatusItems.map((s) => {
                          const to = s.value ? `/pending?status=${s.value}` : "/pending";
                          const active = location.pathname === "/pending" &&
                            (s.value ? location.search.includes(`status=${s.value}`) : !location.search);
                          return (
                            <button
                              key={s.value || "all"}
                              onClick={() => nav(to)}
                              className={cn(
                                "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                                active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
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

          {/* Right: user actions */}
          <div className="flex items-center gap-1 shrink-0">
            {username && (
              <div className="hidden lg:flex flex-col items-end leading-tight mr-2">
                <span className="text-sm font-semibold">{username}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {role}
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Toggle theme"
              className="text-foreground/70 hover:text-foreground h-9 w-9"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPwdOpen(true)}
              aria-label="Change password"
              className="text-foreground/70 hover:text-foreground h-9 w-9"
            >
              <KeyRound className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              aria-label="Logout"
              className="text-foreground/70 hover:text-destructive h-9 w-9"
            >
              <LogOut className="h-4 w-4" />
            </Button>
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
