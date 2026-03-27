import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetMyAppointments, useGetTenantReport, useGetMyTenant } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Users, DollarSign, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";

export default function DashboardHome() {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  const { data: tenant } = useGetMyTenant();
  const { data: appointments, isLoading: isLoadingApps } = useGetMyAppointments({
    startDate: todayStr,
    endDate: todayStr
  });
  
  // Get start and end of current month for report
  const date = new Date();
  const startOfMonth = format(new Date(date.getFullYear(), date.getMonth(), 1), 'yyyy-MM-dd');
  const endOfMonth = format(new Date(date.getFullYear(), date.getMonth() + 1, 0), 'yyyy-MM-dd');
  
  const { data: report, isLoading: isLoadingReport } = useGetTenantReport({
    startDate: startOfMonth,
    endDate: endOfMonth
  });

  const upcomingAppointments = appointments?.filter(a => a.status === 'confirmed' || a.status === 'pending') || [];

  return (
    <DashboardLayout>
      <div className="mb-6 sm:mb-10">
        <h1 className="text-2xl sm:text-4xl font-display font-bold text-foreground">Olá, {tenant?.name || 'Trancista'}! ✨</h1>
        <p className="text-muted-foreground mt-1 sm:mt-2 text-base sm:text-lg">Aqui está o resumo do seu salão hoje.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
        <StatCard 
          title="Agendamentos Hoje" 
          value={isLoadingApps ? "..." : upcomingAppointments.length.toString()} 
          icon={Users} 
          trend="Atendimentos confirmados"
          color="bg-blue-50 text-blue-600"
        />
        <StatCard 
          title="Faturamento (Mês)" 
          value={isLoadingReport ? "..." : formatCurrency(report?.totalRevenue)} 
          icon={DollarSign} 
          trend="Receita bruta"
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard 
          title="Lucro Líquido (Mês)" 
          value={isLoadingReport ? "..." : formatCurrency(report?.totalProfit)} 
          icon={TrendingUp} 
          trend="Receita - Custos"
          color="bg-primary/10 text-primary"
        />
        <StatCard 
          title="Custo de Material" 
          value={isLoadingReport ? "..." : formatCurrency(report?.totalCosts)} 
          icon={AlertCircle} 
          trend="Despesas do mês"
          color="bg-destructive/10 text-destructive"
        />
      </div>

      {/* Today's Schedule */}
      <div className="bg-card border border-border/50 rounded-3xl p-5 sm:p-8 shadow-xl shadow-black/5">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6 sm:mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground">Agenda de Hoje</h2>
            <p className="text-muted-foreground text-sm sm:text-base">{format(new Date(), "dd 'de' MMMM", { locale: ptBR })}</p>
          </div>
          <Link href="/dashboard/agenda" className="text-primary font-semibold hover:underline text-sm">
            Ver calendário completo
          </Link>
        </div>

        {isLoadingApps ? (
          <div className="h-40 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : upcomingAppointments.length === 0 ? (
          <div className="text-center py-12 bg-secondary/30 rounded-2xl border-2 border-dashed border-border">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum agendamento para hoje</h3>
            <p className="text-muted-foreground">Aproveite o dia para organizar o salão ou descansar!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingAppointments.sort((a,b) => a.time.localeCompare(b.time)).map((app) => (
              <div key={app.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-5 rounded-2xl bg-secondary/50 border border-border hover:border-primary/30 transition-colors">
                <div className="bg-background px-4 py-2 rounded-xl shadow-sm border border-border text-center min-w-[80px]">
                  <span className="block text-xl font-bold text-primary">{app.time}</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-foreground">{app.clientName}</h4>
                  <p className="text-muted-foreground">{app.serviceName} • {app.braidSize === 'mid_back' ? 'Costas' : 'Cintura'}</p>
                </div>
                <div className="text-right sm:text-right w-full sm:w-auto">
                  <div className="text-lg font-bold text-foreground">{formatCurrency(app.servicePrice)}</div>
                  <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mt-1">
                    {app.paymentMethod}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon: Icon, trend, color }: any) {
  return (
    <div className="bg-card p-4 sm:p-6 rounded-3xl border border-border/50 shadow-lg shadow-black/5 hover:shadow-xl transition-shadow relative overflow-hidden group">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 transition-transform group-hover:scale-150 ${color}`} />
      <div className="flex items-start justify-between mb-3 sm:mb-4 relative z-10">
        <h3 className="text-muted-foreground font-medium text-xs sm:text-sm leading-tight pr-1">{title}</h3>
        <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${color}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
      <div className="relative z-10">
        <span className="text-xl sm:text-3xl font-bold text-foreground font-display tracking-tight">{value}</span>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">{trend}</p>
      </div>
    </div>
  );
}
