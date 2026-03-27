import { motion } from "framer-motion";
import { Lock, Sparkles, ArrowRight, Mail, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

const PLAN_FEATURES = [
  "Agenda de agendamentos ilimitados",
  "Página pública de agendamento personalizada",
  "Notificações via WhatsApp",
  "Relatórios de faturamento mensais",
  "Gestão de serviços e preços",
  "Suporte por e-mail",
];

export function TrialExpiredGate() {
  const { logout } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/6 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-primary/4 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-card rounded-3xl border border-border/60 shadow-2xl shadow-black/10 overflow-hidden">
          {/* Header */}
          <div className="bg-primary px-6 py-5 text-center">
            <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-display font-bold text-white mb-1">Período de teste encerrado</h2>
            <p className="text-white/80 text-sm">Sua semana grátis chegou ao fim</p>
          </div>

          <div className="p-6">
            <p className="text-muted-foreground text-sm text-center mb-6 leading-relaxed">
              Para continuar gerenciando seu salão com o Trancify, ative sua assinatura. Todos os seus dados estão seguros e prontos para quando você voltar.
            </p>

            {/* Pricing highlight */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6">
              <div className="flex items-end gap-1 justify-center mb-1">
                <span className="text-3xl font-display font-black text-foreground">R$&nbsp;50</span>
                <span className="text-muted-foreground text-sm mb-1">/mês</span>
              </div>
              <p className="text-center text-xs text-muted-foreground">Um único plano. Tudo incluso.</p>
            </div>

            {/* Features list */}
            <ul className="space-y-2 mb-6">
              {PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                  <div className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <a
              href="mailto:contato@trancify.com.br?subject=Ativar assinatura Trancify"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-white rounded-2xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 group mb-3"
            >
              <Mail className="w-4 h-4" />
              Entrar em contato para ativar
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>

            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sair da conta
            </button>
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
