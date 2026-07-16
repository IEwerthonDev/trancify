import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useGetPublicTenant } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import {
  Search, CheckCircle, Clock, AlertTriangle, Wallet, ArrowLeft,
  CalendarDays, Scissors, User, CreditCard, History,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { buildPublicTheme, hexToRgba } from "@/lib/public-theme";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Appt = {
  id: string;
  serviceName: string;
  braidSize: "mid_back" | "waist_butt";
  clientName: string;
  status: string;
  date: string;
  time: string;
  servicePrice: number;
  depositAmount: number;
  paidAmount: number;
  paymentStatus: "unpaid" | "deposit_paid" | "fully_paid";
  paymentMethod: "pix" | "card" | "cash";
  bookingType: "appointment" | "pre_appointment";
  depositDeadline: string | null;
};

type PendingAppt = Appt;

const BRAID_LABEL: Record<string, string> = {
  mid_back: "Até o meio das costas",
  waist_butt: "Até a cintura / Bumbum",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  pix: "Pix",
  card: "Cartão",
  cash: "Dinheiro (no salão)",
};

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  pending: { label: "Pendente", classes: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  confirmed: { label: "Confirmado ✓", classes: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  completed: { label: "Concluído", classes: "bg-blue-100 text-blue-800 border-blue-300" },
  cancelled: { label: "Cancelado", classes: "bg-red-100 text-red-800 border-red-300" },
  expired: { label: "Expirado", classes: "bg-stone-100 text-stone-600 border-stone-300" },
};

function isActiveAppt(a: Appt) {
  return (
    (a.status === "pending" || a.status === "confirmed") &&
    (a.paymentStatus === "unpaid" || a.paymentStatus === "deposit_paid")
  );
}

export default function PublicPagarPage() {
  const { slug } = useParams();
  const { toast } = useToast();
  const { data: tenant, isLoading: loadTenant, error: tenantErr } = useGetPublicTenant(slug || "");

  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");
    html.classList.remove("dark");
    return () => { if (hadDark) html.classList.add("dark"); };
  }, []);

  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<PendingAppt[]>([]);
  const [history, setHistory] = useState<Appt[]>([]);
  const [paying, setPaying] = useState<string | null>(null);
  const [paymentReturn, setPaymentReturn] = useState<{ ok: boolean; receiptUrl: string | null } | null>(null);

  // Handle the redirect back from the InfinitePay checkout:
  // /pagar/:slug?paid=1&receipt_url=... — show a banner and re-run the search
  // with the CPF we saved before redirecting.
  useEffect(() => {
    if (!tenant?.id) return;
    const params = new URLSearchParams(window.location.search);
    const paid = params.get("paid");
    if (paid === null) return;
    const receiptUrl = params.get("receipt_url");
    setPaymentReturn({ ok: paid === "1", receiptUrl });
    // Clean the URL so refreshes don't re-show the banner
    window.history.replaceState({}, "", window.location.pathname);
    const savedCpf = sessionStorage.getItem("trancify_pagar_cpf");
    if (savedCpf && savedCpf.length === 11) {
      setCpf(savedCpf);
      void runSearch(savedCpf);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id]);

  if (loadTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-12 h-12 rounded-full border-4 border-stone-300 border-t-stone-700 animate-spin" />
      </div>
    );
  }
  if (tenantErr || !tenant) {
    return <div className="min-h-screen flex items-center justify-center text-xl bg-stone-50">Salão não encontrado.</div>;
  }

  const primaryColor = tenant.primaryColor || "#7D2535";
  const secondaryColor = tenant.secondaryColor || "#FAF7F5";
  const publicThemeVars = buildPublicTheme(primaryColor, secondaryColor);

  const handleSearch = async () => {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) {
      toast({ title: "CPF inválido", description: "Informe os 11 dígitos.", variant: "destructive" });
      return;
    }
    await runSearch(digits);
  };

  const runSearch = async (digits: string) => {
    setLoading(true);
    try {
      const [pendingRes, historyRes] = await Promise.all([
        fetch(`${BASE}/api/clients/pending-payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId: tenant.id, cpf: digits }),
        }),
        fetch(`${BASE}/api/clients/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId: tenant.id, cpf: digits }),
        }),
      ]);

      if (!pendingRes.ok || !historyRes.ok) throw new Error("Falha na busca");

      const pendingData: Appt[] = await pendingRes.json();
      const historyData: Appt[] = await historyRes.json();

      setResults(pendingData);

      const activeIds = new Set(pendingData.map((a) => a.id));
      const pastAppts = historyData.filter(
        (a) => !activeIds.has(a.id) && !isActiveAppt(a)
      );
      setHistory(pastAppts);
      setSearched(true);
      sessionStorage.setItem("trancify_pagar_cpf", digits);
    } catch {
      toast({ title: "Erro na busca", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (appt: PendingAppt, type: "deposit" | "full") => {
    if (appt.paymentMethod === "cash") {
      toast({
        title: "Pagamento no salão",
        description: "Você escolheu pagar em dinheiro. O pagamento é feito presencialmente no atendimento.",
      });
      return;
    }

    setPaying(appt.id);
    try {
      const digits = cpf.replace(/\D/g, "");

      // InfinitePay only for Pix/card when the salon has InfiniteTag configured.
      const linkRes = await fetch(`${BASE}/api/payments/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: appt.id, cpf: digits, paymentType: type }),
      });
      if (linkRes.ok) {
        const linkData = await linkRes.json();
        if (linkData.reason === "cash_not_supported") {
          toast({
            title: "Pagamento no salão",
            description: "Dinheiro não usa InfinitePay. Pague presencialmente no atendimento.",
          });
          return;
        }
        if (!linkData.simulated && linkData.checkoutUrl) {
          sessionStorage.setItem("trancify_pagar_cpf", digits);
          window.location.href = linkData.checkoutUrl;
          return;
        }
      } else if (linkRes.status === 409) {
        const err = await linkRes.json().catch(() => ({ message: "Erro" }));
        throw new Error(err.message || "Agendamento não pode mais ser pago");
      } else if (linkRes.status !== 404) {
        const err = await linkRes.json().catch(() => ({ message: "" }));
        if (err?.error === "GatewayError") throw new Error(err.message);
      }

      // Fallback: simulated payment (salon without InfiniteTag)
      const res = await fetch(`${BASE}/api/clients/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: appt.id, cpf: digits, paymentType: type }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Erro" }));
        throw new Error(err.message || "Erro no pagamento");
      }
      toast({
        title: "Pagamento confirmado!",
        description: type === "full" ? "Você pagou o valor inteiro." : "Sinal pago — horário garantido.",
      });
      await handleSearch();
    } catch (err: any) {
      toast({ title: "Erro no pagamento", description: err?.message ?? "Tente novamente", variant: "destructive" });
    } finally {
      setPaying(null);
    }
  };

  const hasActive = results.length > 0;
  const hasPast = history.length > 0;
  const nothingFound = searched && !hasActive && !hasPast;

  return (
    <div className="min-h-screen bg-background text-foreground" style={publicThemeVars}>
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 h-20 flex items-center gap-4">
          <Link href={`/${slug}`} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} className="w-12 h-12 rounded-full object-cover border-2 border-border" alt="Logo" />
          ) : (
            <div
              className="w-12 h-12 rounded-full text-primary-foreground flex items-center justify-center font-bold text-xl shrink-0"
              style={{ background: primaryColor }}
            >
              {tenant.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold leading-tight">{tenant.name}</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Meu Agendamento</p>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-24 space-y-6">
        {/* Payment return banner (redirect back from InfinitePay) */}
        {paymentReturn && (
          <div
            className={`rounded-3xl border shadow-sm p-5 flex items-start gap-3 ${
              paymentReturn.ok
                ? "bg-emerald-50 border-emerald-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            {paymentReturn.ok ? (
              <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-bold ${paymentReturn.ok ? "text-emerald-800" : "text-red-800"}`}>
                {paymentReturn.ok ? "Pagamento confirmado!" : "Pagamento não confirmado"}
              </p>
              <p className={`text-sm mt-0.5 ${paymentReturn.ok ? "text-emerald-700" : "text-red-700"}`}>
                {paymentReturn.ok
                  ? "Seu pagamento foi processado e o horário está garantido."
                  : "O pagamento não foi concluído. Você pode tentar novamente abaixo."}
              </p>
              {paymentReturn.ok && paymentReturn.receiptUrl && (
                <a
                  href={paymentReturn.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-2 text-sm font-bold text-emerald-700 underline"
                >
                  Ver comprovante
                </a>
              )}
            </div>
            <button
              onClick={() => setPaymentReturn(null)}
              className="text-sm font-bold opacity-60 hover:opacity-100 px-1"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        )}

        {/* CPF search */}
        <div className="bg-card rounded-3xl border border-border shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-1">Encontre seu agendamento</h2>
          <p className="text-muted-foreground text-sm mb-5">
            Digite seu CPF para ver os detalhes do seu agendamento e realizar pagamentos pendentes.
          </p>
          <div className="flex gap-2">
            <Input
              inputMode="numeric"
              value={cpf}
              onChange={(e) => setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="Digite seu CPF (11 dígitos)"
              className="text-lg h-12"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button
              onClick={handleSearch}
              disabled={loading || cpf.replace(/\D/g, "").length !== 11}
              className="h-12 px-5 text-primary-foreground hover:opacity-90 shrink-0"
              style={{ background: primaryColor }}
            >
              <Search className="w-4 h-4 mr-1" />
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </div>

        {/* Empty state */}
        {nothingFound && (
          <div className="bg-card rounded-3xl border border-border shadow-sm p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-1">Nenhum agendamento encontrado</h3>
            <p className="text-muted-foreground text-sm">
              Não encontramos agendamentos para este CPF neste salão.
              Se acha que isso é um erro, entre em contato com o salão.
            </p>
          </div>
        )}

        {/* Active appointment cards */}
        {hasActive && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold px-1">Agendamentos ativos</h2>
            {results.map((appt) => {
              const remaining = appt.servicePrice - appt.paidAmount;
              const dateLabel = format(parseISO(appt.date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
              const deadlineLabel = appt.depositDeadline
                ? format(parseISO(appt.depositDeadline), "dd/MM/yyyy", { locale: ptBR })
                : null;
              const isLatePay = !!deadlineLabel && new Date(appt.depositDeadline!) < new Date(new Date().toISOString().slice(0, 10));
              const statusConfig = STATUS_CONFIG[appt.status] ?? { label: appt.status, classes: "bg-stone-100 text-stone-600 border-stone-300" };
              const isPaid = appt.paymentStatus === "fully_paid";

              return (
                <div key={appt.id} className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                  <div className="h-1.5" style={{ background: primaryColor }} />

                  <div className="p-6 space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-xl leading-tight">{appt.serviceName}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{BRAID_LABEL[appt.braidSize] ?? appt.braidSize}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap shrink-0 ${statusConfig.classes}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-3 bg-secondary/40 rounded-2xl p-3">
                        <CalendarDays className="w-5 h-5 shrink-0" style={{ color: primaryColor }} />
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Data e Hora</p>
                          <p className="font-semibold text-sm capitalize">{dateLabel}</p>
                          <p className="font-bold text-base" style={{ color: primaryColor }}>às {appt.time}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-secondary/40 rounded-2xl p-3">
                        <User className="w-5 h-5 shrink-0" style={{ color: primaryColor }} />
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Cliente</p>
                          <p className="font-semibold text-sm">{appt.clientName}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {appt.bookingType === "pre_appointment" ? "Pré-agendamento" : "Agendamento"}
                            {" · "}
                            {PAYMENT_METHOD_LABEL[appt.paymentMethod] ?? appt.paymentMethod}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
                        <CreditCard className="w-4 h-4" style={{ color: primaryColor }} />
                        <span className="text-sm font-bold">Resumo do Pagamento</span>
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Valor do serviço</span>
                          <span className="font-bold">{formatCurrency(appt.servicePrice)}</span>
                        </div>
                        {appt.paidAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Já pago</span>
                            <span className="font-bold text-emerald-600">− {formatCurrency(appt.paidAmount)}</span>
                          </div>
                        )}
                        <div className="border-t border-border/60 pt-2 flex justify-between">
                          <span className="font-semibold text-sm">
                            {isPaid ? "Total pago" : "Valor pendente"}
                          </span>
                          <span className="font-bold text-base" style={{ color: isPaid ? undefined : primaryColor }}>
                            {isPaid ? formatCurrency(appt.servicePrice) : formatCurrency(remaining)}
                          </span>
                        </div>
                      </div>

                      {appt.bookingType === "pre_appointment" && deadlineLabel && !isPaid && (
                        <div className={`px-4 py-2 flex items-center gap-2 text-xs font-medium border-t border-border/60 ${isLatePay ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          {isLatePay
                            ? `Prazo do sinal expirou em ${deadlineLabel}`
                            : `Pague o sinal até ${deadlineLabel} para garantir seu horário`}
                        </div>
                      )}
                    </div>

                    {isPaid ? (
                      <div
                        className="rounded-2xl p-4 flex items-center justify-center gap-2 font-bold text-sm"
                        style={{ background: hexToRgba(primaryColor, 0.1), color: primaryColor }}
                      >
                        <CheckCircle className="w-5 h-5" />
                        Pagamento inteiro realizado
                      </div>
                    ) : appt.paymentMethod === "cash" ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-1">
                        <p className="font-bold text-sm text-amber-900">Pagamento em dinheiro no salão</p>
                        <p className="text-xs text-amber-800">
                          Você escolheu pagar em dinheiro. O InfinitePay (Pix/cartão online) não se aplica —
                          leve o valor no dia do atendimento.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {appt.paymentStatus === "unpaid" && (
                          <Button
                            onClick={() => handlePay(appt, "deposit")}
                            disabled={paying === appt.id}
                            variant="outline"
                            className="h-14 border-2 rounded-2xl text-base font-bold bg-transparent hover:bg-transparent hover:opacity-80"
                            style={{ borderColor: primaryColor, color: primaryColor }}
                          >
                            <Wallet className="w-4 h-4 mr-2" />
                            SINAL {formatCurrency(appt.depositAmount)}
                          </Button>
                        )}
                        <Button
                          onClick={() => handlePay(appt, "full")}
                          disabled={paying === appt.id}
                          className="h-14 rounded-2xl text-base font-bold text-primary-foreground hover:opacity-90"
                          style={{ background: primaryColor }}
                        >
                          {appt.paymentStatus === "deposit_paid" ? "PAGAR RESTANTE " : "PAGAR INTEIRA "}
                          {formatCurrency(remaining > 0 ? remaining : appt.servicePrice)}
                        </Button>
                      </div>
                    )}

                    {!isPaid && appt.paymentMethod !== "cash" && (
                      <p className="text-[11px] text-muted-foreground text-center">
                        Pagamento online via Pix ou cartão (InfinitePay). Sem InfiniteTag configurada, o pagamento fica em modo simulado.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* History section */}
        {hasPast && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <History className="w-5 h-5" style={{ color: primaryColor }} />
              <h2 className="text-lg font-bold">Histórico</h2>
            </div>
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden divide-y divide-border">
              {history.map((appt) => {
                const dateLabel = format(parseISO(appt.date), "dd/MM/yyyy", { locale: ptBR });
                const statusConfig = STATUS_CONFIG[appt.status] ?? { label: appt.status, classes: "bg-stone-100 text-stone-600 border-stone-300" };
                const isPaid = appt.paymentStatus === "fully_paid";

                return (
                  <div key={appt.id} className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{appt.serviceName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {dateLabel} às {appt.time} · {BRAID_LABEL[appt.braidSize] ?? appt.braidSize}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusConfig.classes}`}>
                        {statusConfig.label}
                      </span>
                      {isPaid && (
                        <span className="text-xs font-semibold text-emerald-600">
                          {formatCurrency(appt.servicePrice)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
