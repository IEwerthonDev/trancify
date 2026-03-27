import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetTenantReport } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingUp, TrendingDown, Calendar, CheckCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

const PRESETS = [
  { label: "Este mês", months: 0 },
  { label: "Mês anterior", months: 1 },
  { label: "Últimos 3 meses", months: 3 },
  { label: "Últimos 6 meses", months: 6 },
];

export default function RelatoriosPage() {
  const [preset, setPreset] = useState(0);

  const now = new Date();
  const startDate = format(startOfMonth(subMonths(now, preset)), "yyyy-MM-dd");
  const endDate = format(endOfMonth(now), "yyyy-MM-dd");

  const { data: report, isLoading } = useGetTenantReport({ startDate, endDate });

  const statusLabels: Record<string, string> = {
    pending: "Pendentes",
    confirmed: "Confirmados",
    completed: "Concluídos",
    cancelled: "Cancelados",
  };

  const chartData = (report?.monthlyData ?? []).map((m: any) => ({
    ...m,
    label: format(parseISO(`${m.month}-01`), "MMM/yy", { locale: ptBR }),
  }));

  const appointmentsByStatus: Record<string, number> = (report as any)?.appointmentsByStatus ?? {};

  return (
    <DashboardLayout>
      <div className="mb-6 sm:mb-10">
        <h1 className="text-2xl sm:text-4xl font-display font-bold text-foreground">Relatórios Financeiros</h1>
        <p className="text-muted-foreground mt-1 sm:mt-2 text-base sm:text-lg">Acompanhe sua receita, custos e lucro real.</p>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
        {PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => setPreset(p.months)}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              preset === p.months
                ? "bg-foreground text-background shadow-md"
                : "bg-card border border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-10">
        <StatCard
          title="Agendamentos"
          value={isLoading ? "..." : String(report?.totalAppointments ?? 0)}
          icon={Calendar}
          color="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          trend="No período"
        />
        <StatCard
          title="Faturamento Bruto"
          value={isLoading ? "..." : formatCurrency(report?.totalRevenue ?? 0)}
          icon={DollarSign}
          color="bg-primary/10 text-primary"
          trend="Valor cobrado dos clientes"
        />
        <StatCard
          title="Custo de Material"
          value={isLoading ? "..." : formatCurrency(report?.totalCosts ?? 0)}
          icon={TrendingDown}
          color="bg-destructive/10 text-destructive"
          trend="Gasto com jumbo e material"
        />
        <StatCard
          title="Lucro Líquido"
          value={isLoading ? "..." : formatCurrency(report?.totalProfit ?? 0)}
          icon={TrendingUp}
          color="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
          trend="Faturamento − Custos"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Monthly Chart */}
        <div className="xl:col-span-2 bg-card rounded-3xl border border-border/50 shadow-xl shadow-black/5 p-5 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-display font-bold mb-5 sm:mb-8">Receita vs. Lucro por Mês</h2>
          {chartData.length === 0 ? (
            <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground">
              Nenhum dado no período selecionado.
            </div>
          ) : (
            <div className="w-full overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barCategoryGap="30%" margin={{ left: -10, right: 4, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={48} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      color: "hsl(var(--foreground))",
                      fontSize: 13,
                    }}
                    formatter={(val: any, name: string) => [
                      formatCurrency(val),
                      name === "revenue" ? "Receita" : "Lucro",
                    ]}
                  />
                  <Legend
                    formatter={(value) => (value === "revenue" ? "Receita" : "Lucro")}
                    wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="profit" fill="hsl(160, 60%, 45%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="bg-card rounded-3xl border border-border/50 shadow-xl shadow-black/5 p-5 sm:p-8">
          <h2 className="text-lg sm:text-xl font-display font-bold mb-5 sm:mb-6">Por Status</h2>
          <div className="space-y-4">
            {Object.entries(appointmentsByStatus).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados no período.</p>
            ) : (
              Object.entries(appointmentsByStatus).map(([status, count]) => {
                const total = report?.totalAppointments || 1;
                const pct = Math.round(((count as number) / total) * 100);
                const colors: Record<string, string> = {
                  pending: "bg-yellow-400",
                  confirmed: "bg-blue-500",
                  completed: "bg-emerald-500",
                  cancelled: "bg-red-400",
                };
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{statusLabels[status] ?? status}</span>
                      <span className="text-muted-foreground">{count as number} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${colors[status] ?? "bg-primary"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {report && (report.totalRevenue > 0) && (
            <div className="mt-8 pt-6 border-t border-border/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ticket médio</span>
                <span className="font-bold">
                  {formatCurrency(report.totalRevenue / Math.max(report.totalAppointments, 1))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Margem de lucro</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {report.totalRevenue > 0
                    ? `${Math.round((report.totalProfit / report.totalRevenue) * 100)}%`
                    : "—"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon: Icon, color, trend }: any) {
  return (
    <div className="bg-card p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-border/50 shadow-lg shadow-black/5 hover:shadow-xl transition-shadow relative overflow-hidden group min-w-0">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 transition-transform group-hover:scale-150 ${color}`} />
      <div className="flex items-start justify-between mb-2 sm:mb-4 relative z-10 gap-1">
        <h3 className="text-muted-foreground font-medium text-[11px] sm:text-sm leading-tight">{title}</h3>
        <div className={`p-1.5 sm:p-3 rounded-lg sm:rounded-xl shrink-0 ${color}`}>
          <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
        </div>
      </div>
      <div className="relative z-10 min-w-0">
        <span className="text-base sm:text-3xl font-bold text-foreground font-display tracking-tight break-words leading-tight block">{value}</span>
        <p className="text-[10px] sm:text-sm text-muted-foreground mt-1 sm:mt-2 leading-tight">{trend}</p>
      </div>
    </div>
  );
}
