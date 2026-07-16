import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetMyTenant } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet, Clock, CheckCircle2, Receipt, Zap, WifiOff, ExternalLink, AlertCircle,
} from "lucide-react";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type PaymentAppt = {
  id: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  servicePrice: number;
  paidAmount: number;
  depositAmount: number;
  paymentStatus: "unpaid" | "deposit_paid" | "fully_paid";
  status: string;
  bookingType: string;
  depositDeadline: string | null;
  paidAt: string | null;
  provider: "infinitepay" | "simulated" | null;
  receiptUrl: string | null;
};

type PaymentsData = {
  summary: { totalReceived: number; totalPending: number; paidCount: number; pendingCount: number };
  paid: PaymentAppt[];
  pending: PaymentAppt[];
};

const PAY_STATUS: Record<string, { label: string; classes: string }> = {
  fully_paid: { label: "Pago", classes: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  deposit_paid: { label: "Sinal pago", classes: "bg-blue-100 text-blue-800 border-blue-300" },
  unpaid: { label: "Aguardando", classes: "bg-amber-100 text-amber-800 border-amber-300" },
};

export default function PagamentosPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tenant } = useGetMyTenant();
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const { data, isLoading } = useQuery<PaymentsData>({
    queryKey: ["payments"],
    queryFn: async () => {
      const token = localStorage.getItem("trancify_token");
      const res = await fetch(`${BASE}/api/payments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Falha ao carregar pagamentos");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  // Realtime updates over WebSocket
  useEffect(() => {
    const token = localStorage.getItem("trancify_token");
    if (!token) return;

    let closedByUs = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${proto}://${window.location.host}${BASE}/api/ws?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onopen = () => setWsConnected(true);
      ws.onmessage = (ev) => {
        try {
          const event = JSON.parse(ev.data);
          if (event?.type === "payment") {
            toast({
              title: "💰 Pagamento recebido!",
              description: `${event.clientName} pagou ${formatCurrency(event.amount)} (${event.paymentType === "deposit" ? "sinal" : "valor total"})`,
            });
            queryClient.invalidateQueries({ queryKey: ["payments"] });
          }
        } catch {
          // ignore malformed messages
        }
      };
      ws.onclose = () => {
        setWsConnected(false);
        if (!closedByUs) {
          retryTimer = setTimeout(connect, 5000);
        }
      };
      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      closedByUs = true;
      if (retryTimer) clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, [queryClient, toast]);

  const hasHandle = Boolean(tenant?.infinitepayHandle);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Pagamentos</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Acompanhe os pagamentos dos seus agendamentos em tempo real.
            </p>
          </div>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border self-start ${
              wsConnected
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-stone-100 text-stone-500 border-stone-200"
            }`}
          >
            {wsConnected ? <Zap className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {wsConnected ? "Tempo real ativo" : "Reconectando..."}
          </div>
        </div>

        {!hasHandle && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-amber-800 dark:text-amber-300">Pagamentos em modo simulado</p>
              <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                Configure sua InfiniteTag da InfinitePay em{" "}
                <Link href="/dashboard/configuracoes" className="underline font-semibold">
                  Configurações
                </Link>{" "}
                para receber pagamentos reais via Pix e cartão.
              </p>
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-card rounded-2xl border border-border/60 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2">
              <Wallet className="w-4 h-4 text-emerald-600" /> Recebido
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              {formatCurrency(data?.summary.totalReceived ?? 0)}
            </p>
          </div>
          <div className="bg-card rounded-2xl border border-border/60 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2">
              <Clock className="w-4 h-4 text-amber-600" /> Pendente
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              {formatCurrency(data?.summary.totalPending ?? 0)}
            </p>
          </div>
          <div className="bg-card rounded-2xl border border-border/60 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Pagos
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">{data?.summary.paidCount ?? 0}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border/60 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2">
              <Receipt className="w-4 h-4 text-blue-600" /> Aguardando
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">{data?.summary.pendingCount ?? 0}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 rounded-full border-4 border-border border-t-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* Received payments */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-foreground px-1">Pagamentos recebidos</h2>
              {data && data.paid.length > 0 ? (
                <div className="bg-card rounded-2xl border border-border/60 overflow-hidden divide-y divide-border/60">
                  {data.paid.map((p) => {
                    const cfg = PAY_STATUS[p.paymentStatus] ?? PAY_STATUS.unpaid!;
                    return (
                      <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{p.clientName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {p.serviceName} · {format(parseISO(p.date), "dd/MM/yyyy", { locale: ptBR })} às {p.time}
                          </p>
                          {p.paidAt && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Pago em {format(parseISO(p.paidAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              {p.provider === "infinitepay" ? " · InfinitePay" : p.provider === "simulated" ? " · Simulado" : ""}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {p.receiptUrl && (
                            <a
                              href={p.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted-foreground hover:text-primary"
                              title="Ver comprovante"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.classes}`}>
                            {cfg.label}
                          </span>
                          <span className="font-bold text-sm text-emerald-600 w-24 text-right">
                            {formatCurrency(p.paidAmount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-card rounded-2xl border border-border/60 p-8 text-center text-sm text-muted-foreground">
                  Nenhum pagamento recebido ainda.
                </div>
              )}
            </section>

            {/* Awaiting payment */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-foreground px-1">Aguardando pagamento</h2>
              {data && data.pending.length > 0 ? (
                <div className="bg-card rounded-2xl border border-border/60 overflow-hidden divide-y divide-border/60">
                  {data.pending.map((p) => (
                    <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{p.clientName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {p.serviceName} · {format(parseISO(p.date), "dd/MM/yyyy", { locale: ptBR })} às {p.time}
                        </p>
                        {p.depositDeadline && (
                          <p className="text-[11px] text-amber-600 font-medium mt-0.5">
                            Prazo do sinal: {format(parseISO(p.depositDeadline), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-amber-100 text-amber-800 border-amber-300">
                          {p.bookingType === "pre_appointment" ? "Pré-agendamento" : "Agendamento"}
                        </span>
                        <span className="font-bold text-sm text-foreground w-24 text-right">
                          {formatCurrency(Math.max(0, p.servicePrice - p.paidAmount))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-card rounded-2xl border border-border/60 p-8 text-center text-sm text-muted-foreground">
                  Nenhum agendamento aguardando pagamento.
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
