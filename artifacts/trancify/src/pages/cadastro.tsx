import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft, ArrowRight, CheckCircle, Eye, EyeOff, CreditCard, Shield,
  MapPin, User, Store, CalendarDays, Lock, Sun, Moon, Info, Sparkles,
  Clock, BadgeCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const WINE = "#6D1F3A";
const TOTAL_STEPS = 7;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
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

function formatCardNumber(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 16);
  return d.match(/.{1,4}/g)?.join(" ") ?? d;
}

function formatCardExpiry(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

function detectCardBrand(num: string): string {
  const d = num.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(d) || /^2(2[2-9][1-9]|[3-6]\d{2}|7[01]\d|720)/.test(d)) return "Mastercard";
  if (/^3[47]/.test(d)) return "American Express";
  if (/^36/.test(d)) return "Diners Club";
  if (/^6(011|4[4-9]|5)/.test(d)) return "Discover";
  if (/^60(6282|4175|4176|4177|4178|4179|4182|4183|4184|4185|4186|4187|4188|4189|4190|4191|4192|4193|4194|4195|4196|4197|4198|4199)/.test(d)) return "Hipercard";
  if (/^(4011|4312|4389|4514|4573|5041|5066|5090|6277|6362|6363|650031|650032|650035|650036|650037|650038|650039|650040|650041|650042|650043|650044|650045|650046|650047|650048|650049|650050|650051|650405|650406|650407|650408|650409|650410|650411|650412|650413|650414|650415|650416|650417|650418|650419|650420|650421|650422|650423|650424|650425|650426|650427|650428|650429|650430|650431|650432|650433|650434|650435|650436|650437|650438|650439|650440|650441|650442|650443|650444|650445|650446|650447|650448|650449|650450|650451|650452|650453|650454|650455|650456|650457|650458|650459|650460|650461|650462|650463|650464|650465|650466|650467|650468|650469|650470|650471|650472|650473|650474|650475|650476|650477|650478|650479|650480|650481|650482|650483|650484|650485|650486|650487|650488|650489|650490|650491|650492|650493|650494|650495|650496|650497|650498|650499|650500|650501|650502|650503|650504|650505|650506|650507|650508|650509|650510|650511|650512|650513|650514|650515|650516|650517|650518|650519|650520|650521|650522|650523|650524|650525|650526|650527|650528|650529|650530|650531|650532|650533|650534|650535|650536|650537|650538|650539|650540|650541|650542|650543|650544|650545|650546|650547|650548|650549|650550|650551|650552|650553|650554|650555|650556|650557|650558|650559|650560|650561|650562|650563|650564|650565|650566|650567|650568|650569|650570|650571|650572|650573|650574|650575|650576|650577|650578|650579|650580|650581|650582|650583|650584|650585|650586|650587|650588|650589|650590|650591|650592|650593|650594|650595|650596|650597|650598|650599|650600|650601|650602|650603|650604|650605|650606|650607|650608|650609|650610|650611|650612|650613|650614|650615|650616|650617|650618|650619|650620|650621|650622|650623|650624|650625|650626|650627|650628|650629|650630|650631|650632|650633|650634|650635|650636|650637|650638|650639|650640|650641|650642|650643|650644|650645|650646|650647|650648|650649|650650|650651|650652|650653|650654|650655|650656|650657|650658|650659)/.test(d)) return "Elo";
  return "";
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  ownerName: string;
  email: string;
  password: string;
  confirmPassword: string;
  birthDate: string;
  cpf: string;
  salonName: string;
  slug: string;
  whatsapp: string;
  cep: string;
  address: string;
  city: string;
  state: string;
  plan: "monthly" | "annual";
  cardNumber: string;
  cardholderName: string;
  cardExpiry: string;
  cardCvv: string;
}

type Errors = Partial<Record<keyof FormData, string>>;

// ── Step metadata ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Boas-vindas", icon: Sparkles },
  { id: 2, label: "Dados pessoais", icon: User },
  { id: 3, label: "Seu salão", icon: Store },
  { id: 4, label: "Endereço", icon: MapPin },
  { id: 5, label: "Plano", icon: CalendarDays },
  { id: 6, label: "Segurança", icon: Shield },
  { id: 7, label: "Pagamento", icon: CreditCard },
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

// ── Field helpers ─────────────────────────────────────────────────────────────

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
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const slugInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>({
    ownerName: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthDate: "",
    cpf: "",
    salonName: "",
    slug: "",
    whatsapp: "",
    cep: "",
    address: "",
    city: "",
    state: "",
    plan: "monthly",
    cardNumber: "",
    cardholderName: "",
    cardExpiry: "",
    cardCvv: "",
  });

  const [errors, setErrors] = useState<Errors>({});

  function set(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  // Auto-generate slug from salonName
  useEffect(() => {
    if (!slugEdited && form.salonName) {
      set("slug", slugify(form.salonName));
    }
  }, [form.salonName, slugEdited]);

  // CEP auto-fill via ViaCEP
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
        address: data.logradouro ? `${data.logradouro}${data.bairro ? `, ${data.bairro}` : ""}` : f.address,
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

  // ── Validation per step ────────────────────────────────────────────────────

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
      if (!validateCPF(form.cpf))
        e.cpf = "CPF inválido";
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
      if (!form.address.trim() || form.address.trim().length < 5)
        e.address = "Informe o logradouro";
      if (!form.city.trim()) e.city = "Informe a cidade";
      if (!form.state || form.state.length !== 2) e.state = "Selecione o estado";
    }

    if (s === 7) {
      const num = form.cardNumber.replace(/\D/g, "");
      if (num.length < 13 || num.length > 19)
        e.cardNumber = "Número do cartão inválido";
      if (!form.cardholderName.trim())
        e.cardholderName = "Informe o nome como está no cartão";
      const expParts = form.cardExpiry.split("/");
      if (expParts.length !== 2 || !expParts[0] || !expParts[1]) {
        e.cardExpiry = "Validade inválida (MM/AA)";
      } else {
        const month = parseInt(expParts[0]);
        const year = parseInt(`20${expParts[1]}`);
        const now = new Date();
        if (month < 1 || month > 12) e.cardExpiry = "Mês inválido";
        else if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1))
          e.cardExpiry = "Cartão expirado";
      }
      if (form.cardCvv.replace(/\D/g, "").length < 3)
        e.cardCvv = "CVV inválido";
    }

    return e;
  }

  function goNext() {
    if (step === 1) {
      setDir(1);
      setStep(2);
      return;
    }
    const e = validateStep(step);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    if (step < TOTAL_STEPS) {
      setDir(1);
      setStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  }

  function goBack() {
    if (step > 1) {
      setDir(-1);
      setStep((s) => s - 1);
    }
  }

  async function handleSubmit() {
    const e = validateStep(7);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    setIsSubmitting(true);

    const rawCard = form.cardNumber.replace(/\D/g, "");
    const expParts = form.cardExpiry.split("/");

    const body = {
      ownerName: form.ownerName.trim(),
      email: form.email.trim(),
      password: form.password,
      birthDate: form.birthDate,
      cpf: form.cpf.replace(/\D/g, ""),
      salonName: form.salonName.trim(),
      slug: form.slug,
      whatsapp: form.whatsapp.replace(/\D/g, ""),
      cep: form.cep.replace(/\D/g, ""),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state,
      plan: form.plan,
      cardLast4: rawCard.slice(-4),
      cardBrand: detectCardBrand(rawCard) || "Desconhecida",
      cardExpiryMonth: expParts[0]!.padStart(2, "0"),
      cardExpiryYear: `20${expParts[1]}`,
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
          toast({
            title: "Limite atingido",
            description: data.message ?? "Muitos cadastros deste IP. Tente amanhã.",
            variant: "destructive",
          });
        } else if (res.status === 409) {
          if (data.message?.includes("email")) {
            setDir(-1);
            setStep(2);
            setErrors({ email: data.message });
          } else if (data.message?.includes("URL")) {
            setDir(-1);
            setStep(3);
            setErrors({ slug: data.message });
          } else {
            toast({ title: "Erro", description: data.message, variant: "destructive" });
          }
        } else {
          toast({ title: "Erro no cadastro", description: data.message ?? "Tente novamente.", variant: "destructive" });
        }
        return;
      }

      // Log in immediately
      login(data.token, data.user);
      setIsSuccess(true);

      setTimeout(() => {
        setLocation("/dashboard");
      }, 3000);
    } catch {
      toast({ title: "Erro de conexão", description: "Verifique sua internet e tente novamente.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: `${WINE}20` }}
          >
            <CheckCircle className="w-10 h-10" style={{ color: WINE }} />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Cadastro realizado!</h2>
          <p className="text-muted-foreground mb-2">
            Bem-vinda ao Trancify, {form.ownerName.split(" ")[0]}!
          </p>
          <p className="text-sm text-muted-foreground">
            Seu período de teste de 7 dias começou. Redirecionando para o painel…
          </p>
          <div className="mt-6 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Step content ───────────────────────────────────────────────────────────

  const brand = detectCardBrand(form.cardNumber);
  const cardDigits = form.cardNumber.replace(/\D/g, "");

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
            { icon: User, text: "Seu nome completo, CPF e data de nascimento" },
            { icon: Store, text: "O nome do seu salão e WhatsApp" },
            { icon: MapPin, text: "Endereço completo do salão" },
            { icon: CreditCard, text: "Um cartão de crédito (não cobrado nos primeiros 7 dias)" },
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
          <Input
            placeholder="Ex: Maria Silva Santos"
            value={form.ownerName}
            onChange={(e) => set("ownerName", e.target.value)}
            autoComplete="name"
          />
        </Field>

        <Field label="Email" error={errors.email}>
          <Input
            type="email"
            placeholder="seu@email.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            autoComplete="email"
          />
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
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
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
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Data de nascimento" error={errors.birthDate}>
            <Input
              type="date"
              value={form.birthDate}
              onChange={(e) => set("birthDate", e.target.value)}
              max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split("T")[0]}
            />
          </Field>

          <Field label="CPF" error={errors.cpf}>
            <Input
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={(e) => set("cpf", formatCPF(e.target.value))}
              inputMode="numeric"
            />
          </Field>
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
          <Input
            placeholder="Ex: Naira Tranças & Estilo"
            value={form.salonName}
            onChange={(e) => set("salonName", e.target.value)}
          />
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
              onChange={(e) => {
                setSlugEdited(true);
                set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              className="rounded-l-none"
            />
          </div>
        </Field>

        <Field label="WhatsApp" error={errors.whatsapp} hint="Clientes usarão para confirmar agendamentos">
          <Input
            placeholder="(11) 99999-9999"
            value={form.whatsapp}
            onChange={(e) => set("whatsapp", formatWhatsApp(e.target.value))}
            inputMode="tel"
          />
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

        <Field label="Logradouro e bairro" error={errors.address}>
          <Input
            placeholder="Rua, número e bairro"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Cidade" error={errors.city}>
            <Input
              placeholder="São Paulo"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
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
              Você cadastra o cartão agora, mas a primeira cobrança só acontece no 8º dia.
              Cancele antes se preferir — sem multa.
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
          <Shield className="w-7 h-7" style={{ color: WINE }} />
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-1">Sobre os dados do cartão</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Leia antes de continuar — é importante.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              icon: Lock,
              title: "Seus dados são protegidos",
              body: "Os dados do cartão são processados com criptografia. Nunca armazenamos o número completo, nome ou CVV — apenas os últimos 4 dígitos e a bandeira, para identificação.",
            },
            {
              icon: Clock,
              title: "Cobrança só após 7 dias",
              body: `Hoje é o início do seu período de teste gratuito. Você escolheu o plano ${form.plan === "monthly" ? "mensal (R$ 50/mês)" : "anual (R$ 480/ano)"}. A primeira cobrança acontece no 8º dia, caso não cancele antes.`,
            },
            {
              icon: Info,
              title: "Por que limitamos por IP?",
              body: "Para garantir que o período de teste seja justo para todas as trancistas, limitamos um cadastro por endereço de rede a cada 24 horas. Isso evita criação em massa de contas fictícias.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-card border border-border rounded-xl p-4 flex gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${WINE}12` }}
              >
                <Icon className="w-4 h-4" style={{ color: WINE }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-0.5">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),

    7: (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Dados do cartão</h2>
          <p className="text-sm text-muted-foreground">
            Criptografado e seguro. Não será cobrado pelos primeiros 7 dias.
          </p>
        </div>

        <Field label="Número do cartão" error={errors.cardNumber}>
          <div className="relative">
            <Input
              placeholder="0000 0000 0000 0000"
              value={form.cardNumber}
              onChange={(e) => set("cardNumber", formatCardNumber(e.target.value))}
              inputMode="numeric"
              maxLength={19}
              className="pr-24"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {brand && (
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {brand}
                </span>
              )}
              {cardDigits.length >= 13 && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
          </div>
        </Field>

        <Field label="Nome no cartão" error={errors.cardholderName}>
          <Input
            placeholder="NOME COMO ESTÁ NO CARTÃO"
            value={form.cardholderName}
            onChange={(e) => set("cardholderName", e.target.value.toUpperCase())}
            autoComplete="cc-name"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Validade" error={errors.cardExpiry}>
            <Input
              placeholder="MM/AA"
              value={form.cardExpiry}
              onChange={(e) => set("cardExpiry", formatCardExpiry(e.target.value))}
              inputMode="numeric"
              maxLength={5}
              autoComplete="cc-exp"
            />
          </Field>

          <Field label="CVV" error={errors.cardCvv}>
            <Input
              placeholder="000"
              value={form.cardCvv}
              onChange={(e) => set("cardCvv", e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              maxLength={4}
              autoComplete="cc-csc"
            />
          </Field>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Seus dados são criptografados e nunca compartilhados.</span>
        </div>
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
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: WINE }}
          >
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
          {/* Step label & progress */}
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <currentStep.icon className="w-4 h-4" style={{ color: WINE }} />
                <span style={{ color: WINE }}>{currentStep.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {step} / {TOTAL_STEPS}
              </span>
            </div>
            <ProgressBar step={step} />
          </div>

          {/* Step card */}
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

            {/* Navigation */}
            <div className="px-6 pb-6 flex gap-3">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={goBack}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
              )}

              <Button
                className="flex-1 flex items-center justify-center gap-2 font-semibold text-white"
                style={{ background: WINE }}
                onClick={goNext}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Criando conta…
                  </>
                ) : isLastStep ? (
                  <>
                    <Lock className="w-4 h-4" />
                    Criar minha conta
                  </>
                ) : step === 1 ? (
                  <>
                    Vamos começar
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
            Ao criar sua conta, você concorda com os{" "}
            <span className="underline cursor-pointer">Termos de Uso</span> e a{" "}
            <span className="underline cursor-pointer">Política de Privacidade</span> da Trancify.
          </p>
        </div>
      </main>
    </div>
  );
}
