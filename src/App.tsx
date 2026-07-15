import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Login from "./pages/Login";
import Index from "./pages/Index";
import Company from "./pages/Company";
import CompanyDetail from "./pages/CompanyDetail";
import Branch from "./pages/Branch";
import Accounts from "./pages/Accounts";
import Pending from "./pages/Pending";
import MyTasks from "./pages/MyTasks";
import TodoList from "./pages/TodoList";
import MyTodoList from "./pages/MyTodoList";
import Users from "./pages/Users";
import Services from "./pages/Services";
import Packages from "./pages/Packages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Index />} />
              <Route path="/company" element={<Company />} />
              <Route path="/company/:id" element={<CompanyDetail />} />
              <Route path="/branch" element={<ProtectedRoute requireAdmin><Branch /></ProtectedRoute>} />
              <Route path="/accounts" element={<ProtectedRoute requireAccountsAccess><Accounts /></ProtectedRoute>} />
              <Route path="/pending" element={<Pending />} />
              <Route path="/my-tasks" element={<ProtectedRoute requireRoles={["editor","sub_admin"]}><MyTasks /></ProtectedRoute>} />
              <Route path="/todo-list" element={<ProtectedRoute requireAdmin><TodoList /></ProtectedRoute>} />
              <Route path="/my-todo-list" element={<ProtectedRoute requireRoles={["editor","sub_admin"]}><MyTodoList /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute requireAdmin><Users /></ProtectedRoute>} />
              <Route path="/services" element={<ProtectedRoute requireRoles={["admin","sub_admin"]}><Services /></ProtectedRoute>} />
              <Route path="/packages" element={<ProtectedRoute requireAdmin><Packages /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
