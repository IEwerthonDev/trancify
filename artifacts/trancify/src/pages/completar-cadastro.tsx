import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const WINE = "#6D1F3A";

export default function CompletarCadastroPage() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { login } = useAuth();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [ownerName, setOwnerName] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("Token inválido.");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${BASE}/api/auth/register/complete/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data.message ?? "Erro ao finalizar cadastro.");
          setStatus("error");
          return;
        }

        login(data.token, data.user);
        setOwnerName(data.user?.ownerName ?? "");
        setStatus("success");

        setTimeout(() => {
          setLocation("/dashboard");
        }, 3000);
      } catch {
        setErrorMsg("Erro de conexão. Verifique sua internet e tente novamente.");
        setStatus("error");
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: WINE }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-foreground">Trancify</span>
        </div>

        {status === "loading" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: `${WINE}18` }}
            >
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: WINE }} />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Finalizando cadastro…</h2>
            <p className="text-muted-foreground text-sm">Aguarde um momento.</p>
          </motion.div>
        )}

        {status === "success" && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: `${WINE}18` }}
            >
              <CheckCircle className="w-10 h-10" style={{ color: WINE }} />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Cadastro finalizado!</h2>
            <p className="text-muted-foreground mb-1">
              {ownerName ? `Bem-vinda ao Trancify, ${ownerName.split(" ")[0]}!` : "Bem-vinda ao Trancify!"}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Seu período de teste de 7 dias começou. Redirecionando para o painel…
            </p>
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Ops, algo deu errado</h2>
            <p className="text-muted-foreground text-sm mb-6">{errorMsg}</p>
            <div className="flex flex-col gap-3">
              <Link href="/cadastro">
                <Button className="w-full" style={{ background: WINE }}>
                  Fazer novo cadastro
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Fazer login
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
