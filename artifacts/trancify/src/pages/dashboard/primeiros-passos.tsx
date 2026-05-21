import { Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useGetMyTenant,
  useGetMyServices,
  useGetMyAvailability,
} from "@workspace/api-client-react";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Scissors,
  Clock,
  Settings,
  Sparkles,
  Store,
  Palette,
  Globe,
  Phone,
  ImageIcon,
  Lock,
  ExternalLink,
  PartyPopper,
} from "lucide-react";

const BASE_URL = "trancify.com.br";

interface Step {
  id: number;
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
}

function StepCard({ step, isLast }: { step: Step; isLast: boolean }) {
  return (
    <div className="relative flex gap-5">
      {/* Vertical connector line */}
      {!isLast && (
        <div className="absolute left-[22px] top-12 bottom-0 w-0.5 bg-border" />
      )}

      {/* Status icon */}
      <div className="relative z-10 flex-shrink-0 mt-0.5">
        {step.done ? (
          <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shadow-sm">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        ) : (
          <div className="w-11 h-11 rounded-full border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{step.id}</span>
          </div>
        )}
      </div>

      {/* Card content */}
      <div className={`flex-1 bg-card border rounded-2xl p-5 mb-5 transition-all ${
        step.done
          ? "border-emerald-200/60 dark:border-emerald-800/40 opacity-75"
          : "border-border shadow-sm hover:shadow-md"
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              step.done
                ? "bg-emerald-100 dark:bg-emerald-900/40"
                : "bg-primary/10"
            }`}>
              <step.icon className={`w-5 h-5 ${step.done ? "text-emerald-600 dark:text-emerald-400" : "text-primary"}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold text-foreground">{step.title}</h3>
                {step.done ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Concluído
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Pendente
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          </div>

          {!step.done && (
            <Link href={step.href}>
              <button className="flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3.5 py-2 rounded-xl hover:bg-primary/90 transition-all whitespace-nowrap shrink-0 shadow-sm shadow-primary/20">
                {step.cta}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          )}
          {step.done && (
            <Link href={step.href}>
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0">
                Editar
                <ChevronRight className="w-3 h-3" />
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : (done / total) * 100;
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-border" />
        <circle
          cx="36" cy="36" r={radius} fill="none" stroke="currentColor" strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" className="text-primary transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-foreground leading-none">{done}</span>
        <span className="text-[10px] text-muted-foreground">de {total}</span>
      </div>
    </div>
  );
}

export default function PrimeirosPassosPage() {
  const { data: tenant, isLoading: tenantLoading } = useGetMyTenant();
  const { data: services, isLoading: servicesLoading } = useGetMyServices();
  const { data: availability, isLoading: availLoading } = useGetMyAvailability();

  const isLoading = tenantLoading || servicesLoading || availLoading;

  const hasWhatsApp = !!tenant?.whatsapp?.trim();
  const hasService = (services?.length ?? 0) >= 1;
  const hasAvailability = (availability?.availableDates?.length ?? 0) > 0;

  const steps: Step[] = [
    {
      id: 1,
      icon: Phone,
      title: "Configure o WhatsApp do salão",
      description:
        "O WhatsApp é usado para notificar você quando um novo agendamento chegar. Sem ele, você perde os avisos.",
      href: "/dashboard/configuracoes",
      cta: "Configurar",
      done: hasWhatsApp,
    },
    {
      id: 2,
      icon: Scissors,
      title: "Cadastre pelo menos 1 serviço",
      description:
        "Suas clientes precisam escolher um serviço para agendar. Adicione os tranças que você faz, com preço e duração.",
      href: "/dashboard/servicos",
      cta: "Adicionar serviço",
      done: hasService,
    },
    {
      id: 3,
      icon: Clock,
      title: "Abra sua agenda",
      description:
        "Selecione no calendário os dias específicos em que você vai atender. Sem datas selecionadas, suas clientes não conseguem agendar.",
      href: "/dashboard/disponibilidade",
      cta: "Selecionar datas",
      done: hasAvailability,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const publicUrl = tenant?.slug ? `${BASE_URL}/${tenant.slug}` : null;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-card rounded-2xl border border-border/50 animate-pulse" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-1">
            Primeiros passos
          </h1>
          <p className="text-muted-foreground">
            Siga estes passos para colocar sua loja no ar e começar a receber agendamentos.
          </p>
        </div>

        {/* Progress card */}
        <div className={`rounded-3xl p-6 mb-8 flex flex-col sm:flex-row items-center gap-5 sm:gap-6 border ${
          allDone
            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
            : "bg-card border-border/50 shadow-sm"
        }`}>
          <ProgressRing done={doneCount} total={steps.length} />
          <div>
            {allDone ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <PartyPopper className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                    Loja pronta para receber agendamentos!
                  </h2>
                </div>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Tudo configurado. Compartilhe o link com suas clientes e comece a faturar.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-foreground mb-1">
                  {doneCount === 0
                    ? "Vamos começar!"
                    : `Quase lá — ${steps.length - doneCount} passo${steps.length - doneCount > 1 ? "s" : ""} restante${steps.length - doneCount > 1 ? "s" : ""}`}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Complete os passos abaixo para sua loja ficar operacional.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Steps */}
        <div>
          {steps.map((step, i) => (
            <StepCard key={step.id} step={step} isLast={i === steps.length - 1} />
          ))}
        </div>

        {/* Public link card — shown once they have a service */}
        {publicUrl && hasService && (
          <div className="mt-2 mb-8 bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground mb-0.5">Sua página pública</p>
              <p className="text-xs text-muted-foreground font-mono truncate">{publicUrl}</p>
            </div>
            <a
              href={`https://${publicUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors shrink-0"
            >
              Abrir
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Configurações overview */}
        <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm mt-2">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">O que tem em Configurações?</h2>
              <p className="text-xs text-muted-foreground">Personalize e gerencie sua conta</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {[
              {
                icon: Store,
                title: "Perfil do salão",
                desc: "Nome, URL pública e WhatsApp do seu salão",
              },
              {
                icon: Palette,
                title: "Cores e identidade",
                desc: "Personalize a cor principal da sua página de agendamento",
              },
              {
                icon: ImageIcon,
                title: "Logo",
                desc: "Adicione a foto ou logo do seu salão",
              },
              {
                icon: Lock,
                title: "Email e senha",
                desc: "Atualize suas credenciais de acesso quando precisar",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-3.5 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shrink-0 border border-border/50">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-snug">{title}</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Link href="/dashboard/configuracoes">
            <button className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-sm shadow-primary/20">
              <Sparkles className="w-4 h-4" />
              Ir para Configurações
              <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
