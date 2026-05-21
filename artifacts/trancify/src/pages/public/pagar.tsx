import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useGetPublicTenant } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Search, CheckCircle, Clock, AlertTriangle, Wallet, ArrowLeft } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type PendingAppt = {
  id: string;
  serviceName: string;
  date: string;
  time: string;
  servicePrice: number;
  depositAmount: number;
  paidAmount: number;
  paymentStatus: "unpaid" | "deposit_paid" | "fully_paid";
  bookingType: "appointment" | "pre_appointment";
  depositDeadline: string | null;
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
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><div className="w-12 h-12 rounded-full border-4 border-stone-300 border-t-stone-700 animate-spin"/></div>;
  }
  if (tenantErr || !tenant) {
    return <div className="min-h-screen flex items-center justify-center text-xl bg-stone-50">Salão não encontrado.</div>;
  }

  const primaryColor = tenant.primaryColor || "#7D2535";

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
      toast({ title: "Pagamento confirmado!", description: type === "full" ? "Você pagou o valor inteiro." : "Sinal pago — horário garantido." });
      await handleSearch();
    } catch (err: any) {
      toast({ title: "Erro no pagamento", description: err?.message ?? "Tente novamente", variant: "destructive" });
    } finally {
      setPaying(null);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 h-20 flex items-center gap-4">
          <Link href={`/${slug}`} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} className="w-12 h-12 rounded-full object-cover border-2 border-stone-200" alt="Logo" />
          ) : (
            <div className="w-12 h-12 rounded-full text-white flex items-center justify-center font-bold text-xl" style={{ background: primaryColor }}>{tenant.name.charAt(0)}</div>
          )}
          <div>
            <h1 className="text-xl font-bold leading-tight">{tenant.name}</h1>
            <p className="text-xs text-stone-500 uppercase tracking-widest font-semibold">Pagamento com CPF</p>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-24 space-y-6">
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-2">Pague seu sinal ou valor inteiro</h2>
          <p className="text-stone-600 text-sm mb-5">
            Tem um <strong>Pré-Agendamento</strong> aguardando pagamento? Digite seu CPF para localizar e finalizar.
          </p>
          <div className="flex gap-2">
            <Input
              inputMode="numeric"
              value={cpf}
              onChange={(e) => setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="Digite seu CPF (11 dígitos)"
              className="text-lg h-12"
            />
            <Button onClick={handleSearch} disabled={loading || cpf.replace(/\D/g, "").length !== 11} className="h-12 px-5" style={{ background: primaryColor }}>
              <Search className="w-4 h-4 mr-1" />
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </div>

        {searched && results.length === 0 && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-1">Nenhum agendamento pendente</h3>
            <p className="text-stone-600 text-sm">
              Não encontramos agendamentos aguardando pagamento para este CPF.
              Se acha que isso é um erro, fale com o salão.
            </p>
          </div>
        )}

        {results.map((appt) => {
          const remaining = appt.servicePrice - appt.paidAmount;
          const dateLabel = format(parseISO(appt.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
          const deadlineLabel = appt.depositDeadline
            ? format(parseISO(appt.depositDeadline), "dd/MM/yyyy", { locale: ptBR })
            : null;
          const isLatePay = deadlineLabel && new Date(appt.depositDeadline!) < new Date(new Date().toISOString().slice(0, 10));
          return (
            <div key={appt.id} className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-lg">{appt.serviceName}</h3>
                  <p className="text-sm text-stone-600">{dateLabel} às {appt.time}</p>
                  {appt.bookingType === "pre_appointment" && deadlineLabel && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${isLatePay ? "text-red-600" : "text-amber-700"}`}>
                      <Clock className="w-3 h-3" />
                      Prazo para sinal: {deadlineLabel}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-stone-500">Valor do serviço</p>
                  <p className="text-xl font-bold" style={{ color: primaryColor }}>{formatCurrency(appt.servicePrice)}</p>
                </div>
              </div>

              {appt.paidAmount > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>
                    Já pago: <strong>{formatCurrency(appt.paidAmount)}</strong>
                    {remaining > 0 ? ` · Restam ${formatCurrency(remaining)}` : ""}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {appt.paymentStatus === "unpaid" && (
                  <Button
                    onClick={() => handlePay(appt, "deposit")}
                    disabled={paying === appt.id}
                    variant="outline"
                    className="h-14 border-2 rounded-2xl text-base font-bold"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    SINAL {formatCurrency(appt.depositAmount)}
                  </Button>
                )}
                {appt.paymentStatus !== "fully_paid" && (
                  <Button
                    onClick={() => handlePay(appt, "full")}
                    disabled={paying === appt.id}
                    className="h-14 rounded-2xl text-base font-bold text-white"
                    style={{ background: primaryColor }}
                  >
                    INTEIRA {formatCurrency(remaining > 0 ? remaining : appt.servicePrice)}
                  </Button>
                )}
              </div>

              <p className="text-[11px] text-stone-500 mt-3 text-center">
                Pagamento simulado para teste — em produção o gateway (Pix/Cartão) abrirá aqui.
              </p>
            </div>
          );
        })}
      </main>
    </div>
  );
}
