import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetMyTenant } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import {
  CreditCard, CheckCircle, Sparkles, Clock, AlertTriangle,
  Calendar, Zap, Shield, XCircle, ChevronRight, Star,
} from "lucide-react";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchSubscription() {
  const res = await fetch(`${BASE}/api/tenants/subscription`, { credentials: "include" });
  if (!res.ok) throw new Error("Erro ao buscar assinatura");
  return res.json() as Promise<{
    subscriptionStatus: "trial" | "active" | "cancelled" | "expired";
    subscriptionPlan: "monthly" | "annual" | null;
    trialEndsAt: string;
    subscriptionStartedAt: string | null;
    subscriptionEndsAt: string | null;
  }>;
}

async function activateSubscription(plan: "monthly" | "annual") {
  const res = await fetch(`${BASE}/api/tenants/subscription/activate`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error("Erro ao ativar assinatura");
  return res.json();
}

async function cancelSubscription() {
  const res = await fetch(`${BASE}/api/tenants/subscription/cancel`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Erro ao cancelar assinatura");
  return res.json();
}

const FEATURES = [
  "Página pública de agendamento",
  "Gestão completa de agendamentos",
  "Agenda visual por dia",
  "Controle de serviços e preços",
  "Relatórios e faturamento",
  "Fotos de referência do cliente",
  "Notificações via WhatsApp",
  "Suporte prioritário",
];

export default function AssinaturaPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: tenant } = useGetMyTenant();

  const { data: sub, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: fetchSubscription,
  });

  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");
  const [cardData, setCardData] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [showCard, setShowCard] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const activateMutation = useMutation({
    mutationFn: activateSubscription,
    onSuccess: () => {
      toast({ title: "Assinatura ativada com sucesso!" });
      qc.invalidateQueries({ queryKey: ["subscription"] });
      setShowCard(false);
    },
    onError: () => {
      toast({ title: "Erro ao ativar assinatura", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      toast({ title: "Assinatura cancelada" });
      qc.invalidateQueries({ queryKey: ["subscription"] });
      setShowCancelConfirm(false);
    },
    onError: () => {
      toast({ title: "Erro ao cancelar", variant: "destructive" });
    },
  });

  const handleActivate = () => {
    if (!cardData.number || !cardData.name || !cardData.expiry || !cardData.cvv) {
      toast({ title: "Preencha todos os dados do cartão", variant: "destructive" });
      return;
    }
    activateMutation.mutate(selectedPlan);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {[1, 2].map(i => <div key={i} className="h-48 bg-card rounded-3xl border border-border/50 animate-pulse" />)}
        </div>
      </DashboardLayout>
    );
  }

  const status = sub?.subscriptionStatus ?? "trial";
  const plan = sub?.subscriptionPlan;
  const trialEndsAt = sub?.trialEndsAt ? parseISO(sub.trialEndsAt) : null;
  const subEndsAt = sub?.subscriptionEndsAt ? parseISO(sub.subscriptionEndsAt) : null;
  const now = new Date();
  const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-foreground">Minha Assinatura</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Gerencie sua assinatura do Trancify.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">

          {/* Current Status Banner */}
          <StatusBanner status={status} plan={plan} trialDaysLeft={trialDaysLeft} trialEndsAt={trialEndsAt} subEndsAt={subEndsAt} />

          {/* Show plan selection + card if not active */}
          {(status === "trial" || status === "expired" || status === "cancelled") && (
            <>
              {/* Plan Selection */}
              <div className="bg-card p-8 rounded-[2rem] border border-border/50 shadow-xl shadow-black/5">
                <h2 className="text-2xl font-display font-bold mb-2">Escolha seu plano</h2>
                <p className="text-muted-foreground mb-6 text-sm">
                  Acesso completo a todos os recursos. Cancele quando quiser.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {/* Monthly */}
                  <button
                    onClick={() => setSelectedPlan("monthly")}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${
                      selectedPlan === "monthly"
                        ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                        : "border-border bg-secondary/30 hover:border-primary/50"
                    }`}
                  >
                    <div className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Mensal</div>
                    <div className="text-3xl font-bold text-foreground">
                      R$ 50<span className="text-lg font-semibold text-muted-foreground">/mês</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Cobrado mensalmente. Cancele quando quiser.</p>
                    {selectedPlan === "monthly" && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary">
                        <CheckCircle className="w-3.5 h-3.5" /> Selecionado
                      </div>
                    )}
                  </button>

                  {/* Annual */}
                  <button
                    onClick={() => setSelectedPlan("annual")}
                    className={`p-6 rounded-2xl border-2 text-left transition-all relative ${
                      selectedPlan === "annual"
                        ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                        : "border-border bg-secondary/30 hover:border-primary/50"
                    }`}
                  >
                    <div className="absolute -top-3 right-4">
                      <span className="bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Star className="w-2.5 h-2.5" /> MELHOR VALOR
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Anual</div>
                    <div className="text-3xl font-bold text-foreground">
                      R$ 40<span className="text-lg font-semibold text-muted-foreground">/mês</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      R$ 480,00 cobrado em <strong className="text-foreground">12x no cartão</strong>
                    </p>
                    <p className="text-xs text-emerald-600 font-semibold mt-1">Economize R$ 120 por ano</p>
                    {selectedPlan === "annual" && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary">
                        <CheckCircle className="w-3.5 h-3.5" /> Selecionado
                      </div>
                    )}
                  </button>
                </div>

                {/* CTA to show card form */}
                {!showCard ? (
                  <Button
                    size="lg"
                    className="w-full h-14 text-lg rounded-xl"
                    onClick={() => setShowCard(true)}
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Cadastrar cartão e assinar
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                ) : (
                  <div className="border border-border/60 rounded-2xl p-6 bg-secondary/20 space-y-4">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      Dados do cartão de crédito
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-1 block">Número do cartão</label>
                        <Input
                          value={cardData.number}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                            const formatted = v.replace(/(.{4})/g, "$1 ").trim();
                            setCardData({ ...cardData, number: formatted });
                          }}
                          placeholder="0000 0000 0000 0000"
                          className="h-12 font-mono"
                          maxLength={19}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-1 block">Nome no cartão</label>
                        <Input
                          value={cardData.name}
                          onChange={(e) => setCardData({ ...cardData, name: e.target.value.toUpperCase() })}
                          placeholder="NOME COMO NO CARTÃO"
                          className="h-12"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-semibold text-foreground mb-1 block">Validade</label>
                          <Input
                            value={cardData.expiry}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                              const formatted = v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v;
                              setCardData({ ...cardData, expiry: formatted });
                            }}
                            placeholder="MM/AA"
                            className="h-12 font-mono"
                            maxLength={5}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-foreground mb-1 block">CVV</label>
                          <Input
                            value={cardData.cvv}
                            onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                            placeholder="000"
                            className="h-12 font-mono"
                            maxLength={4}
                            type="password"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 rounded-xl px-3 py-2">
                      <Shield className="w-3.5 h-3.5 shrink-0" />
                      Seus dados são criptografados e protegidos
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 h-12 rounded-xl"
                        onClick={() => setShowCard(false)}
                      >
                        Voltar
                      </Button>
                      <Button
                        className="flex-1 h-12 rounded-xl text-base font-bold"
                        onClick={handleActivate}
                        disabled={activateMutation.isPending}
                      >
                        {activateMutation.isPending
                          ? "Ativando..."
                          : selectedPlan === "annual"
                          ? "Assinar — 12x R$ 40,00"
                          : "Assinar — R$ 50,00/mês"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Active subscription — show cancel option */}
          {status === "active" && (
            <div className="bg-card p-8 rounded-[2rem] border border-border/50 shadow-xl shadow-black/5">
              <h2 className="text-2xl font-display font-bold mb-2">Cancelar assinatura</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Você pode cancelar a qualquer momento. Continuará tendo acesso até o fim do período pago
                {subEndsAt && ` (${format(subEndsAt, "dd/MM/yyyy")})`}.
              </p>

              {!showCancelConfirm ? (
                <Button
                  variant="outline"
                  className="border-destructive/50 text-destructive hover:bg-destructive/5 rounded-xl h-11 px-6"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar assinatura
                </Button>
              ) : (
                <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-foreground">Tem certeza?</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Ao cancelar, você perderá o acesso ao dashboard ao fim do período vigente. Seus dados ficam salvos por 30 dias.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowCancelConfirm(false)}>
                      Manter assinatura
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 rounded-xl"
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                    >
                      {cancelMutation.isPending ? "Cancelando..." : "Confirmar cancelamento"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar — features list */}
        <div className="space-y-6">
          <div className="bg-primary/5 border border-primary/20 rounded-[2rem] p-7">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-display font-bold text-xl text-primary">O que está incluído</h3>
            </div>
            <ul className="space-y-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-card border border-border/50 rounded-[2rem] p-7">
            <h3 className="font-display font-bold text-lg mb-3">Resumo do plano</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plano</span>
                <span className="font-semibold">
                  {status === "trial" ? "Teste gratuito" : plan === "annual" ? "Anual" : "Mensal"}
                </span>
              </div>
              {status === "active" && plan === "annual" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cobrança</span>
                  <span className="font-semibold">12x R$ 40,00</span>
                </div>
              )}
              {status === "active" && plan === "monthly" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cobrança</span>
                  <span className="font-semibold">R$ 50,00/mês</span>
                </div>
              )}
              {status === "trial" && trialEndsAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Teste até</span>
                  <span className="font-semibold">{format(trialEndsAt, "dd/MM/yyyy")}</span>
                </div>
              )}
              {subEndsAt && status === "active" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Próx. cobrança</span>
                  <span className="font-semibold">{format(subEndsAt, "dd/MM/yyyy")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusChip status={status} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatusBanner({
  status,
  plan,
  trialDaysLeft,
  trialEndsAt,
  subEndsAt,
}: {
  status: string;
  plan: string | null;
  trialDaysLeft: number;
  trialEndsAt: Date | null;
  subEndsAt: Date | null;
}) {
  if (status === "trial") {
    const urgent = trialDaysLeft <= 2;
    return (
      <div className={`rounded-[2rem] p-6 flex items-start gap-5 border ${urgent ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"}`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${urgent ? "bg-amber-100 dark:bg-amber-900/50" : "bg-blue-100 dark:bg-blue-900/50"}`}>
          <Clock className={`w-6 h-6 ${urgent ? "text-amber-600" : "text-blue-600"}`} />
        </div>
        <div>
          <p className={`font-bold text-lg ${urgent ? "text-amber-800 dark:text-amber-200" : "text-blue-800 dark:text-blue-200"}`}>
            {urgent ? `⚠️ Teste expira em ${trialDaysLeft} dia${trialDaysLeft !== 1 ? "s" : ""}!` : `Período de teste — ${trialDaysLeft} dia${trialDaysLeft !== 1 ? "s" : ""} restante${trialDaysLeft !== 1 ? "s" : ""}`}
          </p>
          <p className={`text-sm mt-1 ${urgent ? "text-amber-700 dark:text-amber-300" : "text-blue-700 dark:text-blue-300"}`}>
            {trialEndsAt && `Seu teste gratuito termina em ${format(trialEndsAt, "dd 'de' MMMM", { locale: ptBR })}. `}
            Escolha um plano abaixo para continuar usando o Trancify.
          </p>
        </div>
      </div>
    );
  }

  if (status === "active") {
    return (
      <div className="rounded-[2rem] p-6 flex items-start gap-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
          <CheckCircle className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <p className="font-bold text-lg text-emerald-800 dark:text-emerald-200">
            Assinatura ativa — plano {plan === "annual" ? "Anual" : "Mensal"}
          </p>
          <p className="text-sm mt-1 text-emerald-700 dark:text-emerald-300">
            {subEndsAt && `Próxima renovação: ${format(subEndsAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.`}
            {" "}Você tem acesso completo a todos os recursos.
          </p>
        </div>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="rounded-[2rem] p-6 flex items-start gap-5 bg-secondary/50 border border-border">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
          <XCircle className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-bold text-lg text-foreground">Assinatura cancelada</p>
          <p className="text-sm mt-1 text-muted-foreground">
            {subEndsAt && `Seu acesso continua até ${format(subEndsAt, "dd/MM/yyyy")}. `}
            Assine novamente para continuar usando o Trancify.
          </p>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="rounded-[2rem] p-6 flex items-start gap-5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <p className="font-bold text-lg text-red-800 dark:text-red-200">Acesso expirado</p>
          <p className="text-sm mt-1 text-red-700 dark:text-red-300">
            Seu período de teste expirou. Assine um plano para recuperar o acesso completo.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    trial:     { label: "Teste",     cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
    active:    { label: "Ativa",     cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
    cancelled: { label: "Cancelada", cls: "bg-secondary text-muted-foreground" },
    expired:   { label: "Expirada",  cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "" };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${cls}`}>{label}</span>;
}
