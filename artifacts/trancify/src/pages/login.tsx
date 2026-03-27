import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Sparkles, Moon, Sun, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const { login, isLoggingIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [, navigate] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ data: { email, password } });
    } catch (err: any) {
      toast({
        title: "Erro ao entrar",
        description: err?.message || "Credenciais inválidas. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top bar actions */}
        <div className="absolute top-5 left-5 right-5 z-20 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-all shadow-sm"
            aria-label="Alternar tema"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md relative z-10"
        >
          <div className="mb-10 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-display font-bold text-foreground mb-2 tracking-tight">Bem-vinda ao Trancify</h1>
            <p className="text-muted-foreground text-lg">A plataforma definitiva para trancistas.</p>
          </div>

          <div className="bg-card p-8 rounded-3xl shadow-xl shadow-black/5 border border-border/50">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground ml-1">Email</label>
                <Input 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-sm font-semibold text-foreground">Senha</label>
                </div>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
              <Button type="submit" className="w-full text-lg h-14" disabled={isLoggingIn}>
                {isLoggingIn ? "Entrando..." : "Entrar na minha conta"}
              </Button>
            </form>
          </div>
          
          <p className="text-center text-sm text-muted-foreground mt-8">
            Quer usar o Trancify no seu salão? <br/>
            <button onClick={() => navigate("/")} className="text-primary font-semibold hover:underline">
              Conheça a plataforma
            </button>
          </p>
        </motion.div>
      </div>

      {/* Right Image Side */}
      <div className="hidden lg:block lg:w-1/2 relative bg-primary">
        <img 
          src={`${import.meta.env.BASE_URL}images/login-hero.png`} 
          alt="Trancify Hero" 
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-16 left-16 right-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h2 className="text-4xl font-display font-bold text-white mb-4 leading-tight">
              Organize sua agenda.<br/>
              Valorize seu talento.
            </h2>
            <p className="text-white/80 text-lg max-w-lg">
              Simplifique agendamentos, acompanhe seu faturamento e ofereça a melhor experiência para suas clientes.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
