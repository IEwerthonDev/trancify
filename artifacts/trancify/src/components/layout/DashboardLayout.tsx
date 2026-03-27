import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  CalendarDays,
  ListTodo,
  Scissors,
  Clock,
  Settings,
  BarChart3,
  LogOut,
  Users,
  Menu,
  X,
  MoreHorizontal,
  Moon,
  Sun,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const isSuperAdmin = user?.role === "super_admin";

  const tenantNav = [
    { name: "Início", href: "/dashboard", icon: LayoutDashboard },
    { name: "Agenda", href: "/dashboard/agenda", icon: CalendarDays },
    { name: "Agendamentos", href: "/dashboard/agendamentos", icon: ListTodo },
    { name: "Serviços", href: "/dashboard/servicos", icon: Scissors },
    { name: "Disponibilidade", href: "/dashboard/disponibilidade", icon: Clock },
    { name: "Relatórios", href: "/dashboard/relatorios", icon: BarChart3 },
    { name: "Assinatura", href: "/dashboard/assinatura", icon: CreditCard },
    { name: "Configurações", href: "/dashboard/configuracoes", icon: Settings },
  ];

  const adminNav = [
    { name: "Visão Geral", href: "/admin", icon: LayoutDashboard },
    { name: "Trancistas", href: "/admin/tenants", icon: Users },
    { name: "Minha Conta", href: "/admin/conta", icon: Settings },
  ];

  const navItems = isSuperAdmin ? adminNav : tenantNav;

  const bottomTabItems = isSuperAdmin
    ? adminNav
    : tenantNav.slice(0, 4);

  const isActive = (href: string) => location === href;

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Desktop Sidebar ── */}
      <aside className="w-72 bg-card border-r border-border/50 hidden md:flex flex-col fixed inset-y-0 z-10 shadow-2xl shadow-black/5">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-display font-bold text-xl shadow-lg">
            T
          </div>
          <span className="font-display font-bold text-2xl text-foreground tracking-tight">
            Trancify
          </span>
        </div>

        <div className="px-6 pb-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
            {isSuperAdmin ? "Administração" : "Meu Salão"}
          </div>
          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium group",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-transform group-hover:scale-110",
                    isActive(item.href) && "text-primary-foreground"
                  )}
                />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-border/50 space-y-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all text-sm font-medium"
            aria-label="Alternar tema"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 shrink-0" />
            )}
            {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
          </button>

          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-bold">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate text-foreground">
                {user?.email}
              </p>
              <p className="text-xs text-muted-foreground truncate capitalize">
                {user?.role.replace("_", " ")}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair da conta
          </Button>
        </div>
      </aside>

      {/* ── Mobile Top Header ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-16 bg-card border-b border-border/50 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm shadow">
            T
          </div>
          <span className="font-display font-bold text-lg text-foreground tracking-tight">
            Trancify
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
            aria-label="Alternar tema"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5 text-foreground" />
            ) : (
              <Moon className="w-5 h-5 text-foreground" />
            )}
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </header>

      {/* ── Mobile Side Drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-card flex flex-col shadow-2xl md:hidden"
            >
              {/* Drawer header */}
              <div className="h-16 flex items-center justify-between px-5 border-b border-border/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm shadow">
                    T
                  </div>
                  <span className="font-display font-bold text-lg text-foreground">
                    Trancify
                  </span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Nav */}
              <div className="flex-1 overflow-y-auto px-4 py-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                  {isSuperAdmin ? "Administração" : "Meu Salão"}
                </p>
                <nav className="space-y-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-150 font-medium",
                        isActive(item.href)
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      )}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {item.name}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Theme toggle + User + Logout */}
              <div className="p-4 border-t border-border/50 space-y-3">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all text-sm font-medium"
                >
                  {theme === "dark" ? (
                    <Sun className="w-4 h-4 shrink-0" />
                  ) : (
                    <Moon className="w-4 h-4 shrink-0" />
                  )}
                  {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                </button>
                <div className="flex items-center gap-3 px-2 py-1">
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">
                      {user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user?.role.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                  onClick={() => { logout(); setDrawerOpen(false); }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair da conta
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <main className="flex-1 md:pl-72 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        {/* top spacer for mobile header */}
        <div className="h-16 md:hidden shrink-0" />

        <div className="flex-1 p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full pb-24 md:pb-10 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </div>

        {/* bottom spacer for mobile tab bar */}
        <div className="h-20 md:hidden shrink-0" />
      </main>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border/50 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="flex items-stretch">
          {bottomTabItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-1 transition-colors relative"
              >
                {active && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", damping: 30, stiffness: 350 }}
                  />
                )}
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium leading-tight transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}

          {/* "Mais" button for tenant — opens the drawer */}
          {!isSuperAdmin && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-1 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
              <span className="text-[10px] font-medium leading-tight text-muted-foreground">
                Mais
              </span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
