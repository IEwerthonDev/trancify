import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TrialExpiredGate } from "@/components/TrialExpiredGate";

// Pages
import HomePage from "@/pages/home";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import DashboardHome from "@/pages/dashboard/index";
import ServicosPage from "@/pages/dashboard/servicos";
import AgendamentosPage from "@/pages/dashboard/agendamentos";
import DisponibilidadePage from "@/pages/dashboard/disponibilidade";
import AgendaPage from "@/pages/dashboard/agenda";
import ConfiguracoesPage from "@/pages/dashboard/configuracoes";
import RelatoriosPage from "@/pages/dashboard/relatorios";
import AssinaturaPage from "@/pages/dashboard/assinatura";
import AdminOverview from "@/pages/admin/index";
import AdminTenants from "@/pages/admin/tenants";
import AdminContaPage from "@/pages/admin/conta";
import CadastroPage from "@/pages/cadastro";
import PublicBookingPage from "@/pages/public/booking";

const queryClient = new QueryClient();

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SubscriptionInfo {
  subscriptionStatus: "trial" | "active" | "cancelled" | "expired";
  trialEndsAt: string;
  subscriptionPlan: "monthly" | "annual" | null;
  subscriptionStartedAt: string | null;
  subscriptionEndsAt: string | null;
}

function useSubscriptionStatus(enabled: boolean) {
  return useQuery<SubscriptionInfo>({
    queryKey: ["/api/tenants/subscription"],
    queryFn: async () => {
      const token = localStorage.getItem("trancify_token");
      const res = await fetch(`${BASE}/api/tenants/subscription`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

function isTrialExpired(sub: SubscriptionInfo | undefined): boolean {
  if (!sub) return false;
  if (sub.subscriptionStatus === "expired") return true;
  if (sub.subscriptionStatus === "cancelled") return true;
  if (sub.subscriptionStatus === "trial") {
    return new Date(sub.trialEndsAt) < new Date();
  }
  return false;
}

function ProtectedRoute({
  component: Component,
  allowedRole,
  checkTrial = false,
}: {
  component: any;
  allowedRole?: string;
  checkTrial?: boolean;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const isTenant = isAuthenticated && user?.role === "tenant";
  const { data: subscription, isLoading: subLoading } = useSubscriptionStatus(
    checkTrial && isTenant
  );

  if (isLoading || (checkTrial && isTenant && subLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  if (allowedRole && user?.role !== allowedRole) {
    setLocation(user?.role === "super_admin" ? "/admin" : "/dashboard");
    return null;
  }

  if (checkTrial && isTenant && isTrialExpired(subscription)) {
    return <TrialExpiredGate />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/cadastro" component={CadastroPage} />

      {/* Tenant Routes — all guarded by trial check */}
      <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardHome} allowedRole="tenant" checkTrial />} />
      <Route path="/dashboard/servicos" component={() => <ProtectedRoute component={ServicosPage} allowedRole="tenant" checkTrial />} />
      <Route path="/dashboard/agendamentos" component={() => <ProtectedRoute component={AgendamentosPage} allowedRole="tenant" checkTrial />} />
      <Route path="/dashboard/disponibilidade" component={() => <ProtectedRoute component={DisponibilidadePage} allowedRole="tenant" checkTrial />} />
      <Route path="/dashboard/agenda" component={() => <ProtectedRoute component={AgendaPage} allowedRole="tenant" checkTrial />} />
      <Route path="/dashboard/configuracoes" component={() => <ProtectedRoute component={ConfiguracoesPage} allowedRole="tenant" checkTrial />} />
      <Route path="/dashboard/relatorios" component={() => <ProtectedRoute component={RelatoriosPage} allowedRole="tenant" checkTrial />} />
      {/* Assinatura page: accessible even if trial is expired so they can reactivate */}
      <Route path="/dashboard/assinatura" component={() => <ProtectedRoute component={AssinaturaPage} allowedRole="tenant" />} />

      {/* Admin Routes */}
      <Route path="/admin" component={() => <ProtectedRoute component={AdminOverview} allowedRole="super_admin" />} />
      <Route path="/admin/tenants" component={() => <ProtectedRoute component={AdminTenants} allowedRole="super_admin" />} />
      <Route path="/admin/conta" component={() => <ProtectedRoute component={AdminContaPage} allowedRole="super_admin" />} />

      {/* Public Booking Route - MUST be last as it's a catch-all for slugs */}
      <Route path="/:slug" component={PublicBookingPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
