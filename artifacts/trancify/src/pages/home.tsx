import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Sparkles, Moon, Sun, Menu, X, Calendar, BarChart2, Bell,
  Smartphone, Shield, Zap, CheckCircle, Star, ArrowRight,
  Clock, Users, TrendingUp, Mail, Instagram, ChevronDown
} from "lucide-react";

const WINE = "#6D1F3A";

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return scrolled;
}

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const BENEFITS = [
  {
    icon: Calendar,
    title: "Agenda inteligente",
    desc: "Seus horários organizados automaticamente. Clientes agendam sozinhos, sem você precisar responder mensagem por mensagem.",
  },
  {
    icon: Bell,
    title: "Notificações via WhatsApp",
    desc: "Você recebe um aviso no WhatsApp a cada novo agendamento. Nada passa batido.",
  },
  {
    icon: BarChart2,
    title: "Relatórios de faturamento",
    desc: "Veja quanto você ganhou no mês, quais serviços vendem mais e o custo dos materiais.",
  },
  {
    icon: Smartphone,
    title: "Link de agendamento próprio",
    desc: "Sua página personalizada para clientes agendarem. Compartilhe no Instagram, WhatsApp, onde quiser.",
  },
  {
    icon: Shield,
    title: "Seus dados são seus",
    desc: "Tudo fica seguro na nuvem. Não se preocupe com planilhas perdidas ou anotações em papel.",
  },
  {
    icon: Zap,
    title: "Pronto em minutos",
    desc: "Sem treinamento complicado. Configure seu salão em menos de 5 minutos e já comece a receber agendamentos.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Crie sua conta",
    desc: "Entre em contato e sua conta estará ativa com 1 semana grátis para testar tudo.",
  },
  {
    n: "02",
    title: "Configure seu salão",
    desc: "Adicione seus serviços, preços e horários disponíveis. Leva menos de 5 minutos.",
  },
  {
    n: "03",
    title: "Compartilhe seu link",
    desc: "Mande seu link de agendamento para as clientes e veja sua agenda se organizar sozinha.",
  },
];

const PLAN_FEATURES = [
  "Agenda de agendamentos ilimitados",
  "Página pública de agendamento personalizada",
  "Notificações via WhatsApp",
  "Relatórios de faturamento mensais",
  "Gestão de serviços e preços",
  "Controle de disponibilidade e intervalos",
  "Suporte por e-mail",
  "1 semana grátis para experimentar",
];

export default function HomePage() {
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScrolled();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/95 backdrop-blur-md border-b border-border/60 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/30 group-hover:shadow-primary/50 transition-shadow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-display font-bold text-foreground tracking-tight">
                Trancify
              </span>
            </button>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <button
                onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Como funciona
              </button>
              <button
                onClick={() => document.getElementById("vantagens")?.scrollIntoView({ behavior: "smooth" })}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Vantagens
              </button>
              <button
                onClick={() => document.getElementById("preco")?.scrollIntoView({ behavior: "smooth" })}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Preço
              </button>
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                aria-label="Alternar tema"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => navigate("/login")}
                className="px-5 py-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-all"
              >
                Entrar
              </button>
              <button
                onClick={() => document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" })}
                className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 hover:shadow-primary/40"
              >
                Venha gerenciar seu salão ✨
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={toggleTheme}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-muted/60 text-muted-foreground"
                aria-label="Alternar tema"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-muted/60 text-muted-foreground"
                aria-label="Menu"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-md border-t border-border/60 px-4 pb-5 pt-3 space-y-2"
          >
            {["como-funciona", "vantagens", "preco"].map((id) => (
              <button
                key={id}
                onClick={() => {
                  setMenuOpen(false);
                  setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 100);
                }}
                className="block w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all capitalize"
              >
                {id === "como-funciona" ? "Como funciona" : id === "vantagens" ? "Vantagens" : "Preço"}
              </button>
            ))}
            <div className="pt-2 space-y-2">
              <button
                onClick={() => { setMenuOpen(false); navigate("/login"); }}
                className="block w-full px-4 py-3 rounded-xl border border-border text-sm font-semibold text-center hover:bg-muted transition-all"
              >
                Entrar
              </button>
              <button
                onClick={() => { setMenuOpen(false); setTimeout(() => document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" }), 100); }}
                className="block w-full px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold text-center hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
              >
                Trancista, venha gerenciar seu salão ✨
              </button>
            </div>
          </motion.div>
        )}
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Decorative blobs */}
        <div className="absolute top-1/4 left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl pointer-events-none dark:bg-primary/5" />
        <div className="absolute bottom-1/4 right-[-10%] w-[400px] h-[400px] rounded-full bg-primary/6 blur-3xl pointer-events-none dark:bg-primary/4" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/4 blur-3xl pointer-events-none dark:bg-primary/3" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary rounded-full px-4 py-1.5 text-sm font-semibold mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              Feito para trancistas brasileiras
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-bold text-foreground leading-[1.05] tracking-tight mb-6">
              Sua agenda de<br />
              <span className="text-primary">tranças</span>,{" "}
              do jeito{" "}
              <span className="relative inline-block">
                certo
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none">
                  <path d="M2 6 Q100 2 198 6" stroke={WINE} strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
              .
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              O Trancify é a plataforma de gestão e agendamento feita especialmente para salões de tranças. Organize seus horários, acompanhe seu faturamento e atenda suas clientes com muito mais profissionalismo.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" })}
                className="group w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl text-base font-semibold hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5"
              >
                Comece grátis por 7 dias
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-transparent border border-border rounded-2xl text-base font-semibold text-foreground hover:bg-muted transition-all"
              >
                Ver como funciona
              </button>
            </div>

            {/* Social proof */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <span>Trancistas satisfeitas</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>7 dias grátis · cobrança só depois</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span>Cancele quando quiser</span>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Scroll indicator — anchored to the section, not the content div */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden sm:block"
        >
          <button
            onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })}
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <span className="text-xs font-medium">Saiba mais</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </button>
        </motion.div>
      </section>

      {/* ── COMO FUNCIONA ────────────────────────────────────────────────── */}
      <section id="como-funciona" className="py-24 sm:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center mb-16">
            <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">Simples assim</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Como funciona o Trancify
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Em três passos você já está recebendo agendamentos.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <AnimatedSection key={step.n}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.6 }}
                  className="relative bg-card rounded-3xl p-8 border border-border/60 hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5 group"
                >
                  <div className="text-6xl font-display font-black text-primary/10 dark:text-primary/15 mb-4 group-hover:text-primary/20 transition-colors">
                    {step.n}
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── VANTAGENS ────────────────────────────────────────────────────── */}
      <section id="vantagens" className="py-24 sm:py-32 bg-muted/30 dark:bg-muted/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center mb-16">
            <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">Por que usar</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Tudo que você precisa, em um só lugar
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Pare de perder tempo com planilhas, cadernos e respostas de WhatsApp. O Trancify cuida disso por você.
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="bg-card rounded-2xl p-6 border border-border/60 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group"
              >
                <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display font-bold text-foreground mb-2 text-lg">{b.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PREÇO ────────────────────────────────────────────────────────── */}
      <section id="preco" className="py-24 sm:py-32">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center mb-12">
            <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">Transparência total</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Um plano. Preço justo.
            </h2>
            <p className="text-muted-foreground text-lg">
              Sem surpresas, sem planos confusos. Tudo incluso, para sempre.
            </p>
          </AnimatedSection>

          <AnimatedSection>
            <div className="relative bg-card rounded-3xl border-2 border-primary/30 shadow-2xl shadow-primary/10 overflow-hidden">
              {/* Top banner */}
              <div className="bg-primary px-6 py-3 text-center">
                <p className="text-white text-sm font-semibold flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  7 dias grátis — cartão necessário, cobrança automática só após o período
                </p>
              </div>

              <div className="p-8 sm:p-10">
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-5xl sm:text-6xl font-display font-black text-foreground">R$&nbsp;50</span>
                  <span className="text-muted-foreground text-lg mb-2">/mês</span>
                </div>
                <p className="text-muted-foreground mb-8">Por salão. Cancele quando quiser.</p>

                <ul className="space-y-3 mb-8">
                  {PLAN_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/cadastro"
                  className="block w-full py-4 bg-primary text-white rounded-2xl font-semibold text-base hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 text-center"
                >
                  Começar minha semana grátis
                </Link>

                <p className="text-center text-xs text-muted-foreground mt-4">
                  Após 7 dias, R$ 50/mês. Cancele a qualquer momento.
                </p>
              </div>
            </div>

            {/* Trial explanation */}
            <div className="mt-6 bg-primary/5 border border-primary/15 rounded-2xl p-5 flex gap-4 items-start">
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm mb-1">Como funciona o período de teste?</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Você cadastra o cartão no início, mas <strong className="text-foreground">não cobramos nada nos primeiros 7 dias</strong>. Após o período, a assinatura de R$ 50/mês é ativada automaticamente. Cancele antes se preferir — sem multa.
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── CONTATO / CTA ────────────────────────────────────────────────── */}
      <section id="contato" className="py-24 sm:py-32 bg-primary relative overflow-hidden">
        {/* Decorative */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-white blur-3xl" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <AnimatedSection>
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white mb-4 leading-tight">
              Trancista, venha gerenciar<br />
              seu salão do jeito Trancify.
            </h2>
            <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto">
              Entre em contato, criamos sua conta e coletamos os dados do cartão. Os primeiros 7 dias são completamente grátis — a cobrança de R$ 50 começa automaticamente só depois.
            </p>

            <a
              href="mailto:contato@trancify.com.br"
              className="inline-flex items-center gap-3 bg-white text-primary px-8 py-4 rounded-2xl font-semibold text-base hover:bg-white/95 transition-all shadow-xl hover:-translate-y-0.5 group"
            >
              <Mail className="w-5 h-5" />
              contato@trancify.com.br
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>

            <p className="text-white/60 text-sm mt-6">
              Respondemos em até 24 horas nos dias úteis.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="py-10 border-t border-border/60 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display font-bold text-foreground">Trancify</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Feito com carinho para trancistas brasileiras. © {new Date().getFullYear()} Trancify.
          </p>
          <a
            href="mailto:contato@trancify.com.br"
            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5" />
            contato@trancify.com.br
          </a>
        </div>
      </footer>
    </div>
  );
}
