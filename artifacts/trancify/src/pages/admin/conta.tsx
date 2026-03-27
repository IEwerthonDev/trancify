import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useChangePassword, useChangeEmail } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-semibold text-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

export default function AdminContaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const changePasswordMutation = useChangePassword();
  const changeEmailMutation = useChangeEmail();

  const [emailForm, setEmailForm] = useState({
    currentPassword: "",
    newEmail: "",
    confirmEmail: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChangeEmail = async () => {
    if (!emailForm.newEmail) {
      toast({ title: "Informe o novo e-mail", variant: "destructive" });
      return;
    }
    if (emailForm.newEmail !== emailForm.confirmEmail) {
      toast({ title: "Os e-mails não coincidem", variant: "destructive" });
      return;
    }
    if (!emailForm.currentPassword) {
      toast({ title: "Informe sua senha atual para confirmar", variant: "destructive" });
      return;
    }
    try {
      await changeEmailMutation.mutateAsync({
        data: {
          currentPassword: emailForm.currentPassword,
          newEmail: emailForm.newEmail,
        },
      });
      toast({ title: "E-mail alterado com sucesso!", description: "Faça login novamente com o novo e-mail." });
      setEmailForm({ currentPassword: "", newEmail: "", confirmEmail: "" });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "";
      if (msg.includes("uso")) {
        toast({ title: "E-mail já em uso", description: "Escolha outro endereço.", variant: "destructive" });
      } else if (msg.includes("incorreta") || err?.response?.status === 401) {
        toast({ title: "Senha atual incorreta", variant: "destructive" });
      } else {
        toast({ title: "Erro ao alterar e-mail", variant: "destructive" });
      }
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast({ title: "Nova senha deve ter pelo menos 8 caracteres", variant: "destructive" });
      return;
    }
    try {
      await changePasswordMutation.mutateAsync({
        data: {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
      });
      toast({ title: "Senha alterada com sucesso!" });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      toast({ title: "Erro ao alterar senha. Verifique a senha atual.", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-10">
        <h1 className="text-4xl font-display font-bold text-foreground">Minha Conta</h1>
        <p className="text-muted-foreground mt-2 text-lg">Gerencie seu acesso e credenciais de administrador.</p>
      </div>

      <div className="max-w-xl space-y-8">
        {/* Current account info */}
        <div className="bg-primary/5 rounded-[2rem] p-6 border border-primary/20 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Conta atual</p>
            <p className="font-bold text-foreground text-lg">{user?.email}</p>
            <p className="text-sm text-primary font-semibold">Super Administrador</p>
          </div>
        </div>

        {/* Change Email Card */}
        <div className="bg-card p-8 rounded-[2rem] border border-border/50 shadow-xl shadow-black/5">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-display font-bold">Alterar E-mail</h2>
          </div>

          <div className="space-y-5">
            <Field label="Novo e-mail">
              <Input
                type="email"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                placeholder="novo@email.com"
                className="h-12"
              />
            </Field>
            <Field label="Confirmar novo e-mail">
              <Input
                type="email"
                value={emailForm.confirmEmail}
                onChange={(e) => setEmailForm({ ...emailForm, confirmEmail: e.target.value })}
                placeholder="Repita o novo e-mail"
                className="h-12"
              />
            </Field>
            <Field label="Senha atual (para confirmar)">
              <Input
                type="password"
                value={emailForm.currentPassword}
                onChange={(e) => setEmailForm({ ...emailForm, currentPassword: e.target.value })}
                placeholder="••••••••"
                className="h-12"
              />
            </Field>
            <Button
              size="lg"
              className="px-8 h-12 rounded-xl bg-blue-600 hover:bg-blue-700"
              onClick={handleChangeEmail}
              disabled={changeEmailMutation.isPending}
            >
              {changeEmailMutation.isPending ? "Alterando..." : "Alterar E-mail"}
            </Button>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-card p-8 rounded-[2rem] border border-border/50 shadow-xl shadow-black/5">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-display font-bold">Alterar Senha</h2>
          </div>

          <div className="space-y-5">
            <Field label="Senha atual">
              <Input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="••••••••"
                className="h-12"
              />
            </Field>
            <Field label="Nova senha">
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                className="h-12"
              />
            </Field>
            <Field label="Confirmar nova senha">
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Repita a nova senha"
                className="h-12"
              />
            </Field>
            <Button
              size="lg"
              className="px-8 h-12 rounded-xl bg-amber-600 hover:bg-amber-700"
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? "Alterando..." : "Alterar Senha"}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
