import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft, ArrowRight, CheckCircle, Eye, EyeOff,
  MapPin, User, Store, CalendarDays, Lock, Sun, Moon, Info, Sparkles,
  Clock, BadgeCheck, Copy, ExternalLink, Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const WINE = "#6D1F3A";
const TOTAL_STEPS = 6;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatCNPJ(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function formatCEP(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function formatWhatsApp(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function slugify(v: string): string {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function validateCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]!) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(d[9]!)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]!) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(d[10]!);
}

function validateCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (s: string, weights: number[]) =>
    weights.reduce((acc, w, i) => acc + parseInt(s[i]!) * w, 0);
  const mod = (n: number) => { const r = n % 11; return r < 2 ? 0 : 11 - r; };
  const d1 = mod(calc(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  const d2 = mod(calc(d, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  return d1 === parseInt(d[12]!) && d2 === parseInt(d[13]!);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  ownerName: string;
  email: string;
  password: string;
  confirmPassword: string;
  birthDate: string;
  documentType: "cpf" | "cnpj";
  cpf: string;
  cnpj: string;
  salonName: string;
  slug: string;
  whatsapp: string;
  cep: string;
  address: string;
  neighborhood: string;
  addressNumber: string;
  addressComplement: string;
  city: string;
  state: string;
  plan: "monthly" | "annual";
}

type Errors = Partial<Record<keyof FormData, string>>;

// ── Step metadata ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Boas-vindas",   icon: Sparkles },
  { id: 2, label: "Dados pessoais", icon: User },
  { id: 3, label: "Seu salão",     icon: Store },
  { id: 4, label: "Endereço",      icon: MapPin },
  { id: 5, label: "Plano",         icon: CalendarDays },
  { id: 6, label: "Pagamento",     icon: Link2 },
];

// ── Animations ────────────────────────────────────────────────────────────────

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
};

// ── ProgressBar ───────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const pct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;
  return (
    <div className="w-full h-1.5 bg-primary/10 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: WINE }}
        animate={{ width: `${pct}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </div>
  );
}

// ── Field helper ──────────────────────────────────────────────────────────────

function Field({
  label, error, hint, children,
}: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({
  selected, plan, onClick,
}: { selected: boolean; plan: "monthly" | "annual"; onClick: () => void }) {
  const monthly = plan === "monthly";
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border-2 p-5 text-left transition-all ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-foreground">{monthly ? "Mensal" : "Anual"}</p>
          {!monthly && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full mt-0.5">
              <BadgeCheck className="w-3 h-3" />
              Economia de R$ 120/ano
            </span>
          )}
        </div>
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            selected ? "border-primary" : "border-muted-foreground/30"
          }`}
        >
          {selected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-foreground">
          {monthly ? "R$ 50" : "R$ 40"}
        </span>
        <span className="text-sm text-muted-foreground">/mês</span>
      </div>
      {!monthly && (
        <p className="text-xs text-muted-foreground mt-1">Cobrado anualmente: R$ 480</p>
      )}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CadastroPage() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [cepLoading, setCepLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const slugInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>({
    ownerName: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthDate: "",
    documentType: "cpf",
    cpf: "",
    cnpj: "",
    salonName: "",
    slug: "",
    whatsapp: "",
    cep: "",
    address: "",
    neighborhood: "",
    addressNumber: "",
    addressComplement: "",
    city: "",
    state: "",
    plan: "monthly",
  });

  const [errors, setErrors] = useState<Errors>({});

  function set(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  useEffect(() => {
    if (!slugEdited && form.salonName) {
      set("slug", slugify(form.salonName));
    }
  }, [form.salonName, slugEdited]);

  async function lookupCep(cep: string) {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setErrors((e) => ({ ...e, cep: "CEP não encontrado" }));
        return;
      }
      setForm((f) => ({
        ...f,
        address: data.logradouro ?? f.address,
        neighborhood: data.bairro ?? f.neighborhood,
        city: data.localidade ?? f.city,
        state: data.uf ?? f.state,
      }));
      setErrors((e) => ({ ...e, cep: undefined, address: undefined, city: undefined, state: undefined }));
    } catch {
      // silent
    } finally {
      setCepLoading(false);
    }
  }

  function validateStep(s: number): Errors {
    const e: Errors = {};

    if (s === 2) {
      if (!form.ownerName.trim() || form.ownerName.trim().length < 2)
        e.ownerName = "Informe seu nome completo";
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        e.email = "Email inválido";
      if (form.password.length < 8)
        e.password = "Senha deve ter ao menos 8 caracteres";
      if (form.confirmPassword !== form.password)
        e.confirmPassword = "As senhas não conferem";
      if (!form.birthDate)
        e.birthDate = "Informe sua data de nascimento";
      else {
        const age = (Date.now() - new Date(form.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000);
        if (age < 18) e.birthDate = "Você deve ter ao menos 18 anos";
      }
      if (form.documentType === "cpf") {
        if (!validateCPF(form.cpf))
          e.cpf = "CPF inválido";
      } else {
        if (!validateCNPJ(form.cnpj))
          e.cnpj = "CNPJ inválido";
      }
    }

    if (s === 3) {
      if (!form.salonName.trim() || form.salonName.trim().length < 2)
        e.salonName = "Informe o nome do salão";
      if (!form.slug || form.slug.length < 2)
        e.slug = "URL inválida";
      if (!/^[a-z0-9-]+$/.test(form.slug))
        e.slug = "Use apenas letras minúsculas, números e hífens";
      const phone = form.whatsapp.replace(/\D/g, "");
      if (phone.length < 10)
        e.whatsapp = "WhatsApp inválido";
    }

    if (s === 4) {
      const cep = form.cep.replace(/\D/g, "");
      if (cep.length !== 8) e.cep = "CEP inválido";
      if (!form.address.trim() || form.address.trim().length < 3)
        e.address = "Informe o logradouro";
      if (!form.addressNumber.trim())
        e.addressNumber = "Informe o número";
      if (!form.city.trim()) e.city = "Informe a cidade";
      if (!form.state || form.state.length !== 2) e.state = "Selecione o estado";
    }

    return e;
  }

  function goNext() {
    if (step === 1) { setDir(1); setStep(2); return; }
    const e = validateStep(step);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    if (step < TOTAL_STEPS) { setDir(1); setStep((s) => s + 1); }
  }

  function goBack() {
    if (step > 1) { setDir(-1); setStep((s) => s - 1); }
  }

  async function handleGenerateLink() {
    setIsGeneratingLink(true);
    const body = {
      ownerName: form.ownerName.trim(),
      email: form.email.trim(),
      password: form.password,
      birthDate: form.birthDate,
      ...(form.documentType === "cpf"
        ? { cpf: form.cpf.replace(/\D/g, "") }
        : { cnpj: form.cnpj.replace(/\D/g, "") }),
      salonName: form.salonName.trim(),
      slug: form.slug,
      whatsapp: form.whatsapp.replace(/\D/g, ""),
      cep: form.cep.replace(/\D/g, ""),
      address: form.address.trim(),
      neighborhood: form.neighborhood.trim(),
      addressNumber: form.addressNumber.trim(),
      addressComplement: form.addressComplement.trim() || undefined,
      city: form.city.trim(),
      state: form.state,
      plan: form.plan,
    };

    try {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          toast({ title: "Limite atingido", description: data.message, variant: "destructive" });
        } else if (res.status === 409) {
          if (data.message?.includes("email")) {
            setDir(-1); setStep(2); setErrors({ email: data.message });
          } else if (data.message?.includes("URL")) {
            setDir(-1); setStep(3); setErrors({ slug: data.message });
          } else {
            toast({ title: "Erro", description: data.message, variant: "destructive" });
          }
        } else {
          toast({ title: "Erro no cadastro", description: data.message ?? "Tente novamente.", variant: "destructive" });
        }
        return;
      }

      setPaymentLink(data.paymentLink);
    } catch {
      toast({ title: "Erro de conexão", description: "Verifique sua internet e tente novamente.", variant: "destructive" });
    } finally {
      setIsGeneratingLink(false);
    }
  }

  async function copyLink() {
    if (!paymentLink) return;
    try {
      await navigator.clipboard.writeText(paymentLink);
      toast({ title: "Link copiado!" });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  }

  const stepContent: Record<number, React.ReactNode> = {
    1: (
      <div className="space-y-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: `${WINE}18` }}
        >
          <Sparkles className="w-8 h-8" style={{ color: WINE }} />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Bem-vinda ao Trancify!</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Vamos criar sua conta em menos de 5 minutos. Separe os dados abaixo antes de começar:
          </p>
        </div>
        <div className="space-y-3">
          {[
            { icon: User,        text: "Seu nome completo, CPF ou CNPJ e data de nascimento" },
            { icon: Store,       text: "O nome do seu salão e WhatsApp" },
            { icon: MapPin,      text: "Endereço completo do salão" },
            { icon: CalendarDays,text: "Escolha do plano (mensal ou anual)" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${WINE}15` }}
              >
                <Icon className="w-4 h-4" style={{ color: WINE }} />
              </div>
              <p className="text-sm text-foreground">{text}</p>
            </div>
          ))}
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            Por segurança, limitamos <strong>1 cadastro por rede a cada 24 horas</strong> para garantir que o
            período de teste gratuito seja justo para todas as trancistas.
          </p>
        </div>
      </div>
    ),

    2: (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Seus dados pessoais</h2>
          <p className="text-sm text-muted-foreground">Necessários para verificação de identidade.</p>
        </div>

        <Field label="Nome completo" error={errors.ownerName}>
          <Input placeholder="Ex: Maria Silva Santos" value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} autoComplete="name" />
        </Field>

        <Field label="Email" error={errors.email}>
          <Input type="email" placeholder="seu@email.com" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Senha" error={errors.password}>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                autoComplete="new-password"
                className="pr-10"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <Field label="Confirmar senha" error={errors.confirmPassword}>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Repita a senha"
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                autoComplete="new-password"
                className="pr-10"
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
        </div>

        <Field label="Data de nascimento" error={errors.birthDate}>
          <Input
            type="date"
            value={form.birthDate}
            onChange={(e) => set("birthDate", e.target.value)}
            max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split("T")[0]}
          />
        </Field>

        {/* CPF / CNPJ toggle */}
        <div>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => { setForm((f) => ({ ...f, documentType: "cpf" })); setErrors((e) => ({ ...e, cpf: undefined, cnpj: undefined })); }}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                form.documentType === "cpf"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              CPF (pessoa física)
            </button>
            <button
              type="button"
              onClick={() => { setForm((f) => ({ ...f, documentType: "cnpj" })); setErrors((e) => ({ ...e, cpf: undefined, cnpj: undefined })); }}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                form.documentType === "cnpj"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              CNPJ (pessoa jurídica)
            </button>
          </div>

          {form.documentType === "cpf" ? (
            <Field label="CPF" error={errors.cpf}>
              <Input
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => set("cpf", formatCPF(e.target.value))}
                inputMode="numeric"
              />
            </Field>
          ) : (
            <Field label="CNPJ" error={errors.cnpj}>
              <Input
                placeholder="00.000.000/0000-00"
                value={form.cnpj}
                onChange={(e) => set("cnpj", formatCNPJ(e.target.value))}
                inputMode="numeric"
              />
            </Field>
          )}
        </div>
      </div>
    ),

    3: (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Sobre o seu salão</h2>
          <p className="text-sm text-muted-foreground">Estes dados aparecem na sua página pública de agendamento.</p>
        </div>

        <Field label="Nome do salão" error={errors.salonName}>
          <Input placeholder="Ex: Naira Tranças & Estilo" value={form.salonName} onChange={(e) => set("salonName", e.target.value)} />
        </Field>

        <Field
          label="URL do seu salão"
          error={errors.slug}
          hint={form.slug ? `Sua página: trancify.com.br/${form.slug}` : undefined}
        >
          <div className="flex items-center">
            <span className="text-sm text-muted-foreground bg-muted px-3 h-10 flex items-center rounded-l-md border border-r-0 border-input whitespace-nowrap">
              trancify.com.br/
            </span>
            <Input
              ref={slugInputRef}
              placeholder="nome-do-salao"
              value={form.slug}
              onChange={(e) => { setSlugEdited(true); set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }}
              className="rounded-l-none"
            />
          </div>
        </Field>

        <Field label="WhatsApp" error={errors.whatsapp} hint="Clientes usarão para confirmar agendamentos">
          <Input placeholder="(11) 99999-9999" value={form.whatsapp} onChange={(e) => set("whatsapp", formatWhatsApp(e.target.value))} inputMode="tel" />
        </Field>
      </div>
    ),

    4: (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Endereço do salão</h2>
          <p className="text-sm text-muted-foreground">Digite o CEP para preencher automaticamente.</p>
        </div>

        <Field label="CEP" error={errors.cep}>
          <div className="relative">
            <Input
              placeholder="00000-000"
              value={form.cep}
              onChange={(e) => {
                const v = formatCEP(e.target.value);
                set("cep", v);
                if (v.replace(/\D/g, "").length === 8) lookupCep(v);
              }}
              inputMode="numeric"
            />
            {cepLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </Field>

        <Field label="Logradouro" error={errors.address}>
          <Input placeholder="Rua, avenida, travessa…" value={form.address} onChange={(e) => set("address", e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Número" error={errors.addressNumber}>
            <Input placeholder="Ex: 123" value={form.addressNumber} onChange={(e) => set("addressNumber", e.target.value)} />
          </Field>
          <Field label="Complemento" error={errors.addressComplement}>
            <Input placeholder="Apto, sala…" value={form.addressComplement} onChange={(e) => set("addressComplement", e.target.value)} />
          </Field>
        </div>

        <Field label="Bairro">
          <Input placeholder="Bairro" value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Cidade" error={errors.city}>
            <Input placeholder="São Paulo" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="Estado" error={errors.state}>
            <select
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground"
            >
              <option value="">UF</option>
              {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    ),

    5: (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Escolha seu plano</h2>
          <p className="text-sm text-muted-foreground">
            Você só começa a pagar após os 7 dias de teste. Cancele a qualquer momento.
          </p>
        </div>
        <div className="space-y-3">
          <PlanCard selected={form.plan === "monthly"} plan="monthly" onClick={() => set("plan", "monthly")} />
          <PlanCard selected={form.plan === "annual"} plan="annual" onClick={() => set("plan", "annual")} />
        </div>
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 flex gap-3">
          <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-0.5">7 dias grátis, sem cobrança</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              O pagamento só é necessário para continuar após o teste gratuito. Cancele antes se preferir — sem multa.
            </p>
          </div>
        </div>
      </div>
    ),

    6: (
      <div className="space-y-5">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: `${WINE}15` }}
        >
          <Link2 className="w-7 h-7" style={{ color: WINE }} />
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-1">
            {paymentLink ? "Link gerado!" : "Quase lá!"}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {paymentLink
              ? "Clique no botão abaixo para ir ao pagamento e ativar sua conta."
              : "Revise seu plano e gere o link de pagamento para finalizar o cadastro."}
          </p>
        </div>

        {/* Plan summary */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumo</p>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Plano</span>
            <span className="font-semibold">{form.plan === "annual" ? "Anual" : "Mensal"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valor</span>
            <span className="font-semibold">{form.plan === "annual" ? "R$ 480,00/ano" : "R$ 50,00/mês"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Salão</span>
            <span className="font-semibold">{form.salonName || "—"}</span>
          </div>
        </div>

        {!paymentLink ? (
          <Button
            size="lg"
            className="w-full h-12 rounded-xl"
            onClick={handleGenerateLink}
            disabled={isGeneratingLink}
            style={{ background: WINE }}
          >
            {isGeneratingLink ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Gerando link…
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4 mr-2" />
                Gerar link de pagamento
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="bg-secondary/50 border border-border rounded-xl p-3 flex items-center gap-2">
              <p className="text-xs text-muted-foreground truncate flex-1 font-mono">{paymentLink}</p>
              <button
                type="button"
                onClick={copyLink}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0"
                title="Copiar link"
              >
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <a href={paymentLink} className="block">
              <Button size="lg" className="w-full h-12 rounded-xl" style={{ background: WINE }}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Ir para pagamento
              </Button>
            </a>
            <p className="text-xs text-center text-muted-foreground">
              Ao clicar, seu cadastro será ativado e você definirá o acesso ao painel.
            </p>
          </div>
        )}
      </div>
    ),
  };

  const currentStep = STEPS[step - 1]!;
  const isLastStep = step === TOTAL_STEPS;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: WINE }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-foreground">Trancify</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Já tenho conta
          </Link>
          <button
            onClick={toggleDarkMode}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            aria-label="Alternar tema"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <currentStep.icon className="w-4 h-4" style={{ color: WINE }} />
                <span style={{ color: WINE }}>{currentStep.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{step} / {TOTAL_STEPS}</span>
            </div>
            <ProgressBar step={step} />
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={step}
                  custom={dir}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                >
                  {stepContent[step]}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={goBack}
                  className="flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
              )}

              {/* Hide next button on step 6 (link step) */}
              {step < TOTAL_STEPS && (
                <Button
                  className="flex-1 flex items-center justify-center gap-1.5"
                  style={{ background: WINE }}
                  onClick={goNext}
                >
                  {step === 1 ? "Começar" : "Continuar"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
