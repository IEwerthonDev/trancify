import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { apiGet, apiSend, type TenantReview } from "@/lib/api";
import { Star, Eye, EyeOff, Trash2, Check, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AvaliacoesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["reviews"],
    queryFn: () => apiGet<TenantReview[]>("/reviews"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { isApproved?: boolean; isPublic?: boolean } }) =>
      apiSend<TenantReview>("PATCH", `/reviews/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiSend("DELETE", `/reviews/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      toast({ title: "Avaliação removida" });
    },
  });

  const handleToggle = async (r: TenantReview, field: "isApproved" | "isPublic") => {
    const newValue = !r[field];
    const data: any = { [field]: newValue };
    // If unapproving, also unpublish
    if (field === "isApproved" && !newValue) data.isPublic = false;
    // If publishing, must be approved
    if (field === "isPublic" && newValue && !r.isApproved) data.isApproved = true;
    await updateMutation.mutateAsync({ id: r.id, data });
    toast({ title: "Avaliação atualizada" });
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-primary" />
          Avaliações
        </h1>
        <p className="text-muted-foreground mt-2 text-base sm:text-lg">
          Aprove e escolha quais avaliações aparecem na sua página pública.
        </p>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 text-sm text-foreground">
        💡 Apenas avaliações <strong>aprovadas e públicas</strong> aparecem na sua página de agendamento.
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-card rounded-2xl animate-pulse" />)}
        </div>
      ) : reviews?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-3xl border border-border/50">
          <MessageSquare className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Ainda não há avaliações. Após o agendamento concluído, suas clientes receberão um link para avaliar pelo WhatsApp.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews?.map((r) => (
            <div key={r.id} className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-lg text-foreground">{r.clientName}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">
                      {format(parseISO(r.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {r.isApproved && (
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">
                      Aprovada
                    </span>
                  )}
                  {r.isPublic && (
                    <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-md">
                      Pública
                    </span>
                  )}
                </div>
              </div>
              {r.comment && (
                <p className="text-foreground mb-4 italic">"{r.comment}"</p>
              )}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50">
                <Button
                  size="sm"
                  variant={r.isApproved ? "outline" : "default"}
                  onClick={() => handleToggle(r, "isApproved")}
                  disabled={updateMutation.isPending}
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  {r.isApproved ? "Desaprovar" : "Aprovar"}
                </Button>
                <Button
                  size="sm"
                  variant={r.isPublic ? "outline" : "default"}
                  onClick={() => handleToggle(r, "isPublic")}
                  disabled={updateMutation.isPending}
                >
                  {r.isPublic ? <EyeOff className="w-4 h-4 mr-1.5" /> : <Eye className="w-4 h-4 mr-1.5" />}
                  {r.isPublic ? "Ocultar do público" : "Tornar pública"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 ml-auto"
                  onClick={() => {
                    if (confirm("Tem certeza que deseja excluir esta avaliação?")) {
                      deleteMutation.mutate(r.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
