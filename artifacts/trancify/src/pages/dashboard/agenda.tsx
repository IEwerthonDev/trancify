import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetMyAppointments } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, parseISO, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-400",
  confirmed: "bg-blue-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-400",
  expired: "bg-orange-500",
};

// Lighter tints used for full-cell backgrounds in the calendar
const STATUS_CELL_BG: Record<string, string> = {
  pending: "bg-yellow-200 text-yellow-900 hover:bg-yellow-300",
  confirmed: "bg-blue-200 text-blue-900 hover:bg-blue-300",
  completed: "bg-emerald-200 text-emerald-900 hover:bg-emerald-300",
  cancelled: "bg-red-200 text-red-900 hover:bg-red-300",
  expired: "bg-orange-200 text-orange-900 hover:bg-orange-300",
};

// Priority when a day has appointments in multiple statuses (most "active" wins)
const STATUS_PRIORITY: string[] = ["confirmed", "pending", "completed", "expired", "cancelled"];

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  expired: "Expirado",
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  card: "Cartão",
  cash: "Dinheiro",
};

const BRAID_LABELS: Record<string, string> = {
  mid_back: "Até o meio das costas",
  waist_butt: "Até a cintura/bumbum",
};

export default function AgendaPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const { data: appointments, isLoading } = useGetMyAppointments({ startDate, endDate });

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const firstDayOffset = getDay(startOfMonth(currentMonth));

  const appointmentsForDate = (date: Date) =>
    (appointments ?? []).filter((a) => isSameDay(parseISO(a.date), date));

  const selectedAppointments = selectedDate
    ? appointmentsForDate(selectedDate).sort((a, b) => a.time.localeCompare(b.time))
    : [];

  return (
    <DashboardLayout>
      <div className="mb-6 sm:mb-10">
        <h1 className="text-2xl sm:text-4xl font-display font-bold text-foreground">Agenda</h1>
        <p className="text-muted-foreground mt-1 sm:mt-2 text-base sm:text-lg">Visualize seus agendamentos no calendário.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        {/* Calendar */}
        <div className="xl:col-span-2 bg-card rounded-[2rem] border border-border/50 shadow-xl shadow-black/5 p-4 sm:p-8">
          {/* Month Nav */}
          <div className="flex items-center justify-between mb-5 sm:mb-8">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg sm:text-2xl font-display font-bold capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map((day) => {
              const dayAppts = appointmentsForDate(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);

              // Pick the dominant status (by priority) so the whole cell takes its color
              const dominantStatus = dayAppts.length === 0
                ? null
                : STATUS_PRIORITY.find((s) => dayAppts.some((a) => a.status === s)) ?? dayAppts[0]!.status;
              const cellBg = dominantStatus ? STATUS_CELL_BG[dominantStatus] : null;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`relative aspect-square flex flex-col items-center justify-center p-1.5 rounded-xl transition-all duration-150 text-sm font-medium ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 ring-2 ring-primary"
                      : cellBg
                      ? `${cellBg} shadow-sm`
                      : isCurrentDay
                      ? "bg-primary/10 text-primary ring-2 ring-primary/30"
                      : "hover:bg-secondary text-foreground"
                  }`}
                  title={dominantStatus ? `${dayAppts.length} ${STATUS_LABELS[dominantStatus]?.toLowerCase() ?? ""}` : undefined}
                >
                  <span className="font-bold text-base">{format(day, "d")}</span>
                  {dayAppts.length > 0 && (
                    <span className="text-[10px] font-semibold opacity-75">
                      {dayAppts.length} agend.
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-border/50">
            {Object.entries(STATUS_CELL_BG).map(([status, bg]) => (
              <div key={status} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`w-4 h-4 rounded-md ${bg.split(" ")[0]}`} />
                {STATUS_LABELS[status]}
              </div>
            ))}
          </div>
        </div>

        {/* Day Detail */}
        <div className="bg-card rounded-[2rem] border border-border/50 shadow-xl shadow-black/5 p-4 sm:p-8">
          <h3 className="text-xl font-display font-bold mb-1">
            {selectedDate
              ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
              : "Selecione um dia"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {selectedDate
              ? `${selectedAppointments.length} agendamento(s)`
              : "Clique em um dia para ver os detalhes"}
          </p>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-secondary/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : selectedAppointments.length === 0 ? (
            <div className="text-center py-10 bg-secondary/30 rounded-2xl border-2 border-dashed border-border">
              <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">Nenhum agendamento neste dia.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="p-4 rounded-2xl border border-border/50 bg-secondary/30 hover:bg-secondary/60 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-background px-3 py-1.5 rounded-lg shadow-sm border border-border text-center min-w-[60px]">
                      <span className="block text-base font-bold text-primary">{appt.time}</span>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[appt.status] ?? "bg-muted"}`} />
                    <span className="text-xs font-semibold text-muted-foreground">{STATUS_LABELS[appt.status]}</span>
                  </div>
                  <div className="pl-1">
                    <p className="font-bold text-foreground">{appt.clientName}</p>
                    <p className="text-sm text-muted-foreground">{appt.serviceName}</p>
                    <p className="text-xs text-muted-foreground">{BRAID_LABELS[appt.braidSize] ?? appt.braidSize}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-primary">{formatCurrency(appt.servicePrice)}</span>
                      <span className="text-xs text-muted-foreground">{PAYMENT_LABELS[appt.paymentMethod] ?? appt.paymentMethod}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
