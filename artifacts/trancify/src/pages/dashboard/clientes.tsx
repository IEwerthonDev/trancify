import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { apiGet, type ClientHistoryEntry } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Users, Phone, Calendar as CalendarIcon, DollarSign, Image as ImageIcon, ChevronDown } from "lucide-react";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClientesPage() {
  const { data: clients, isLoading } = useQuery({
    queryKey: ["client-history"],
    queryFn: () => apiGet<ClientHistoryEntry[]>("/appointments/clients/history"),
  });
  const [query, setQuery] = useState("");

  const filtered = (clients ?? []).filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.clientName.toLowerCase().includes(q) || (c.clientPhone ?? "").includes(q);
  });

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          Histórico de Clientes
        </h1>
        <p className="text-muted-foreground mt-2 text-base sm:text-lg">
          Veja todas as clientes que já agendaram com você e o histórico completo de cada uma.
        </p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por nome ou WhatsApp..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-12 px-5 rounded-2xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-card rounded-2xl border border-border/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-3xl border border-border/50">
          <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {clients?.length === 0 ? "Nenhuma cliente ainda — os agendamentos aparecerão aqui." : "Nenhuma cliente encontrada."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <ClientCard key={c.clientKey} client={c} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

function ClientCard({ client }: { client: ClientHistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-card rounded-3xl border border-border/50 overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full p-5 sm:p-6 flex items-center justify-between gap-4 hover:bg-secondary/40 transition-colors text-left"
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-lg">
            {client.clientName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-lg text-foreground truncate">{client.clientName}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-0.5">
              {client.clientPhone && (
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {client.clientPhone}</span>
              )}
              {client.lastVisit && (
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" /> Última: {format(parseISO(client.lastVisit), "dd/MM/yyyy")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-6 shrink-0">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Visitas</p>
            <p className="font-bold text-foreground">{client.totalAppointments}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total gasto</p>
            <p className="font-bold text-primary">{formatCurrency(client.totalSpent)}</p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t border-border/50 bg-secondary/20 p-5 sm:p-6 space-y-3">
          <div className="grid grid-cols-3 gap-3 mb-4 sm:hidden">
            <Stat label="Visitas" value={String(client.totalAppointments)} />
            <Stat label="Gasto" value={formatCurrency(client.totalSpent)} />
            <Stat label="Lucro" value={formatCurrency(client.totalProfit)} />
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Agendamentos</p>
          {client.appointments.map((a) => (
            <div key={a.id} className="bg-card rounded-2xl p-4 border border-border/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground truncate">{a.serviceName}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(a.date), "dd/MM/yyyy", { locale: ptBR })} às {a.time}
                  </p>
                  <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-md ${statusClass(a.status)}`}>
                    {statusLabel(a.status)}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-foreground">{formatCurrency(a.servicePrice)}</p>
                  {a.profit != null && (
                    <p className="text-xs text-emerald-600">Lucro: {formatCurrency(a.profit)}</p>
                  )}
                </div>
              </div>
              {a.referencePhotos && a.referencePhotos.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {a.referencePhotos.map((url, i) => (
                    <img key={i} src={url} alt="ref" className="w-16 h-16 object-cover rounded-lg border border-border" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-xl p-3 border border-border/40 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="font-bold text-sm text-foreground">{value}</p>
    </div>
  );
}

function statusLabel(s: string): string {
  return { pending: "Pendente", confirmed: "Confirmado", completed: "Concluído", cancelled: "Cancelado" }[s] ?? s;
}
function statusClass(s: string): string {
  return {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    completed: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-800",
  }[s] ?? "bg-secondary text-foreground";
}
