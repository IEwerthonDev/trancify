import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetMyServices, useCreateService, useUpdateService, useDeleteService } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Scissors, Plus, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ServicosPage() {
  const { data: services, isLoading, refetch } = useGetMyServices();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Meus Serviços</h1>
          <p className="text-muted-foreground mt-2 text-lg">Gerencie os tipos de tranças e preços.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-full shadow-primary/30">
              <Plus className="w-5 h-5 mr-2" />
              Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Serviço</DialogTitle>
            </DialogHeader>
            <ServiceForm onSuccess={() => { setIsCreateOpen(false); refetch(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-secondary/50 rounded-3xl" />)}
        </div>
      ) : services?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-3xl border border-border/50 shadow-sm">
          <Scissors className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
          <h3 className="text-xl font-bold text-foreground mb-2">Nenhum serviço cadastrado</h3>
          <p className="text-muted-foreground mb-6">Adicione seu primeiro serviço para clientes poderem agendar.</p>
          <Button onClick={() => setIsCreateOpen(true)}>Criar Serviço</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {services?.map((service) => (
            <ServiceCard key={service.id} service={service} onUpdate={refetch} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

function ServiceCard({ service, onUpdate }: { service: any, onUpdate: () => void }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const deleteMutation = useDeleteService();
  const toggleStatusMutation = useUpdateService();
  const { toast } = useToast();

  const handleDelete = async () => {
    if(confirm("Tem certeza que deseja excluir este serviço?")) {
      await deleteMutation.mutateAsync({ id: service.id });
      toast({ title: "Serviço excluído" });
      onUpdate();
    }
  };

  const handleToggleActive = async () => {
    await toggleStatusMutation.mutateAsync({ 
      id: service.id, 
      data: { active: !service.active } 
    });
    toast({ title: service.active ? "Serviço desativado" : "Serviço ativado" });
    onUpdate();
  };

  return (
    <div className={`bg-card p-6 sm:p-8 rounded-[2rem] border-2 shadow-xl transition-all duration-300 ${service.active ? 'border-border/50 shadow-black/5 hover:border-primary/30' : 'border-dashed border-border opacity-70 grayscale-[0.5]'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-2xl font-bold font-display text-foreground">{service.name}</h3>
            {service.active ? 
              <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-md font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Ativo</span> : 
              <span className="bg-secondary text-muted-foreground text-xs px-2 py-1 rounded-md font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> Inativo</span>
            }
          </div>
          <p className="text-muted-foreground line-clamp-2">{service.description || "Sem descrição"}</p>
        </div>
        <div className="bg-secondary text-secondary-foreground font-bold px-3 py-1.5 rounded-xl text-sm whitespace-nowrap">
          {service.durationHours}h
        </div>
      </div>

      <div className="bg-background rounded-2xl p-4 mb-6 grid grid-cols-2 gap-4 border border-border/50">
        <div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Até o meio das costas</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(service.priceSmall)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Até a cintura/bumbum</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(service.priceLarge)}</p>
        </div>
      </div>

      <div className="flex gap-3 justify-end border-t border-border/50 pt-6">
        <Button variant="outline" size="sm" onClick={handleToggleActive}>
          {service.active ? "Desativar" : "Ativar"}
        </Button>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm"><Pencil className="w-4 h-4 mr-2"/> Editar</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Serviço</DialogTitle></DialogHeader>
            <ServiceForm initialData={service} onSuccess={() => { setIsEditOpen(false); onUpdate(); }} />
          </DialogContent>
        </Dialog>
        <Button variant="destructive" size="sm" className="bg-red-100 text-red-600 hover:bg-red-200 shadow-none border-0" onClick={handleDelete}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function ServiceForm({ initialData, onSuccess }: { initialData?: any, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    durationHours: initialData?.durationHours?.toString() || "4",
    priceSmall: initialData?.priceSmall?.toString() || "",
    priceLarge: initialData?.priceLarge?.toString() || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateService();
  const updateMutation = useUpdateService();
  const { toast } = useToast();

  const isPending = createMutation.isPending || updateMutation.isPending;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errs.name = "Nome deve ter pelo menos 2 caracteres";
    }
    const ps = Number(formData.priceSmall);
    if (!formData.priceSmall || isNaN(ps) || ps <= 0) {
      errs.priceSmall = "Informe um preço válido maior que zero";
    }
    const pl = Number(formData.priceLarge);
    if (!formData.priceLarge || isNaN(pl) || pl <= 0) {
      errs.priceLarge = "Informe um preço válido maior que zero";
    }
    if (!isNaN(ps) && !isNaN(pl) && pl < ps) {
      errs.priceLarge = "O preço maior deve ser igual ou maior que o preço menor";
    }
    const dur = Number(formData.durationHours);
    if (!formData.durationHours || isNaN(dur) || dur <= 0 || dur > 24) {
      errs.durationHours = "Duração deve ser entre 0.5 e 24 horas";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      durationHours: Number(formData.durationHours),
      priceSmall: Number(formData.priceSmall),
      priceLarge: Number(formData.priceLarge),
    };

    try {
      if (initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, data: payload });
        toast({ title: "Serviço atualizado com sucesso!" });
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "Serviço criado com sucesso!" });
      }
      onSuccess();
    } catch {
      toast({ title: "Erro ao salvar serviço", variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-semibold mb-1 block">Nome da Trança</label>
        <Input
          value={formData.name}
          onChange={e => { setFormData({...formData, name: e.target.value}); setErrors(p => ({...p, name: ""})); }}
          placeholder="Ex: Box Braids, Nagô..."
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
      </div>
      <div>
        <label className="text-sm font-semibold mb-1 block">Descrição <span className="text-muted-foreground font-normal">(opcional)</span></label>
        <textarea
          className="flex min-h-[80px] w-full rounded-xl border-2 border-border/50 bg-background/50 px-4 py-2 text-base focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10"
          value={formData.description}
          onChange={e => setFormData({...formData, description: e.target.value})}
          placeholder="Detalhes adicionais..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold mb-1 block">Preço — Meio das costas (R$)</label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={formData.priceSmall}
            onChange={e => { setFormData({...formData, priceSmall: e.target.value}); setErrors(p => ({...p, priceSmall: ""})); }}
            placeholder="150.00"
            className={errors.priceSmall ? "border-destructive" : ""}
          />
          {errors.priceSmall && <p className="text-xs text-destructive mt-1">{errors.priceSmall}</p>}
        </div>
        <div>
          <label className="text-sm font-semibold mb-1 block">Preço — Cintura/Bumbum (R$)</label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={formData.priceLarge}
            onChange={e => { setFormData({...formData, priceLarge: e.target.value}); setErrors(p => ({...p, priceLarge: ""})); }}
            placeholder="250.00"
            className={errors.priceLarge ? "border-destructive" : ""}
          />
          {errors.priceLarge && <p className="text-xs text-destructive mt-1">{errors.priceLarge}</p>}
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold mb-1 block">Duração média (horas)</label>
        <Input
          type="number"
          step="0.5"
          min="0.5"
          max="24"
          value={formData.durationHours}
          onChange={e => { setFormData({...formData, durationHours: e.target.value}); setErrors(p => ({...p, durationHours: ""})); }}
          className={errors.durationHours ? "border-destructive" : ""}
        />
        {errors.durationHours && <p className="text-xs text-destructive mt-1">{errors.durationHours}</p>}
      </div>
      <Button type="submit" className="w-full h-14 text-lg" disabled={isPending}>
        {isPending ? "Salvando..." : initialData ? "Salvar Alterações" : "Criar Serviço"}
      </Button>
    </form>
  );
}
