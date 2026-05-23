import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/hooks/useAuth";

export const ProtectedRoute = ({
  children,
  requireRoles,
  requireAdmin,
  requireAccountsAccess,
}: {
  children: React.ReactNode;
  requireRoles?: AppRole[];
  requireAdmin?: boolean;
  requireAccountsAccess?: boolean;
}) => {
  const { user, role, accountsAccess, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && role !== "admin") {
    return <Navigate to="/" replace />;
  }
  if (requireRoles && role && !requireRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  if (requireAccountsAccess && role !== "admin" && !accountsAccess) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};
