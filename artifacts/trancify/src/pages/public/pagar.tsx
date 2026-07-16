import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useGetPublicTenant } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import {
  Search, CheckCircle, Clock, AlertTriangle, Wallet, ArrowLeft,
  CalendarDays, Scissors, User, CreditCard,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { buildPublicTheme, hexToRgba } from "@/lib/public-theme";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type PendingAppt = {
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
  bookingType: "appointment" | "pre_appointment";
  depositDeadline: string | null;
};

const BRAID_LABEL: Record<string, string> = {
  mid_back: "Até o meio das costas",
  waist_butt: "Até a cintura / Bumbum",
};

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  pending: { label: "Pendente", classes: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  confirmed: { label: "Confirmado ✓", classes: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  completed: { label: "Concluído", classes: "bg-blue-100 text-blue-800 border-blue-300" },
  cancelled: { label: "Cancelado", classes: "bg-red-100 text-red-800 border-red-300" },
  expired: { label: "Expirado", classes: "bg-stone-100 text-stone-600 border-stone-300" },
};

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
  const [paying, setPaying] = useState<string | null>(null);

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
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/clients/pending-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.id, cpf: digits }),
      });
      if (!res.ok) throw new Error("Falha na busca");
      const data: PendingAppt[] = await res.json();
      setResults(data);
      setSearched(true);
    } catch {
      toast({ title: "Erro na busca", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (appt: PendingAppt, type: "deposit" | "full") => {
    setPaying(appt.id);
    try {
      const digits = cpf.replace(/\D/g, "");
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
        {searched && results.length === 0 && (
          <div className="bg-card rounded-3xl border border-border shadow-sm p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-1">Nenhum agendamento ativo</h3>
            <p className="text-muted-foreground text-sm">
              Não encontramos agendamentos ativos para este CPF neste salão.
              Se acha que isso é um erro, entre em contato com o salão.
            </p>
          </div>
        )}

        {/* Appointment cards */}
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
              {/* Colored top bar */}
              <div className="h-1.5" style={{ background: primaryColor }} />

              <div className="p-6 space-y-5">
                {/* Service + status */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-xl leading-tight">{appt.serviceName}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{BRAID_LABEL[appt.braidSize] ?? appt.braidSize}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap shrink-0 ${statusConfig.classes}`}>
                    {statusConfig.label}
                  </span>
                </div>

                {/* Info grid */}
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
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment summary */}
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

                  {/* Deadline warning for pre-appointments */}
                  {appt.bookingType === "pre_appointment" && deadlineLabel && !isPaid && (
                    <div className={`px-4 py-2 flex items-center gap-2 text-xs font-medium border-t border-border/60 ${isLatePay ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      {isLatePay
                        ? `Prazo do sinal expirou em ${deadlineLabel}`
                        : `Pague o sinal até ${deadlineLabel} para garantir seu horário`}
                    </div>
                  )}
                </div>

                {/* Payment actions */}
                {isPaid ? (
                  <div
                    className="rounded-2xl p-4 flex items-center justify-center gap-2 font-bold text-sm"
                    style={{ background: hexToRgba(primaryColor, 0.1), color: primaryColor }}
                  >
                    <CheckCircle className="w-5 h-5" />
                    Pagamento inteiro realizado
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

                <p className="text-[11px] text-muted-foreground text-center">
                  Pagamento simulado para teste — em produção o gateway (Pix/Cartão) abrirá aqui.
                </p>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
