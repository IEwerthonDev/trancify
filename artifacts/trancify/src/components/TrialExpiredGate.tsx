import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, ArrowRight, CheckCircle, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const PLAN_FEATURES = [
  "Agenda de agendamentos ilimitados",
  "Página pública de agendamento personalizada",
  "Notificações via WhatsApp",
  "Relatórios de faturamento mensais",
  "Gestão de serviços e preços",
  "Suporte por e-mail",
];

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

export function TrialExpiredGate() {
  const { logout } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");
  const [activated, setActivated] = useState(false);

  const activateMutation = useMutation({
    mutationFn: () => activateSubscription(selectedPlan),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/tenants/subscription"] });
      qc.invalidateQueries({ queryKey: ["subscription"] });
      setActivated(true);
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/6 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-primary/4 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-card rounded-3xl border border-border/60 shadow-2xl shadow-black/10 overflow-hidden">
          <div className="bg-primary px-6 py-5 text-center">
            <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-display font-bold text-white mb-1">Período de teste encerrado</h2>
            <p className="text-white/80 text-sm">Sua semana grátis chegou ao fim</p>
          </div>

          <div className="p-6">
            {activated ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Assinatura ativada!</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Bem-vinda de volta. Todos os seus dados estão intactos.
                </p>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-white rounded-2xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Ir para o painel
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              <>
                <p className="text-muted-foreground text-sm text-center mb-5 leading-relaxed">
                  Escolha um plano para continuar gerenciando seu salão. Todos os seus dados estão seguros.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <button
                    onClick={() => setSelectedPlan("monthly")}
                    className={`rounded-2xl border-2 p-4 text-left transition-all ${
                      selectedPlan === "monthly"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mensal</p>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedPlan === "monthly" ? "border-primary" : "border-muted-foreground/30"}`}>
                        {selectedPlan === "monthly" && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-xl font-bold text-foreground">R$&nbsp;50</span>
                      <span className="text-xs text-muted-foreground">/mês</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedPlan("annual")}
                    className={`rounded-2xl border-2 p-4 text-left transition-all relative ${
                      selectedPlan === "annual"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                        MELHOR VALOR
                      </span>
                    </div>
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Anual</p>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedPlan === "annual" ? "border-primary" : "border-muted-foreground/30"}`}>
                        {selectedPlan === "annual" && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-xl font-bold text-foreground">R$&nbsp;40</span>
                      <span className="text-xs text-muted-foreground">/mês</span>
                    </div>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Economize R$&nbsp;120/ano</p>
                  </button>
                </div>

                <ul className="space-y-1.5 mb-5">
                  {PLAN_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                      <div className="w-3.5 h-3.5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>

                {activateMutation.isError && (
                  <p className="text-xs text-red-500 text-center mb-3">
                    Erro ao ativar. Tente novamente ou entre em contato.
                  </p>
                )}

                <button
                  onClick={() => activateMutation.mutate()}
                  disabled={activateMutation.isPending}
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-white rounded-2xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 group mb-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {activateMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Ativando…
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      Ativar plano {selectedPlan === "annual" ? "anual" : "mensal"}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <button
                  onClick={() => { logout(); navigate("/"); }}
                  className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sair da conta
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Dúvidas?{" "}
          <a href="mailto:contato@trancify.com.br" className="text-primary hover:underline">
            contato@trancify.com.br
          </a>
        </p>
      </motion.div>
    </div>
  );
}
