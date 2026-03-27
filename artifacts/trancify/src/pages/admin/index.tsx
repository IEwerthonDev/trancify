import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAdminGetStats, useAdminGetTenants } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Users, TrendingUp, DollarSign, Calendar, CheckCircle, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AdminOverview() {
  const { data: stats, isLoading: statsLoading } = useAdminGetStats();
  const { data: tenants, isLoading: tenantsLoading } = useAdminGetTenants();

  const recentTenants = tenants?.slice(-5).reverse() ?? [];

  const chartData = (stats?.monthlyData ?? []).map((m: any) => ({
    ...m,
    label: format(parseISO(`${m.month}-01`), "MMM/yy", { locale: ptBR }),
  }));

  return (
    <DashboardLayout>
      <div className="mb-6 sm:mb-10">
        <h1 className="text-2xl sm:text-4xl font-display font-bold text-foreground">Visão Geral da Plataforma</h1>
        <p className="text-muted-foreground mt-1 sm:mt-2 text-base sm:text-lg">Estatísticas globais do Trancify.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        <StatCard
          title="Total de Trancistas"
          value={statsLoading ? "..." : String(stats?.totalTenants ?? 0)}
          icon={Users}
          color="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          trend="Todas cadastradas"
        />
        <StatCard
          title="Ativas"
          value={statsLoading ? "..." : String(stats?.activeTenants ?? 0)}
          icon={CheckCircle}
          color="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
          trend="Em operação"
        />
        <StatCard
          title="Agendamentos"
          value={statsLoading ? "..." : String(stats?.totalAppointments ?? 0)}
          icon={Calendar}
          color="bg-primary/10 text-primary"
          trend="Total na plataforma"
        />
        <StatCard
          title="Receita Total"
          value={statsLoading ? "..." : formatCurrency(stats?.totalRevenue ?? 0)}
          icon={DollarSign}
          color="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
          trend="Gerada pelas trancistas"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Monthly Chart */}
        <div className="xl:col-span-2 bg-card rounded-3xl border border-border/50 shadow-xl shadow-black/5 p-5 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-display font-bold mb-5 sm:mb-8">Agendamentos por Mês</h2>
          {chartData.length === 0 ? (
            <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground">
              Nenhum dado disponível ainda.
            </div>
          ) : (
            <div className="w-full overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barCategoryGap="30%" margin={{ left: -10, right: 4, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={36} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      color: "hsl(var(--foreground))",
                      fontSize: 13,
                    }}
                    formatter={(val: any, name: string) => {
                      if (name === "revenue") return [formatCurrency(val), "Receita"];
                      return [val, "Agendamentos"];
                    }}
                  />
                  <Bar dataKey="appointments" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Tenants */}
        <div className="bg-card rounded-3xl border border-border/50 shadow-xl shadow-black/5 p-5 sm:p-8">
          <div className="flex justify-between items-center mb-5 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-display font-bold">Trancistas Recentes</h2>
            <Link href="/admin/tenants" className="text-sm text-primary font-semibold hover:underline">
              Ver todas
            </Link>
          </div>
          {tenantsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-secondary/50 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {recentTenants.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">/{t.slug} · {t.plan}</p>
                  </div>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${t.status === "active" ? "bg-emerald-500" : "bg-red-400"}`} />
                </div>
              ))}
              {recentTenants.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma trancista cadastrada.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon: Icon, color, trend }: any) {
  return (
    <div className="bg-card p-6 rounded-3xl border border-border/50 shadow-lg shadow-black/5 hover:shadow-xl transition-shadow relative overflow-hidden group">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 transition-transform group-hover:scale-150 ${color}`} />
      <div className="flex items-start justify-between mb-4 relative z-10">
        <h3 className="text-muted-foreground font-medium text-sm">{title}</h3>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="relative z-10">
        <span className="text-3xl font-bold text-foreground font-display tracking-tight">{value}</span>
        <p className="text-sm text-muted-foreground mt-2">{trend}</p>
      </div>
    </div>
  );
}
