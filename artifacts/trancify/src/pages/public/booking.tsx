import { useState, useRef, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useGetPublicTenant, useGetPublicServices, useGetPublicAvailability, useGetPublicAvailabilityDates, useBookAppointment } from "@workspace/api-client-react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, CheckCircle, ChevronRight, ArrowLeft, ImagePlus, X, ChevronLeft,
  MessageCircle, Camera, CreditCard, Info, Banknote, Search, Clock as ClockIcon, AlertTriangle, Wallet
} from "lucide-react";
import { Link } from "wouter";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isBefore,
  isToday,
  startOfDay,
  addMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const MAX_PHOTOS = 3;
const MAX_FILE_SIZE_MB = 5;
const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const TOTAL_STEPS = 4;

function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(125,37,53,${alpha})`;
  return `rgba(${parseInt(result[1]!, 16)},${parseInt(result[2]!, 16)},${parseInt(result[3]!, 16)},${alpha})`;
}

function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "345 60% 35%";
  let r = parseInt(result[1]!, 16) / 255;
  let g = parseInt(result[2]!, 16) / 255;
  let b = parseInt(result[3]!, 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hexLuminance(hex: string): number {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return 1;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const r = lin(parseInt(m[1]!, 16) / 255);
  const g = lin(parseInt(m[2]!, 16) / 255);
  const b = lin(parseInt(m[3]!, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function adjustHslL(hsl: string, delta: number): string {
  const m = /^(-?\d+)\s+(\d+)%\s+(\d+)%$/.exec(hsl);
  if (!m) return hsl;
  const h = m[1], s = m[2];
  const l = Math.max(0, Math.min(100, parseInt(m[3]!, 10) + delta));
  return `${h} ${s}% ${l}%`;
}

function contrastRatio(lumA: number, lumB: number): number {
  const [lo, hi] = lumA < lumB ? [lumA, lumB] : [lumB, lumA];
  return (hi + 0.05) / (lo + 0.05);
}

function pickContrastHsl(hex: string): string {
  // WCAG-based: pick whichever of pure black/white yields higher contrast
  const lum = hexLuminance(hex);
  const cWhite = contrastRatio(lum, 1);
  const cBlack = contrastRatio(lum, 0);
  return cWhite >= cBlack ? "0 0% 100%" : "0 0% 10%";
}

function buildPublicTheme(primaryHex: string, secondaryHex: string): React.CSSProperties {
  const bgHsl = hexToHsl(secondaryHex);
  const primaryHsl = hexToHsl(primaryHex);
  const bgLum = hexLuminance(secondaryHex);
  const isDarkBg = bgLum < 0.5;
  const primaryFg = pickContrastHsl(primaryHex);

  if (isDarkBg) {
    return {
      "--background": bgHsl,
      "--foreground": "0 0% 96%",
      "--card": adjustHslL(bgHsl, 6),
      "--card-foreground": "0 0% 96%",
      "--popover": adjustHslL(bgHsl, 6),
      "--popover-foreground": "0 0% 96%",
      "--primary": primaryHsl,
      "--primary-foreground": primaryFg,
      "--secondary": adjustHslL(bgHsl, 10),
      "--secondary-foreground": "0 0% 95%",
      "--muted": adjustHslL(bgHsl, 8),
      "--muted-foreground": "0 0% 70%",
      "--accent": adjustHslL(bgHsl, 12),
      "--accent-foreground": "0 0% 96%",
      "--destructive": "0 84% 60%",
      "--destructive-foreground": "0 0% 100%",
      "--border": adjustHslL(bgHsl, 14),
      "--input": adjustHslL(bgHsl, 14),
      "--ring": primaryHsl,
    } as React.CSSProperties;
  }

  return {
    "--background": bgHsl,
    "--foreground": "20 14% 16%",
    "--card": "0 0% 100%",
    "--card-foreground": "20 14% 16%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "20 14% 16%",
    "--primary": primaryHsl,
    "--primary-foreground": primaryFg,
    "--secondary": adjustHslL(bgHsl, -6),
    "--secondary-foreground": "345 60% 25%",
    "--muted": adjustHslL(bgHsl, -4),
    "--muted-foreground": "25 10% 45%",
    "--accent": "35 85% 55%",
    "--accent-foreground": "20 14% 16%",
    "--destructive": "0 84% 60%",
    "--destructive-foreground": "0 0% 100%",
    "--border": adjustHslL(bgHsl, -10),
    "--input": adjustHslL(bgHsl, -10),
    "--ring": primaryHsl,
  } as React.CSSProperties;
}

function toDateStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PublicBookingPage() {
  const { slug } = useParams();
  const { toast } = useToast();

  // Strip dark mode from <html> while the public page is visible so no
  // Tailwind dark: classes interfere with the tenant's chosen brand colors.
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");
    html.classList.remove("dark");
    return () => {
      if (hadDark) html.classList.add("dark");
    };
  }, []);

  const { data: tenant, isLoading: loadTenant, error: tenantErr } = useGetPublicTenant(slug || "");
  const { data: services } = useGetPublicServices(tenant?.id || "", { query: { enabled: !!tenant?.id } });

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const { data: publicReviews } = useQuery<Array<{ id: string; clientName: string; rating: number; comment: string | null; createdAt: string }>>({
    queryKey: ["public-reviews", tenant?.id],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/reviews/public/${tenant!.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tenant?.id,
  });

  // step 0 = intro, 1 = service, 2 = size, 3 = date/time, 4 = client data
  const [step, setStep] = useState(0);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [braidSize, setBraidSize] = useState<"mid_back" | "waist_butt">("mid_back");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [monthOffset, setMonthOffset] = useState(0);
  const [referencePhotos, setReferencePhotos] = useState<string[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [clientData, setClientData] = useState({
    name: "",
    phone: "",
    age: "",
    hairDesc: "",
    cpf: "",
    payment: "" as "" | "pix" | "card" | "cash"
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bookingType, setBookingType] = useState<"appointment" | "pre_appointment">("appointment");
  const [paymentChoice, setPaymentChoice] = useState<"deposit" | "full" | "later" | "">("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);
  const [lookupFound, setLookupFound] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  // Fullscreen image lightbox
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number; title?: string } | null>(null);
  const openLightbox = (images: string[], index: number, title?: string) => {
    if (!images.length) return;
    setLightbox({ images, index, title });
  };
  const closeLightbox = () => setLightbox(null);
  const lightboxNext = () => setLightbox((lb) => lb ? { ...lb, index: (lb.index + 1) % lb.images.length } : lb);
  const lightboxPrev = () => setLightbox((lb) => lb ? { ...lb, index: (lb.index - 1 + lb.images.length) % lb.images.length } : lb);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") lightboxNext();
      else if (e.key === "ArrowLeft") lightboxPrev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox]);

  const { data: availableDatesData } = useGetPublicAvailabilityDates(
    tenant?.id || "",
    { query: { enabled: !!tenant?.id } }
  );

  const { data: availability, isLoading: loadAvail } = useGetPublicAvailability(
    tenant?.id || "",
    { date: selectedDate, serviceId: selectedService?.id },
    { query: { enabled: step === 3 && !!tenant?.id && !!selectedService && !!selectedDate } }
  );

  const bookMutation = useBookAppointment();
  const [isSuccess, setIsSuccess] = useState(false);

  const now = new Date();
  const today = startOfDay(now);
  const viewMonthDate = addMonths(startOfMonth(now), monthOffset);
  const viewMonthStart = startOfMonth(viewMonthDate);
  const viewMonthEnd = endOfMonth(viewMonthDate);
  const daysInView = eachDayOfInterval({ start: viewMonthStart, end: viewMonthEnd });
  const firstDayOfWeek = getDay(viewMonthStart);
  const monthLabel = format(viewMonthDate, "MMMM 'de' yyyy", { locale: ptBR });
  const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const availableDatesSet = new Set<string>(availableDatesData?.availableDates ?? []);

  const lightBase = { backgroundColor: 'hsl(40,33%,98%)', color: 'hsl(20,14%,16%)' } as React.CSSProperties;

  if (loadTenant) return (
    <div className="min-h-screen flex items-center justify-center" style={lightBase}>
      <div className="animate-pulse w-16 h-16 rounded-2xl" style={{ backgroundColor: '#7D2535' }} />
    </div>
  );
  if (tenantErr || !tenant) return (
    <div className="min-h-screen flex items-center justify-center text-xl" style={lightBase}>Salão não encontrado.</div>
  );

  const primaryColor = tenant.primaryColor || '#7D2535';
  const secondaryColor = tenant.secondaryColor || '#FAF7F5';

  // Theme adapts to the tenant's chosen background — works for light AND dark bg
  // so text/cards/header stay readable no matter what colors the user picks.
  const publicThemeVars = buildPublicTheme(primaryColor, secondaryColor);

  const handlePhotoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = MAX_PHOTOS - referencePhotos.length;
    const toProcess = files.slice(0, remaining);
    for (const file of toProcess) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: `Máximo ${MAX_FILE_SIZE_MB}MB por foto.`, variant: "destructive" });
        continue;
      }
      const base64 = await fileToBase64(file);
      setReferencePhotos(prev => [...prev, base64]);
      setPhotoPreviews(prev => [...prev, base64]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePhotoRemove = (index: number) => {
    setReferencePhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const validateClientData = () => {
    const newErrors: Record<string, string> = {};
    const nameTrimmed = clientData.name.trim();
    if (!nameTrimmed) newErrors.name = "Nome é obrigatório";
    else if (nameTrimmed.length < 2) newErrors.name = "Nome deve ter pelo menos 2 caracteres";
    else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(nameTrimmed)) newErrors.name = "Nome deve conter apenas letras";

    const phoneDigits = clientData.phone.replace(/\D/g, "");
    if (!clientData.phone) newErrors.phone = "WhatsApp é obrigatório";
    else if (phoneDigits.length < 10 || phoneDigits.length > 11) newErrors.phone = "Informe um número válido com DDD (ex: 11 99999-0000)";

    if (!clientData.age) {
      newErrors.age = "Idade é obrigatória";
    } else {
      const ageNum = Number(clientData.age);
      if (isNaN(ageNum) || !Number.isInteger(ageNum)) newErrors.age = "Idade deve ser um número inteiro";
      else if (ageNum < 13 || ageNum > 90) newErrors.age = "Idade deve ser entre 13 e 90 anos";
    }

    if (!clientData.hairDesc.trim()) newErrors.hairDesc = "Descreva a condição do seu cabelo";

    const cpfDigits = clientData.cpf.replace(/\D/g, "");
    if (!cpfDigits) newErrors.cpf = "CPF é obrigatório";
    else if (cpfDigits.length !== 11) newErrors.cpf = "CPF deve ter 11 dígitos";

    if (!clientData.payment) newErrors.payment = "Selecione uma forma de pagamento";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCpfLookup = async () => {
    const cpfDigits = clientData.cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      toast({ title: "CPF inválido", description: "Informe os 11 dígitos do CPF.", variant: "destructive" });
      return;
    }
    setLookupLoading(true);
    try {
      const res = await fetch(`${BASE}/api/clients/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.id, cpf: cpfDigits }),
      });
      if (res.ok) {
        const data = await res.json();
        setClientData((prev) => ({
          ...prev,
          name: data.name ?? prev.name,
          phone: data.phone ?? prev.phone,
          age: data.age ? String(data.age) : prev.age,
          hairDesc: data.hairDescription ?? prev.hairDesc,
        }));
        setLookupFound(true);
        setEditingProfile(false);
        toast({ title: "Dados carregados", description: "Confirme ou edite seus dados antes de continuar." });
      } else {
        setLookupFound(false);
        setEditingProfile(true);
        toast({ title: "Cadastro novo", description: "Não encontramos você — preencha seus dados abaixo." });
      }
    } catch {
      toast({ title: "Erro na busca", variant: "destructive" });
    } finally {
      setLookupLoading(false);
      setLookupDone(true);
    }
  };

  const handleBook = async () => {
    if (!validateClientData()) return;
    if (!paymentChoice) {
      toast({ title: "Escolha o pagamento", description: "Selecione SINAL, INTEIRA ou (no Pré-Agendamento) pagar depois.", variant: "destructive" });
      return;
    }
    try {
      await bookMutation.mutateAsync({
        data: {
          tenantId: tenant.id,
          serviceId: selectedService.id,
          clientName: clientData.name,
          clientPhone: clientData.phone,
          clientAge: Number(clientData.age) || undefined,
          hairDescription: clientData.hairDesc || undefined,
          referencePhotos,
          paymentMethod: clientData.payment as "pix" | "card" | "cash",
          braidSize,
          date: selectedDate,
          time: selectedTime,
          // Extra fields (not in OpenAPI but accepted by server)
          ...({
            clientCpf: clientData.cpf.replace(/\D/g, ""),
            bookingType,
            paymentChoice,
          } as any),
        } as any,
      });
      setIsSuccess(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Por favor, tente novamente.";
      toast({ title: "Erro ao agendar", description: msg, variant: "destructive" });
    }
  };

  const handleSkipPayment = async () => {
    if (!validateClientData()) return;
    try {
      await bookMutation.mutateAsync({
        data: {
          tenantId: tenant.id,
          serviceId: selectedService.id,
          clientName: clientData.name,
          clientPhone: clientData.phone,
          clientAge: Number(clientData.age) || undefined,
          hairDescription: clientData.hairDesc || undefined,
          referencePhotos,
          paymentMethod: clientData.payment as "pix" | "card" | "cash",
          braidSize,
          date: selectedDate,
          time: selectedTime,
          ...({
            clientCpf: clientData.cpf.replace(/\D/g, ""),
            bookingType,
            paymentChoice: "skip",
          } as any),
        } as any,
      });
      setIsSuccess(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Por favor, tente novamente.";
      toast({ title: "Erro ao agendar (teste)", description: msg, variant: "destructive" });
    }
  };

  const handleRestart = () => {
    setStep(0);
    setSelectedService(null);
    setBraidSize("mid_back");
    setSelectedDate("");
    setSelectedTime("");
    setMonthOffset(0);
    setReferencePhotos([]);
    setPhotoPreviews([]);
    setClientData({ name: "", phone: "", age: "", hairDesc: "", cpf: "", payment: "" });
    setErrors({});
    setIsSuccess(false);
    setBookingType("appointment");
    setPaymentChoice("");
    setLookupDone(false);
    setLookupFound(false);
    setEditingProfile(false);
  };

  const getPrice = () => selectedService ? (braidSize === 'mid_back' ? selectedService.priceSmall : selectedService.priceLarge) : 0;
  const depositValue = Math.round(getPrice() * 50) / 100;

  if (isSuccess) {
    const wppText = encodeURIComponent(`Olá ${tenant.name}! Acabei de agendar uma trança pelo sistema. Meu nome é ${clientData.name}.`);
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center" style={publicThemeVars}>
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 mx-auto shadow-2xl shadow-emerald-500/20">
          <CheckCircle className="w-12 h-12" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">Agendamento Solicitado!</h1>
        <p className="text-lg text-muted-foreground max-w-md mb-8">
          Seu horário para <strong>{format(new Date(selectedDate + "T12:00:00"), "dd/MM/yyyy")} às {selectedTime}</strong> foi reservado.
          O salão precisa confirmar para validar o agendamento.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {tenant.whatsapp && (
            <a href={`https://wa.me/${tenant.whatsapp.replace(/\D/g,'')}?text=${wppText}`} target="_blank" rel="noreferrer"
               className="bg-[#25D366] text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-[#1EBE5D] transition-all shadow-lg shadow-[#25D366]/30 flex items-center gap-3">
              Avisar no WhatsApp
            </a>
          )}
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg border-2 border-border bg-card hover:bg-secondary transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Fazer novo agendamento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={publicThemeVars}>
      {/* Header — uses page background so it blends with the chosen color */}
      <div className="bg-background border-b border-border/50 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 h-20 flex items-center gap-4">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="p-2 hover:bg-secondary rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
          )}
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} className="w-12 h-12 rounded-full object-cover border-2 border-primary/20" alt="Logo" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">{tenant.name.charAt(0)}</div>
          )}
          <div>
            <h1 className="text-xl font-bold font-display leading-tight">{tenant.name}</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Agendamento Online</p>
          </div>
        </div>
        {/* Progress bar — only for steps 1–4 */}
        <div className="h-1 bg-secondary w-full">
          <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: step === 0 ? "0%" : `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-32">
        <AnimatePresence mode="wait">

          {/* STEP 0 — Intro / Boas-vindas */}
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">Antes de começar</h2>
                <p className="text-muted-foreground text-lg max-w-md mx-auto">
                  Leia com atenção para garantir um agendamento tranquilo.
                </p>
              </div>

              <div className="space-y-4">

                {/* Agendamento vs Pré-Agendamento */}
                <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm">
                  <div className="flex gap-5 mb-4">
                    <div className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: hexToRgba(primaryColor, 0.1) }}>
                      <Banknote className="w-6 h-6" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground mb-1">Escolha como reservar seu horário</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        Você terá duas opções no final do agendamento.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-4 h-4 text-primary" />
                        <h4 className="font-bold text-foreground">Agendamento</h4>
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed">
                        Você paga <strong>SINAL (50%) ou o valor INTEIRO</strong> no ato do agendamento.
                        Só assim o horário fica garantido.
                      </p>
                    </div>
                    <div className="rounded-2xl border-2 border-amber-300/60 bg-amber-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ClockIcon className="w-4 h-4 text-amber-700" />
                        <h4 className="font-bold text-amber-900">Pré-Agendamento</h4>
                      </div>
                      <p className="text-xs text-amber-900/80 leading-relaxed">
                        Reserve agora sem pagar. Você tem até <strong>3 dias antes da data</strong> para
                        pagar o SINAL ou o valor INTEIRO. Sem pagamento até lá, o horário é liberado.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-secondary/40 px-3 py-2 rounded-xl">
                    <Search className="w-3.5 h-3.5 shrink-0" />
                    Já fez um Pré-Agendamento?{" "}
                    <Link href={`/pagar/${slug ?? ""}`} className="font-bold underline" style={{ color: primaryColor }}>
                      Pagar agora com CPF
                    </Link>
                  </div>
                </div>

                {/* Photos card */}
                <div className="bg-card border border-border/60 rounded-3xl p-6 flex gap-5 shadow-sm">
                  <div className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: hexToRgba(primaryColor, 0.1) }}>
                    <Camera className="w-6 h-6" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground mb-1">Fotos de referência — muito importante!</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                      Enviar fotos do estilo de trança que você deseja ajuda a trancista a se preparar e garantir o melhor resultado.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</div>
                        <p className="text-sm text-foreground"><strong>Mínimo 1 foto</strong> — qualquer referência já ajuda muito.</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5" style={{ background: hexToRgba(primaryColor, 0.15), color: primaryColor }}>3</div>
                        <p className="text-sm text-foreground"><strong>Ideal: 3 fotos</strong> — quanto mais referências, melhor o alinhamento de expectativas.</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">As fotos devem ser <strong className="text-foreground">coerentes com a trança escolhida</strong>. Evite referências de estilos muito diferentes do que será feito.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Optional notice */}
                <div className="bg-secondary/40 rounded-2xl px-5 py-3.5 flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Se não tiver uma foto de referência ideal no momento, <strong className="text-foreground">pode seguir sem</strong> — as fotos são opcionais.
                  </p>
                </div>
              </div>

              <div className="mt-10">
                <Button
                  size="lg"
                  className="w-full h-16 text-xl rounded-2xl shadow-lg"
                  onClick={() => setStep(1)}
                >
                  Começar agendamento
                  <ChevronRight className="w-6 h-6 ml-2" />
                </Button>
              </div>

              {publicReviews && publicReviews.length > 0 && (
                <div className="mt-12">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-2xl font-display font-bold text-foreground">
                      O que dizem as clientes
                    </h3>
                    <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-full">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      <span className="text-sm font-bold text-amber-900">
                        {(publicReviews.reduce((acc, r) => acc + r.rating, 0) / publicReviews.length).toFixed(1)}
                      </span>
                      <span className="text-xs text-amber-800">({publicReviews.length})</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {publicReviews.slice(0, 6).map((r) => (
                      <div key={r.id} className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`}
                            />
                          ))}
                        </div>
                        {r.comment && (
                          <p className="text-foreground text-sm italic line-clamp-4 mb-2">"{r.comment}"</p>
                        )}
                        <p className="text-xs font-semibold text-muted-foreground">— {r.clientName}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 1 — Choose Service */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl sm:text-3xl font-display font-bold mb-6">1. Qual serviço você deseja?</h2>
              <div className="space-y-4">
                {services?.filter(s => s.active).map((service: any) => {
                  const photos: string[] = Array.isArray(service.referencePhotos) ? service.referencePhotos : [];
                  return (
                    <div
                      key={service.id}
                      onClick={() => { setSelectedService(service); setStep(2); }}
                      className="bg-card p-6 rounded-3xl border-2 border-border/50 hover:border-primary cursor-pointer transition-all shadow-md hover:shadow-xl group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{service.name}</h3>
                          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{service.description}</p>
                          <span className="bg-secondary text-secondary-foreground text-xs font-bold px-2 py-1 rounded-md">
                            Duração: ~{service.durationHours}h
                          </span>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <span className="text-xs text-muted-foreground block">A partir de</span>
                          <span className="text-xl font-bold text-foreground">{formatCurrency(service.priceSmall)}</span>
                        </div>
                      </div>
                      {photos.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pt-3 border-t border-border/40 -mx-1 px-1">
                          {photos.slice(0, 4).map((src, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openLightbox(photos, i, service.name); }}
                              className="relative w-20 h-20 rounded-xl border border-border shrink-0 overflow-hidden group/img cursor-zoom-in"
                              aria-label={`Ver foto ${i + 1} em tela cheia`}
                            >
                              <img
                                src={src}
                                alt={`${service.name} exemplo ${i + 1}`}
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform group-hover/img:scale-110"
                              />
                              {i === 3 && photos.length > 4 && (
                                <div className="absolute inset-0 bg-black/60 text-white text-sm font-bold flex items-center justify-center">
                                  +{photos.length - 4}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 2 — Choose Size */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl sm:text-3xl font-display font-bold mb-2">2. Qual o tamanho?</h2>
              <p className="text-muted-foreground mb-8 text-lg">O tamanho influencia no valor e tempo do serviço.</p>

              {selectedService && Array.isArray(selectedService.referencePhotos) && selectedService.referencePhotos.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Fotos do serviço (toque para ampliar)</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {(selectedService.referencePhotos as string[]).map((src, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => openLightbox(selectedService.referencePhotos, i, selectedService.name)}
                        className="w-24 h-24 rounded-2xl border border-border shrink-0 overflow-hidden cursor-zoom-in hover:ring-2 hover:ring-primary/40 transition-all"
                        aria-label={`Ver foto ${i + 1} em tela cheia`}
                      >
                        <img src={src} alt={`${selectedService.name} ${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setBraidSize('mid_back')}
                  className={`p-6 rounded-3xl border-2 text-left transition-all ${braidSize === 'mid_back' ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-border bg-card hover:border-primary/50'}`}
                >
                  <h3 className="text-xl font-bold mb-2">Até o meio das costas</h3>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(selectedService?.priceSmall)}</p>
                </button>
                <button
                  onClick={() => setBraidSize('waist_butt')}
                  className={`p-6 rounded-3xl border-2 text-left transition-all ${braidSize === 'waist_butt' ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-border bg-card hover:border-primary/50'}`}
                >
                  <h3 className="text-xl font-bold mb-2">Até a cintura / Bumbum</h3>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(selectedService?.priceLarge)}</p>
                </button>
              </div>

              <div className="mt-12 flex justify-end">
                <Button size="lg" className="rounded-full px-8 text-lg" onClick={() => setStep(3)}>
                  Avançar <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3 — Choose Date & Time */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl sm:text-3xl font-display font-bold mb-6">3. Escolha Data e Hora</h2>

              {/* Calendar */}
              <div className="bg-card rounded-3xl border border-border shadow-md overflow-hidden mb-8">
                <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-5 border-b border-border/50">
                  <button
                    onClick={() => { setMonthOffset(0); setSelectedDate(""); setSelectedTime(""); }}
                    disabled={monthOffset === 0}
                    className="p-2 rounded-xl hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-base sm:text-lg font-bold text-center truncate min-w-0 flex-1">{capitalizedMonth}</h3>
                  <button
                    onClick={() => { setMonthOffset(Math.min(2, monthOffset + 1)); setSelectedDate(""); setSelectedTime(""); }}
                    disabled={monthOffset === 2}
                    className="p-2 rounded-xl hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-7 px-3 pt-3">
                  {WEEK_DAYS.map(d => (
                    <div key={d} className="text-center text-xs font-bold text-muted-foreground uppercase tracking-wider py-2">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 p-3 pb-5">
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {daysInView.map(day => {
                    const dateStr = toDateStr(day);
                    const isPast = isBefore(startOfDay(day), today);
                    const isAvailable = !isPast && availableDatesSet.has(dateStr);
                    const isSelected = selectedDate === dateStr;
                    const isTodayDay = isToday(day);
                    const isDisabled = isPast || !isAvailable;

                    return (
                      <button
                        key={dateStr}
                        onClick={() => {
                          if (isDisabled) return;
                          setSelectedDate(dateStr);
                          setSelectedTime("");
                        }}
                        disabled={isDisabled}
                        className={`
                          relative aspect-square flex items-center justify-center rounded-xl text-sm font-bold transition-all duration-150
                          ${isDisabled
                            ? "text-muted-foreground/30 cursor-not-allowed"
                            : isSelected
                              ? "text-primary-foreground shadow-lg scale-105"
                              : isTodayDay
                                ? "ring-2 ring-primary text-foreground hover:bg-primary/10 cursor-pointer"
                                : "text-foreground hover:bg-secondary cursor-pointer"
                          }
                        `}
                        style={
                          isSelected
                            ? { background: primaryColor }
                            : isAvailable && !isSelected
                              ? { background: hexToRgba(primaryColor, 0.08) }
                              : undefined
                        }
                      >
                        {format(day, "d")}
                        {isTodayDay && !isSelected && (
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="px-6 pb-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t border-border/40 pt-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-sm inline-block" style={{ background: primaryColor }} />
                    Selecionado
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-sm inline-block" style={{ background: hexToRgba(primaryColor, 0.08), border: `1px solid ${hexToRgba(primaryColor, 0.2)}` }} />
                    Disponível
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-sm bg-muted-foreground/15 inline-block" />
                    Indisponível
                  </span>
                </div>
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div>
                  <h3 className="font-bold text-lg mb-4">
                    Horários disponíveis — {format(new Date(selectedDate + "T12:00:00"), "dd 'de' MMMM", { locale: ptBR })}
                  </h3>
                  {loadAvail ? (
                    <div className="animate-pulse flex gap-3">
                      <div className="w-24 h-12 bg-secondary rounded-xl"/>
                      <div className="w-24 h-12 bg-secondary rounded-xl"/>
                      <div className="w-24 h-12 bg-secondary rounded-xl"/>
                    </div>
                  ) : availability?.slots?.length === 0 ? (
                    <div className="p-6 text-center bg-destructive/10 text-destructive rounded-2xl font-bold text-sm">
                      Nenhum horário disponível para esta data.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {availability?.slots.map(slot => (
                        <button
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className={`h-12 rounded-xl font-bold transition-all border-2 ${selectedTime === slot ? 'text-primary-foreground shadow-lg scale-105' : 'bg-card border-border hover:border-primary/50'}`}
                          style={selectedTime === slot ? { background: primaryColor, borderColor: primaryColor } : undefined}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!selectedDate && availableDatesSet.size === 0 && (
                <div className="p-6 text-center bg-secondary/50 rounded-2xl text-muted-foreground text-sm">
                  Nenhuma data disponível configurada para este salão.
                </div>
              )}

              <div className="mt-12 flex justify-end">
                <Button size="lg" className="rounded-full px-8 text-lg" disabled={!selectedTime} onClick={() => setStep(4)}>
                  Continuar <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 4 — Client Data */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl sm:text-3xl font-display font-bold mb-2">4. Seus Dados</h2>
              <p className="text-muted-foreground mb-8 text-lg">Último passo para garantir seu horário.</p>

              <div className="bg-card p-6 sm:p-8 rounded-[2rem] border border-border shadow-xl space-y-6">

                {/* CPF lookup */}
                <div className="bg-secondary/30 border border-border rounded-2xl p-4">
                  <label className="text-sm font-semibold mb-1 block">CPF <span className="text-destructive">*</span></label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Se já agendou aqui antes, vamos carregar seus dados automaticamente.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      inputMode="numeric"
                      value={clientData.cpf}
                      onChange={e => { setClientData({...clientData, cpf: e.target.value.replace(/\D/g,"").slice(0,11)}); setLookupDone(false); setLookupFound(false); if (errors.cpf) setErrors(p => ({...p, cpf: ""})); }}
                      placeholder="Somente números (11 dígitos)"
                      className={errors.cpf ? "border-destructive focus:ring-destructive/20" : ""}
                    />
                    <Button type="button" variant="outline" onClick={handleCpfLookup} disabled={lookupLoading || clientData.cpf.replace(/\D/g,"").length !== 11}>
                      <Search className="w-4 h-4 mr-1" />
                      {lookupLoading ? "Buscando..." : "Buscar"}
                    </Button>
                  </div>
                  {errors.cpf && <p className="text-destructive text-xs mt-1 font-medium">{errors.cpf}</p>}
                  {lookupDone && lookupFound && !editingProfile && (
                    <div className="mt-3 flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-sm text-emerald-900">
                      <span>Dados carregados! Confira abaixo.</span>
                      <button type="button" onClick={() => setEditingProfile(true)} className="font-bold underline">Editar</button>
                    </div>
                  )}
                  {lookupDone && !lookupFound && (
                    <p className="text-xs text-muted-foreground mt-2">Cadastro novo — preencha seus dados.</p>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="text-sm font-semibold mb-1 block">Nome Completo <span className="text-destructive">*</span></label>
                  <Input
                    value={clientData.name}
                    onChange={e => { setClientData({...clientData, name: e.target.value}); if (errors.name) setErrors(p => ({...p, name: ""})); }}
                    placeholder="Maria Silva"
                    className={errors.name ? "border-destructive focus:ring-destructive/20" : ""}
                  />
                  {errors.name && <p className="text-destructive text-xs mt-1 font-medium">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Phone */}
                  <div>
                    <label className="text-sm font-semibold mb-1 block">WhatsApp <span className="text-destructive">*</span></label>
                    <Input
                      value={clientData.phone}
                      onChange={e => { setClientData({...clientData, phone: e.target.value}); if (errors.phone) setErrors(p => ({...p, phone: ""})); }}
                      placeholder="(11) 90000-0000"
                      className={errors.phone ? "border-destructive focus:ring-destructive/20" : ""}
                    />
                    {errors.phone && <p className="text-destructive text-xs mt-1 font-medium">{errors.phone}</p>}
                  </div>
                  {/* Age */}
                  <div>
                    <label className="text-sm font-semibold mb-1 block">Idade <span className="text-destructive">*</span></label>
                    <Input
                      type="number"
                      value={clientData.age}
                      onChange={e => { setClientData({...clientData, age: e.target.value}); if (errors.age) setErrors(p => ({...p, age: ""})); }}
                      placeholder="25"
                      min={13}
                      max={90}
                      className={errors.age ? "border-destructive focus:ring-destructive/20" : ""}
                    />
                    {errors.age && <p className="text-destructive text-xs mt-1 font-medium">{errors.age}</p>}
                  </div>
                </div>

                {/* Hair description */}
                <div>
                  <label className="text-sm font-semibold mb-1 block">Condição do seu cabelo <span className="text-destructive">*</span></label>
                  <textarea
                    className={`flex min-h-[80px] w-full rounded-xl border-2 bg-background/50 px-4 py-2 focus:ring-4 outline-none transition-all resize-none ${errors.hairDesc ? "border-destructive focus:ring-destructive/10" : "border-border/50 focus:border-primary focus:ring-primary/10"}`}
                    value={clientData.hairDesc}
                    onChange={e => { setClientData({...clientData, hairDesc: e.target.value}); if (errors.hairDesc) setErrors(p => ({...p, hairDesc: ""})); }}
                    placeholder="Ex: cabelo natural, sem química, comprimento médio..."
                  />
                  {errors.hairDesc && <p className="text-destructive text-xs mt-1 font-medium">{errors.hairDesc}</p>}
                </div>

                {/* Reference Photos */}
                <div>
                  <label className="text-sm font-semibold mb-1 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Fotos de Referência <span className="text-muted-foreground font-normal text-xs">(até {MAX_PHOTOS} fotos — opcional)</span>
                  </label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Envie fotos do estilo de trança que você deseja para ajudar a trancista a se preparar.
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    {photoPreviews.map((src, idx) => (
                      <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-md group">
                        <img src={src} alt={`Referência ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => handlePhotoRemove(idx)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5 text-white" />
                        </button>
                        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{idx + 1}</div>
                      </div>
                    ))}
                    {referencePhotos.length < MAX_PHOTOS && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-24 h-24 rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-secondary/40 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 transition-all group"
                      >
                        <ImagePlus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                          {photoPreviews.length === 0 ? "Adicionar" : "Mais"}
                        </span>
                      </button>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handlePhotoAdd} />
                  {referencePhotos.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {referencePhotos.length} de {MAX_PHOTOS} foto{referencePhotos.length > 1 ? "s" : ""} adicionada{referencePhotos.length > 1 ? "s" : ""}.
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Forma de Pagamento <span className="text-destructive">*</span>
                  </label>
                  <div className="flex gap-3">
                    {(['pix', 'card', 'cash'] as const).map(method => (
                      <button
                        key={method}
                        onClick={() => { setClientData({...clientData, payment: method}); if (errors.payment) setErrors(p => ({...p, payment: ""})); }}
                        className={`flex-1 py-3 rounded-xl border-2 font-bold uppercase text-sm transition-all ${clientData.payment === method ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:border-primary/30'}`}
                      >
                        {method === 'pix' ? 'Pix' : method === 'card' ? 'Cartão' : 'Dinheiro'}
                      </button>
                    ))}
                  </div>
                  {errors.payment && <p className="text-destructive text-xs mt-1 font-medium">{errors.payment}</p>}
                </div>
              </div>

              {/* Booking type selector */}
              <div className="mt-8 bg-card p-6 rounded-[2rem] border border-border shadow-xl">
                <h3 className="font-bold text-lg mb-1">Tipo de reserva</h3>
                <p className="text-xs text-muted-foreground mb-4">Escolha como deseja garantir seu horário.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setBookingType("appointment"); if (paymentChoice === "later") setPaymentChoice(""); }}
                    className={`text-left rounded-2xl border-2 p-4 transition-all ${bookingType === "appointment" ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/40"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="w-4 h-4 text-primary" />
                      <h4 className="font-bold">Agendamento</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">Pago agora (SINAL 50% ou INTEIRA). Horário garantido na hora.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingType("pre_appointment")}
                    className={`text-left rounded-2xl border-2 p-4 transition-all ${bookingType === "pre_appointment" ? "border-amber-500 bg-amber-50 ring-2 ring-amber-300/40" : "border-border hover:border-amber-400/40"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ClockIcon className="w-4 h-4 text-amber-700" />
                      <h4 className="font-bold">Pré-Agendamento</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">Reserve sem pagar. Pague até 3 dias antes da data, senão expira.</p>
                  </button>
                </div>

                {/* Payment choice */}
                <div className="mt-6">
                  <h4 className="font-bold text-sm mb-2 uppercase tracking-wide text-muted-foreground">
                    {bookingType === "appointment" ? "Pagamento (obrigatório agora)" : "Pagamento"}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentChoice("deposit")}
                      className={`rounded-2xl border-2 p-4 text-left transition-all ${paymentChoice === "deposit" ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-border hover:border-primary/30"}`}
                    >
                      <p className="font-bold text-foreground">SINAL (50%)</p>
                      <p className="text-lg font-bold" style={{ color: primaryColor }}>{formatCurrency(depositValue)}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Pague metade agora, o restante no dia.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentChoice("full")}
                      className={`rounded-2xl border-2 p-4 text-left transition-all ${paymentChoice === "full" ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-border hover:border-primary/30"}`}
                    >
                      <p className="font-bold text-foreground">INTEIRA</p>
                      <p className="text-lg font-bold" style={{ color: primaryColor }}>{formatCurrency(getPrice())}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Pague o valor total agora.</p>
                    </button>
                    {bookingType === "pre_appointment" && (
                      <button
                        type="button"
                        onClick={() => setPaymentChoice("later")}
                        className={`rounded-2xl border-2 p-4 text-left transition-all ${paymentChoice === "later" ? "border-amber-500 bg-amber-50 ring-2 ring-amber-300/40" : "border-border hover:border-amber-400/40"}`}
                      >
                        <p className="font-bold text-foreground">Pagar depois</p>
                        <p className="text-xs text-amber-800 mt-1">Reserve agora, pague até 3 dias antes pela área "Pagar com CPF".</p>
                      </button>
                    )}
                  </div>
                  {bookingType === "pre_appointment" && (
                    <div className="mt-3 flex items-start gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>Sem pagamento até <strong>3 dias antes da data</strong>, seu horário é liberado automaticamente.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Summary */}
              <div className="mt-8 bg-secondary/50 rounded-3xl p-6 border border-border">
                <h3 className="font-bold text-lg mb-4">Resumo do Agendamento</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Serviço:</span> <span className="font-bold">{selectedService.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tamanho:</span> <span className="font-bold">{braidSize === 'mid_back' ? 'Costas' : 'Cintura'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Data/Hora:</span> <span className="font-bold text-primary">{format(new Date(selectedDate + "T12:00:00"), "dd/MM")} às {selectedTime}</span></div>
                  {referencePhotos.length > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Fotos:</span> <span className="font-bold">{referencePhotos.length} foto{referencePhotos.length > 1 ? "s" : ""}</span></div>
                  )}
                  <div className="pt-4 mt-4 border-t border-border flex justify-between items-center">
                    <span className="text-lg font-bold">Total estimado:</span>
                    <span className="text-2xl font-display font-bold text-primary">{formatCurrency(getPrice())}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <Button size="lg" className="w-full h-16 text-xl rounded-2xl shadow-xl shadow-primary/30" onClick={handleBook} disabled={bookMutation.isPending || !paymentChoice}>
                  {bookMutation.isPending
                    ? "Agendando..."
                    : paymentChoice === "later"
                      ? "Confirmar Pré-Agendamento"
                      : paymentChoice === "full"
                        ? `Pagar INTEIRA ${formatCurrency(getPrice())} e Agendar`
                        : paymentChoice === "deposit"
                          ? `Pagar SINAL ${formatCurrency(depositValue)} e Agendar`
                          : "Selecione o pagamento acima"}
                </Button>

                {/* TEST-ONLY skip button — remove before launch */}
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-2xl border-2 border-dashed border-amber-400 text-amber-800 hover:bg-amber-50"
                  onClick={handleSkipPayment}
                  disabled={bookMutation.isPending}
                >
                  ⚠️ TESTE — pular pagamento e agendar mesmo assim
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Fullscreen image lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Visualização de imagem em tela cheia"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-colors"
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Counter / title */}
          <div className="absolute top-4 left-4 z-10 text-white bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-sm font-semibold">
            {lightbox.title ? `${lightbox.title} — ` : ""}
            {lightbox.index + 1} / {lightbox.images.length}
          </div>

          {/* Prev button */}
          {lightbox.images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
              className="absolute left-2 sm:left-6 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-colors"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          )}

          {/* Image */}
          <img
            src={lightbox.images[lightbox.index]}
            alt={`${lightbox.title ?? "Foto"} ${lightbox.index + 1}`}
            className="max-w-[92vw] max-h-[88vh] object-contain select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          {/* Next button */}
          {lightbox.images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
              className="absolute right-2 sm:right-6 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-colors"
              aria-label="Próxima imagem"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          )}

          {/* Thumbnail strip */}
          {lightbox.images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[92vw] overflow-x-auto px-2 py-2 bg-white/5 backdrop-blur-md rounded-2xl">
              {lightbox.images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightbox(lb => lb ? { ...lb, index: i } : lb); }}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${i === lightbox.index ? "border-white scale-105" : "border-transparent opacity-60 hover:opacity-100"}`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
