import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetMyTenant } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle, Sparkles, Clock, AlertTriangle,
  Calendar, Zap, Shield, XCircle, ChevronRight, Star, PauseCircle,
} from "lucide-react";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type SubStatus = "trial" | "active" | "cancelled" | "expired" | "paused";

async function fetchSubscription() {
  const token = localStorage.getItem("trancify_token");
  const res = await fetch(`${BASE}/api/tenants/subscription`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Erro ao buscar assinatura");
  return res.json() as Promise<{
    subscriptionStatus: SubStatus;
    subscriptionPlan: "monthly" | "annual" | null;
    trialEndsAt: string;
    subscriptionStartedAt: string | null;
    subscriptionEndsAt: string | null;
  }>;
}

async function activateSubscription(plan: "monthly" | "annual") {
  const token = localStorage.getItem("trancify_token");
  const res = await fetch(`${BASE}/api/tenants/subscription/activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error("Erro ao ativar assinatura");
  return res.json();
}

async function cancelSubscription(feedback?: string) {
  const token = localStorage.getItem("trancify_token");
  const res = await fetch(`${BASE}/api/tenants/subscription/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ feedback }),
  });
  if (!res.ok) throw new Error("Erro ao cancelar assinatura");
  return res.json();
}

async function pauseSubscription(feedback?: string) {
  const token = localStorage.getItem("trancify_token");
  const res = await fetch(`${BASE}/api/tenants/subscription/pause`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ feedback }),
  });
  if (!res.ok) throw new Error("Erro ao pausar assinatura");
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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState("");
  const [pauseFeedback, setPauseFeedback] = useState("");

  const activateMutation = useMutation({
    mutationFn: activateSubscription,
    onSuccess: () => {
      toast({ title: "Assinatura ativada com sucesso!" });
      qc.invalidateQueries({ queryKey: ["subscription"] });
    },
    onError: () => {
      toast({ title: "Erro ao ativar assinatura", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (feedback: string) => cancelSubscription(feedback || undefined),
    onSuccess: () => {
      toast({ title: "Assinatura cancelada" });
      qc.invalidateQueries({ queryKey: ["subscription"] });
      setShowCancelModal(false);
      setCancelFeedback("");
    },
    onError: () => {
      toast({ title: "Erro ao cancelar", variant: "destructive" });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (feedback: string) => pauseSubscription(feedback || undefined),
    onSuccess: () => {
      toast({ title: "Assinatura pausada" });
      qc.invalidateQueries({ queryKey: ["subscription"] });
      setShowPauseModal(false);
      setPauseFeedback("");
    },
    onError: () => {
      toast({ title: "Erro ao pausar", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {[1, 2].map(i => <div key={i} className="h-48 bg-card rounded-3xl border border-border/50 animate-pulse" />)}
        </div>
      </DashboardLayout>
    );
  }

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const status = sub?.subscriptionStatus ?? "trial";
  const plan = sub?.subscriptionPlan;
  const trialEndsAt = sub?.trialEndsAt ? parseISO(sub.trialEndsAt) : null;
  const subEndsAt = sub?.subscriptionEndsAt ? parseISO(sub.subscriptionEndsAt) : null;
  const trialMsLeft = trialEndsAt ? Math.max(0, trialEndsAt.getTime() - now.getTime()) : 0;
  const trialDaysLeft = Math.floor(trialMsLeft / (1000 * 60 * 60 * 24));
  const trialHoursLeft = Math.floor((trialMsLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const cancelledWithAccess = status === "cancelled" && subEndsAt !== null && subEndsAt > now;

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
          <StatusBanner status={status} plan={plan} trialDaysLeft={trialDaysLeft} trialHoursLeft={trialHoursLeft} trialEndsAt={trialEndsAt} subEndsAt={subEndsAt} />

          {/* Plan selection + activate CTA — shown when not active/paused */}
          {(status === "trial" || status === "expired" || (status === "cancelled" && !cancelledWithAccess)) && (
            <div className="bg-card p-8 rounded-[2rem] border border-border/50 shadow-xl shadow-black/5">
              <h2 className="text-2xl font-display font-bold mb-2">Escolha seu plano</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Acesso completo a todos os recursos. Cancele quando quiser.
              </p>

              <PlanSelector selected={selectedPlan} onChange={setSelectedPlan} />

              <Button
                size="lg"
                className="w-full h-14 text-lg rounded-xl mt-6"
                onClick={() => activateMutation.mutate(selectedPlan)}
                disabled={activateMutation.isPending}
              >
                {activateMutation.isPending ? (
                  "Ativando…"
                ) : selectedPlan === "annual" ? (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Ativar plano Anual — R$ 480,00/ano
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Ativar plano Mensal — R$ 50,00/mês
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Cancelled but still has access — show Ativar Assinatura */}
          {cancelledWithAccess && (
            <div className="bg-card p-8 rounded-[2rem] border border-border/50 shadow-xl shadow-black/5">
              <h2 className="text-2xl font-display font-bold mb-2">Ativar Assinatura</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Você ainda tem acesso até{" "}
                <strong className="text-foreground">{subEndsAt && format(subEndsAt, "dd/MM/yyyy")}</strong>.
                Reative agora para não perder o acesso.
              </p>

              <PlanSelector selected={selectedPlan} onChange={setSelectedPlan} />

              <Button
                size="lg"
                className="w-full h-14 text-lg rounded-xl mt-6"
                onClick={() => activateMutation.mutate(selectedPlan)}
                disabled={activateMutation.isPending}
              >
                {activateMutation.isPending ? "Ativando…" : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Ativar Assinatura
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Paused — show reactivate option */}
          {status === "paused" && (
            <div className="bg-card p-8 rounded-[2rem] border border-border/50 shadow-xl shadow-black/5">
              <h2 className="text-2xl font-display font-bold mb-2">Ativar Assinatura</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Sua assinatura está pausada. Reative para recuperar o acesso completo.
              </p>

              <PlanSelector selected={selectedPlan} onChange={setSelectedPlan} />

              <Button
                size="lg"
                className="w-full h-14 text-lg rounded-xl mt-6"
                onClick={() => activateMutation.mutate(selectedPlan)}
                disabled={activateMutation.isPending}
              >
                {activateMutation.isPending ? "Ativando…" : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Reativar Assinatura
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Active subscription — Pausar + Cancelar */}
          {status === "active" && (
            <div className="bg-card p-8 rounded-[2rem] border border-border/50 shadow-xl shadow-black/5">
              <h2 className="text-2xl font-display font-bold mb-2">Gerenciar assinatura</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Você pode pausar ou cancelar a qualquer momento. Continuará tendo acesso até o fim do período pago
                {subEndsAt && ` (${format(subEndsAt, "dd/MM/yyyy")})`}.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-amber-400/60 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl h-11"
                  onClick={() => setShowPauseModal(true)}
                >
                  <PauseCircle className="w-4 h-4 mr-2" />
                  Pausar assinatura
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/5 rounded-xl h-11"
                  onClick={() => setShowCancelModal(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar assinatura
                </Button>
              </div>

              {/* Pause Modal */}
              {showPauseModal && (
                <div className="mt-5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <PauseCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-foreground">Pausar assinatura?</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Seu acesso ficará suspenso até você reativar. Nenhuma cobrança adicional será feita.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      Motivo (opcional)
                    </label>
                    <textarea
                      value={pauseFeedback}
                      onChange={(e) => setPauseFeedback(e.target.value)}
                      placeholder="Nos conte o que está acontecendo…"
                      rows={3}
                      maxLength={1000}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setShowPauseModal(false); setPauseFeedback(""); }}>
                      Voltar
                    </Button>
                    <Button
                      className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={() => pauseMutation.mutate(pauseFeedback)}
                      disabled={pauseMutation.isPending}
                    >
                      {pauseMutation.isPending ? "Pausando…" : "Confirmar pausa"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Cancel Modal */}
              {showCancelModal && (
                <div className="mt-5 bg-destructive/5 border border-destructive/20 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-foreground">Cancelar assinatura?</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Ao cancelar, você perderá o acesso ao dashboard ao fim do período vigente. Seus dados ficam salvos por 30 dias.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      Motivo (opcional)
                    </label>
                    <textarea
                      value={cancelFeedback}
                      onChange={(e) => setCancelFeedback(e.target.value)}
                      placeholder="Seu feedback nos ajuda a melhorar…"
                      rows={3}
                      maxLength={1000}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setShowCancelModal(false); setCancelFeedback(""); }}>
                      Manter assinatura
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 rounded-xl"
                      onClick={() => cancelMutation.mutate(cancelFeedback)}
                      disabled={cancelMutation.isPending}
                    >
                      {cancelMutation.isPending ? "Cancelando…" : "Confirmar cancelamento"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
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
                  <span className="font-semibold">R$ 480,00/ano</span>
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
              {subEndsAt && (status === "active" || cancelledWithAccess) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{status === "active" ? "Próx. cobrança" : "Acesso até"}</span>
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

function PlanSelector({
  selected,
  onChange,
}: {
  selected: "monthly" | "annual";
  onChange: (v: "monthly" | "annual") => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <button
        onClick={() => onChange("monthly")}
        className={`p-6 rounded-2xl border-2 text-left transition-all ${
          selected === "monthly"
            ? "border-primary bg-primary/5 ring-4 ring-primary/10"
            : "border-border bg-secondary/30 hover:border-primary/50"
        }`}
      >
        <div className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Mensal</div>
        <div className="text-3xl font-bold text-foreground">
          R$ 50<span className="text-lg font-semibold text-muted-foreground">/mês</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Cobrado mensalmente.</p>
        {selected === "monthly" && (
          <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary">
            <CheckCircle className="w-3.5 h-3.5" /> Selecionado
          </div>
        )}
      </button>

      <button
        onClick={() => onChange("annual")}
        className={`p-6 rounded-2xl border-2 text-left transition-all relative ${
          selected === "annual"
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
        <p className="text-xs text-emerald-600 font-semibold mt-1">Economize R$ 120/ano</p>
        {selected === "annual" && (
          <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary">
            <CheckCircle className="w-3.5 h-3.5" /> Selecionado
          </div>
        )}
      </button>
    </div>
  );
}

function StatusBanner({
  status,
  plan,
  trialDaysLeft,
  trialHoursLeft,
  trialEndsAt,
  subEndsAt,
}: {
  status: SubStatus;
  plan: string | null;
  trialDaysLeft: number;
  trialHoursLeft: number;
  trialEndsAt: Date | null;
  subEndsAt: Date | null;
}) {
  if (status === "trial") {
    const urgent = trialDaysLeft <= 2;
    const countdownLabel = trialDaysLeft > 0
      ? `${trialDaysLeft} dia${trialDaysLeft !== 1 ? "s" : ""} e ${trialHoursLeft}h`
      : trialHoursLeft > 0
        ? `${trialHoursLeft} hora${trialHoursLeft !== 1 ? "s" : ""}`
        : "menos de 1 hora";
    return (
      <div className={`rounded-[2rem] p-6 flex items-start gap-5 border ${urgent ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"}`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${urgent ? "bg-amber-100 dark:bg-amber-900/50" : "bg-blue-100 dark:bg-blue-900/50"}`}>
          <Clock className={`w-6 h-6 ${urgent ? "text-amber-600" : "text-blue-600"}`} />
        </div>
        <div>
          <p className={`font-bold text-lg ${urgent ? "text-amber-800 dark:text-amber-200" : "text-blue-800 dark:text-blue-200"}`}>
            {urgent ? `⚠️ Teste expira em ${countdownLabel}!` : `Período de teste — ${countdownLabel} restante${trialDaysLeft !== 1 ? "s" : ""}`}
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

  if (status === "paused") {
    return (
      <div className="rounded-[2rem] p-6 flex items-start gap-5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
          <PauseCircle className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <p className="font-bold text-lg text-amber-800 dark:text-amber-200">Assinatura pausada</p>
          <p className="text-sm mt-1 text-amber-700 dark:text-amber-300">
            Seu acesso está suspenso. Reative abaixo para voltar a usar o Trancify.
          </p>
        </div>
      </div>
    );
  }

  if (status === "cancelled") {
    const now = new Date();
    const hasAccess = subEndsAt !== null && subEndsAt > now;
    return (
      <div className={`rounded-[2rem] p-6 flex items-start gap-5 border ${hasAccess ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" : "bg-secondary/50 border-border"}`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${hasAccess ? "bg-amber-100 dark:bg-amber-900/50" : "bg-secondary"}`}>
          <XCircle className={`w-6 h-6 ${hasAccess ? "text-amber-600" : "text-muted-foreground"}`} />
        </div>
        <div>
          <p className={`font-bold text-lg ${hasAccess ? "text-amber-800 dark:text-amber-200" : "text-foreground"}`}>
            Assinatura cancelada
          </p>
          <p className={`text-sm mt-1 ${hasAccess ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>
            {hasAccess && subEndsAt
              ? `Você ainda tem acesso até ${format(subEndsAt, "dd/MM/yyyy")}. Reative abaixo para continuar.`
              : "Assine novamente para continuar usando o Trancify."}
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

function StatusChip({ status }: { status: SubStatus }) {
  const map: Record<SubStatus, { label: string; cls: string }> = {
    trial:     { label: "Teste",     cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
    active:    { label: "Ativa",     cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
    cancelled: { label: "Cancelada", cls: "bg-secondary text-muted-foreground" },
    expired:   { label: "Expirada",  cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
    paused:    { label: "Pausada",   cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "" };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${cls}`}>{label}</span>;
}
