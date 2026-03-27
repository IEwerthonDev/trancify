import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useAdminGetTenants,
  useAdminCreateTenant,
  useAdminUpdateTenant,
  useAdminDeleteTenant,
  useAdminResetPassword,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, KeyRound, ExternalLink, Calendar, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function SubscriptionBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    trial:     { label: "Teste",     cls: "bg-blue-50 text-blue-700 border-blue-200" },
    active:    { label: "Ativa",     cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    cancelled: { label: "Cancelada", cls: "bg-secondary text-muted-foreground border-border" },
    expired:   { label: "Expirada",  cls: "bg-red-50 text-red-700 border-red-200" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "" };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}>
      {label}
    </span>
  );
}

export default function AdminTenants() {
  const { data: tenants, isLoading, refetch } = useAdminGetTenants();
  const { toast } = useToast();

  return (
    <DashboardLayout>
      <div className="mb-6 sm:mb-10 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-4xl font-display font-bold text-foreground">Trancistas</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-base sm:text-lg">
            Gerencie todas as profissionais cadastradas na plataforma.
          </p>
        </div>
        <CreateTenantDialog onCreated={refetch} />
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {isLoading
          ? [1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-card rounded-2xl border border-border/50 animate-pulse" />
            ))
          : tenants?.map((t: any) => (
              <TenantCard key={t.id} tenant={t} onUpdate={refetch} />
            ))}
        {!isLoading && (!tenants || tenants.length === 0) && (
          <div className="p-10 text-center text-muted-foreground bg-card rounded-2xl border border-border/50">
            Nenhuma trancista cadastrada ainda.
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card border border-border/50 rounded-3xl overflow-hidden shadow-xl shadow-black/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/50 border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                <th className="p-4 pl-6 font-semibold">Nome / Slug</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Assinatura</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Agendamentos</th>
                <th className="p-4 font-semibold">Cadastro</th>
                <th className="p-4 pr-6 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading
                ? [1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td colSpan={7} className="p-4">
                        <div className="h-8 bg-secondary/50 rounded-lg animate-pulse" />
                      </td>
                    </tr>
                  ))
                : tenants?.map((t: any) => (
                    <TenantRow key={t.id} tenant={t} onUpdate={refetch} />
                  ))}
            </tbody>
          </table>
          {!isLoading && (!tenants || tenants.length === 0) && (
            <div className="p-12 text-center text-muted-foreground">
              Nenhuma trancista cadastrada ainda.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function TenantCard({ tenant, onUpdate }: { tenant: any; onUpdate: () => void }) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
            {tenant.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">{tenant.name}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>/{tenant.slug}</span>
              <a href={`/${tenant.slug}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center">
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${tenant.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {tenant.status === "active" ? "Ativa" : "Bloqueada"}
        </span>
      </div>

      <div className="text-xs text-muted-foreground mb-3 space-y-1">
        <p className="truncate">{tenant.email}</p>
        <div className="flex items-center justify-between">
          <SubscriptionBadge status={tenant.subscriptionStatus ?? "trial"} />
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {tenant.totalAppointments} agendamentos
          </span>
        </div>
        <p>Cadastro: {format(parseISO(tenant.createdAt), "dd/MM/yyyy", { locale: ptBR })}</p>
      </div>

      <div className="flex items-center gap-1.5 pt-3 border-t border-border/50">
        <EditTenantDialog tenant={tenant} onUpdated={onUpdate} />
        <ResetPasswordDialog tenantId={tenant.id} tenantName={tenant.name} />
        <DeleteTenantDialog tenantId={tenant.id} tenantName={tenant.name} onDeleted={onUpdate} />
      </div>
    </div>
  );
}

function TenantRow({ tenant, onUpdate }: { tenant: any; onUpdate: () => void }) {
  return (
    <tr className="hover:bg-secondary/20 transition-colors">
      <td className="p-4 pl-6">
        <div className="font-bold text-foreground">{tenant.name}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          /{tenant.slug}
          <a href={`/${tenant.slug}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center">
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        </div>
      </td>
      <td className="p-4 text-sm text-muted-foreground">{tenant.email}</td>
      <td className="p-4">
        <SubscriptionBadge status={tenant.subscriptionStatus ?? "trial"} />
      </td>
      <td className="p-4">
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${tenant.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {tenant.status === "active" ? "Ativa" : "Bloqueada"}
        </span>
      </td>
      <td className="p-4 text-sm font-semibold">{tenant.totalAppointments}</td>
      <td className="p-4 text-sm text-muted-foreground">
        {format(parseISO(tenant.createdAt), "dd/MM/yyyy", { locale: ptBR })}
      </td>
      <td className="p-4 pr-6">
        <div className="flex justify-end gap-1.5">
          <EditTenantDialog tenant={tenant} onUpdated={onUpdate} />
          <ResetPasswordDialog tenantId={tenant.id} tenantName={tenant.name} />
          <DeleteTenantDialog tenantId={tenant.id} tenantName={tenant.name} onDeleted={onUpdate} />
        </div>
      </td>
    </tr>
  );
}

function CreateTenantDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", slug: "", whatsapp: "" });
  const createMutation = useAdminCreateTenant();
  const { toast } = useToast();

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({ data: form as any });
      toast({ title: "Trancista criada com sucesso!" });
      setOpen(false);
      setForm({ name: "", email: "", password: "", slug: "", whatsapp: "" });
      onCreated();
    } catch (e: any) {
      toast({
        title: "Erro ao criar",
        description: e?.response?.data?.message ?? "Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl h-11 px-5 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Nova Trancista
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Cadastrar Nova Trancista</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <Field label="Nome do Salão">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Salão da Maria" />
          </Field>
          <Field label="Slug (URL)">
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="Ex: maria" />
            {form.slug && <p className="text-xs text-muted-foreground mt-1">Página de agendamento: /{form.slug}</p>}
          </Field>
          <Field label="Email de acesso">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@salao.com" />
          </Field>
          <Field label="Senha inicial">
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 8 caracteres" />
          </Field>
          <Field label="WhatsApp (com DDI)">
            <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="5511999887766" />
          </Field>
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 flex items-center gap-2.5 text-sm text-blue-700 dark:text-blue-300">
            <Clock className="w-4 h-4 shrink-0" />
            A trancista iniciará com 7 dias de teste gratuito automaticamente.
          </div>
        </div>
        <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full sm:w-auto">
            {createMutation.isPending ? "Criando..." : "Criar Trancista"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditTenantDialog({ tenant, onUpdated }: { tenant: any; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: tenant.name ?? "",
    ownerName: tenant.ownerName ?? "",
    status: (tenant.status ?? "active") as "active" | "blocked",
    subscriptionStatus: (tenant.subscriptionStatus ?? "trial") as "trial" | "active" | "cancelled" | "expired",
    subscriptionPlan: (tenant.subscriptionPlan ?? "monthly") as "monthly" | "annual",
    whatsapp: tenant.whatsapp ?? "",
    birthDate: tenant.birthDate ?? "",
    cpf: tenant.cpf ?? "",
    address: tenant.address ?? "",
    cep: tenant.cep ?? "",
    city: tenant.city ?? "",
    state: tenant.state ?? "",
  });
  const updateMutation = useAdminUpdateTenant();
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ id: tenant.id, data: form as any });
      toast({ title: "Dados atualizados!" });
      setOpen(false);
      onUpdated();
    } catch {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Editar — {tenant.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">

          {/* Account info */}
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados da conta</p>
          <Field label="Nome do salão">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Nome da proprietária">
            <Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          </Field>
          <Field label="WhatsApp">
            <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="5511999887766" />
          </Field>

          {/* Status */}
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">Assinatura</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status da conta">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="active">Ativa</option>
                <option value="blocked">Bloqueada</option>
              </select>
            </Field>
            <Field label="Status da assinatura">
              <select
                value={form.subscriptionStatus}
                onChange={(e) => setForm({ ...form, subscriptionStatus: e.target.value as any })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="trial">Período de teste</option>
                <option value="active">Ativa</option>
                <option value="cancelled">Cancelada</option>
                <option value="expired">Expirada</option>
              </select>
            </Field>
          </div>
          <Field label="Plano">
            <select
              value={form.subscriptionPlan}
              onChange={(e) => setForm({ ...form, subscriptionPlan: e.target.value as any })}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="monthly">Mensal (R$ 50/mês)</option>
              <option value="annual">Anual (R$ 480/ano)</option>
            </select>
          </Field>

          {/* Personal info */}
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">Dados pessoais</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data de nascimento">
              <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
            </Field>
            <Field label="CPF">
              <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
            </Field>
          </div>

          {/* Address */}
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">Endereço</p>
          <Field label="CEP">
            <Input value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} placeholder="00000-000" />
          </Field>
          <Field label="Logradouro e bairro">
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cidade">
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="Estado (UF)">
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase().slice(0, 2) })} placeholder="SP" maxLength={2} />
            </Field>
          </div>

          {/* Card metadata (read-only) */}
          {tenant.cardLast4 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">Cartão cadastrado</p>
              <div className="bg-secondary/50 rounded-xl px-4 py-3 text-sm text-foreground">
                {tenant.cardBrand && <span className="font-medium">{tenant.cardBrand} </span>}
                •••• •••• •••• {tenant.cardLast4}
                {tenant.cardExpiryMonth && tenant.cardExpiryYear && (
                  <span className="text-muted-foreground ml-2">validade {tenant.cardExpiryMonth}/{String(tenant.cardExpiryYear).slice(-2)}</span>
                )}
              </div>
            </>
          )}

          {/* IP */}
          {tenant.registrationIp && (
            <p className="text-xs text-muted-foreground">IP de cadastro: <span className="font-mono">{tenant.registrationIp}</span></p>
          )}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const resetMutation = useAdminResetPassword();
  const { toast } = useToast();

  const handleReset = async () => {
    if (password.length < 8) {
      toast({ title: "Senha muito curta (mínimo 8 caracteres)", variant: "destructive" });
      return;
    }
    try {
      await resetMutation.mutateAsync({ id: tenantId, data: { newPassword: password } });
      toast({ title: "Senha redefinida!" });
      setOpen(false);
      setPassword("");
    } catch {
      toast({ title: "Erro ao redefinir senha", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-amber-600 hover:bg-amber-50">
          <KeyRound className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Redefinir Senha — {tenantName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <Field label="Nova Senha">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
          </Field>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleReset} disabled={resetMutation.isPending} className="bg-amber-600 hover:bg-amber-700">
            Redefinir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTenantDialog({ tenantId, tenantName, onDeleted }: { tenantId: string; tenantName: string; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const deleteMutation = useAdminDeleteTenant();
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ id: tenantId });
      toast({ title: "Trancista excluída" });
      setOpen(false);
      onDeleted();
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10">
          <Trash2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-destructive">Excluir Trancista</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mt-2">
          Tem certeza que deseja excluir <strong>{tenantName}</strong>? Esta ação é irreversível e remove todos os dados associados.
        </p>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-semibold mb-1.5 block text-foreground">{label}</label>
      {children}
    </div>
  );
}
