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
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
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

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`relative aspect-square flex flex-col items-center justify-start p-1.5 rounded-xl transition-all duration-150 text-sm font-medium ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : isCurrentDay
                      ? "bg-primary/10 text-primary ring-2 ring-primary/30"
                      : "hover:bg-secondary text-foreground"
                  }`}
                >
                  <span className="font-bold">{format(day, "d")}</span>
                  {dayAppts.length > 0 && (
                    <div className="flex gap-0.5 mt-auto mb-0.5">
                      {dayAppts.slice(0, 3).map((a, i) => (
                        <span
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? "bg-primary-foreground" : STATUS_COLORS[a.status] ?? "bg-primary"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-border/50">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
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
