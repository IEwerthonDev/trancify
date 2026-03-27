import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetMyTenant, useUpdateMyTenant } from "@workspace/api-client-react";
import { useChangePassword, useChangeEmail } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Save, KeyRound, Mail, Store, ExternalLink, Palette, ChevronRight, Sparkles, Upload, Link, X, ImageIcon, Globe } from "lucide-react";
import { useUpload } from "@workspace/object-storage-web";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const DEFAULT_PRIMARY = "#7D2535";
const DEFAULT_SECONDARY = "#FAF7F5";

function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(125,37,53,${alpha})`;
  return `rgba(${parseInt(result[1]!, 16)},${parseInt(result[2]!, 16)},${parseInt(result[3]!, 16)},${alpha})`;
}

export default function ConfiguracoesPage() {
  const { data: tenant, isLoading } = useGetMyTenant();
  const updateMutation = useUpdateMyTenant();
  const changePasswordMutation = useChangePassword();
  const changeEmailMutation = useChangeEmail();
  const { toast } = useToast();

  const [profile, setProfile] = useState({
    name: "",
    slug: "",
    whatsapp: "",
    logoUrl: "",
    primaryColor: DEFAULT_PRIMARY,
    secondaryColor: DEFAULT_SECONDARY,
  });
  const [slugError, setSlugError] = useState("");

  const [emails, setEmails] = useState({
    currentPassword: "",
    newEmail: "",
    confirmEmail: "",
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (tenant) {
      setProfile({
        name: tenant.name ?? "",
        slug: tenant.slug ?? "",
        whatsapp: tenant.whatsapp ?? "",
        logoUrl: tenant.logoUrl ?? "",
        primaryColor: tenant.primaryColor ?? DEFAULT_PRIMARY,
        secondaryColor: (tenant as any).secondaryColor ?? DEFAULT_SECONDARY,
      });
    }
  }, [tenant]);

  const handleSlugChange = (value: string) => {
    const normalized = toSlug(value);
    setProfile((p) => ({ ...p, slug: normalized }));
    if (normalized.length > 0 && normalized.length < 3) {
      setSlugError("Mínimo 3 caracteres");
    } else if (normalized.length > 50) {
      setSlugError("Máximo 50 caracteres");
    } else if (normalized.length > 0 && !SLUG_REGEX.test(normalized)) {
      setSlugError("Use apenas letras minúsculas, números e hífens");
    } else {
      setSlugError("");
    }
  };

  const handleSaveProfile = async () => {
    if (slugError) return;
    if (profile.slug && !SLUG_REGEX.test(profile.slug)) {
      setSlugError("Link inválido");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        data: {
          name: profile.name,
          slug: profile.slug || undefined,
          whatsapp: profile.whatsapp || undefined,
          logoUrl: profile.logoUrl || undefined,
          primaryColor: profile.primaryColor,
          secondaryColor: profile.secondaryColor,
        } as any,
      });
      toast({ title: "Perfil atualizado com sucesso!" });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "";
      if (msg.includes("link") || msg.includes("slug") || err?.response?.status === 409) {
        setSlugError("Este link já está em uso. Escolha outro.");
        toast({ title: "Link já em uso", description: "Escolha outro endereço.", variant: "destructive" });
      } else {
        toast({ title: "Erro ao salvar perfil", variant: "destructive" });
      }
    }
  };

  const handleChangeEmail = async () => {
    if (!emails.newEmail) {
      toast({ title: "Informe o novo e-mail", variant: "destructive" });
      return;
    }
    if (emails.newEmail !== emails.confirmEmail) {
      toast({ title: "Os e-mails não coincidem", variant: "destructive" });
      return;
    }
    if (!emails.currentPassword) {
      toast({ title: "Informe sua senha atual para confirmar", variant: "destructive" });
      return;
    }
    try {
      await changeEmailMutation.mutateAsync({
        data: {
          currentPassword: emails.currentPassword,
          newEmail: emails.newEmail,
        },
      });
      toast({ title: "E-mail alterado com sucesso!", description: "Faça login novamente com o novo e-mail." });
      setEmails({ currentPassword: "", newEmail: "", confirmEmail: "" });
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
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    if (passwords.newPassword.length < 8) {
      toast({ title: "Nova senha deve ter pelo menos 8 caracteres", variant: "destructive" });
      return;
    }
    try {
      await changePasswordMutation.mutateAsync({
        data: {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        },
      });
      toast({ title: "Senha alterada com sucesso!" });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      toast({ title: "Erro ao alterar senha. Verifique a senha atual.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {[1, 2].map((i) => <div key={i} className="h-64 bg-card rounded-3xl border border-border/50 animate-pulse" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-10">
        <h1 className="text-4xl font-display font-bold text-foreground">Configurações do Salão</h1>
        <p className="text-muted-foreground mt-2 text-lg">Personalize seu perfil e a aparência da sua página.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">

          {/* Profile Card */}
          <div className="bg-card p-8 rounded-[2rem] border border-border/50 shadow-xl shadow-black/5">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Store className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-display font-bold">Perfil do Salão</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Field label="Nome do Salão">
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Ex: Salão da Naíra"
                    className="h-12 text-base"
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Link Público da Página">
                  <div className="flex items-stretch rounded-xl overflow-hidden border border-input focus-within:ring-2 focus-within:ring-ring/30 focus-within:border-primary/60 transition-all">
                    <div className="flex items-center px-3 bg-muted border-r border-input shrink-0">
                      <Globe className="w-4 h-4 text-muted-foreground mr-1.5" />
                      <span className="text-sm text-muted-foreground font-mono select-none">sualoja.com/</span>
                    </div>
                    <input
                      type="text"
                      value={profile.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="meu-salao"
                      spellCheck={false}
                      autoCorrect="off"
                      autoCapitalize="off"
                      className="flex-1 h-12 px-3 bg-background text-base font-mono text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    {profile.slug && !slugError && (
                      <a
                        href={`/${profile.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-3 text-primary hover:bg-primary/5 transition-colors"
                        title="Abrir página"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  {slugError ? (
                    <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                      <X className="w-3 h-3" /> {slugError}
                    </p>
                  ) : profile.slug ? (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Sua página ficará em <span className="font-semibold text-foreground">/{profile.slug}</span>
                    </p>
                  ) : null}
                </Field>
              </div>

              <Field label="WhatsApp (com DDI)">
                <Input
                  value={profile.whatsapp}
                  onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
                  placeholder="5511999887766"
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Usado para receber notificações de novos agendamentos.
                </p>
              </Field>

              <div className="md:col-span-2">
                <Field label="Logotipo do Salão">
                  <LogoUploader
                    value={profile.logoUrl}
                    onChange={(url) => setProfile({ ...profile, logoUrl: url })}
                  />
                </Field>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <Button
                size="lg"
                className="px-8 h-12 rounded-xl"
                onClick={handleSaveProfile}
                disabled={updateMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? "Salvando..." : "Salvar Perfil"}
              </Button>
              {tenant?.slug && (
                <a
                  href={`/${tenant.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary font-semibold hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ver página de agendamento
                </a>
              )}
            </div>
          </div>

          {/* Colors Card */}
          <div className="bg-card p-8 rounded-[2rem] border border-border/50 shadow-xl shadow-black/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-violet-100 rounded-xl text-violet-600">
                <Palette className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-display font-bold">Cores da Página</h2>
            </div>
            <p className="text-muted-foreground mb-8 text-sm">
              Escolha as cores que serão exibidas na sua página pública de agendamento.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Color pickers */}
              <div className="space-y-6">
                <ColorPicker
                  label="Cor Principal"
                  description="Botões, destaques e elementos interativos"
                  value={profile.primaryColor}
                  onChange={(v) => setProfile({ ...profile, primaryColor: v })}
                />
                <ColorPicker
                  label="Cor de Fundo"
                  description="Fundo da página de agendamento"
                  value={profile.secondaryColor}
                  onChange={(v) => setProfile({ ...profile, secondaryColor: v })}
                />

                {/* Quick presets */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Combinações prontas</p>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setProfile({ ...profile, primaryColor: preset.primary, secondaryColor: preset.secondary })}
                        title={preset.label}
                        className="w-8 h-8 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform flex items-center justify-center overflow-hidden"
                        style={{ background: `linear-gradient(135deg, ${preset.primary} 50%, ${preset.secondary} 50%)` }}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full h-12 rounded-xl"
                  onClick={handleSaveProfile}
                  disabled={updateMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateMutation.isPending ? "Salvando..." : "Salvar Cores"}
                </Button>
              </div>

              {/* Live Preview */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Preview da página</p>
                <BookingPreview
                  primaryColor={profile.primaryColor}
                  secondaryColor={profile.secondaryColor}
                  salonName={profile.name || tenant?.name || "Seu Salão"}
                />
              </div>
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

            <div className="space-y-5 max-w-md">
              <Field label="Novo e-mail">
                <Input
                  type="email"
                  value={emails.newEmail}
                  onChange={(e) => setEmails({ ...emails, newEmail: e.target.value })}
                  placeholder="novo@email.com"
                  className="h-12"
                />
              </Field>
              <Field label="Confirmar novo e-mail">
                <Input
                  type="email"
                  value={emails.confirmEmail}
                  onChange={(e) => setEmails({ ...emails, confirmEmail: e.target.value })}
                  placeholder="Repita o novo e-mail"
                  className="h-12"
                />
              </Field>
              <Field label="Senha atual (para confirmar)">
                <Input
                  type="password"
                  value={emails.currentPassword}
                  onChange={(e) => setEmails({ ...emails, currentPassword: e.target.value })}
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

            <div className="space-y-5 max-w-md">
              <Field label="Senha atual">
                <Input
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  placeholder="••••••••"
                  className="h-12"
                />
              </Field>
              <Field label="Nova senha">
                <Input
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="h-12"
                />
              </Field>
              <Field label="Confirmar nova senha">
                <Input
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
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

        {/* Info Sidebar */}
        <div className="space-y-6">
          <div className="bg-secondary/50 rounded-[2rem] p-8 border border-border">
            <h3 className="text-xl font-display font-bold mb-4">Sua Página Pública</h3>
            {tenant?.slug && (
              <>
                <div className="bg-background border border-border rounded-xl p-4 mb-4 font-mono text-sm text-primary break-all">
                  trancify.app/<strong>{tenant.slug}</strong>
                </div>
                <p className="text-sm text-muted-foreground">
                  Compartilhe este link com suas clientes para que elas possam agendar diretamente.
                </p>
              </>
            )}
          </div>

          <div className="bg-primary/5 rounded-[2rem] p-8 border border-primary/20">
            <h3 className="text-xl font-display font-bold mb-4 text-primary">Notificações WhatsApp</h3>
            <p className="text-sm text-muted-foreground">
              Quando o WhatsApp estiver configurado, você receberá uma mensagem automática com os dados do cliente e as fotos de referência sempre que um novo agendamento for feito.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function LogoUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [mode, setMode] = useState<"upload" | "url">(value && !value.startsWith("/api/") ? "url" : "upload");
  const [urlInput, setUrlInput] = useState(value && !value.startsWith("/api/") ? value : "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { uploadFile, isUploading, progress } = useUpload({
    basePath: "/api/storage",
    onSuccess: (response) => {
      const serveUrl = `/api/storage${response.objectPath}`;
      onChange(serveUrl);
      toast({ title: "Logo enviada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao enviar logo", variant: "destructive" });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Apenas imagens são permitidas", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Logo deve ter no máximo 5 MB", variant: "destructive" });
      return;
    }
    await uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      await handleFileChange(fakeEvent);
    }
  };

  const handleUrlApply = () => {
    onChange(urlInput.trim());
  };

  const handleRemove = () => {
    onChange("");
    setUrlInput("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isStorageUrl = value?.startsWith("/api/storage");
  const displayUrl = value || "";

  return (
    <div className="space-y-3">
      {/* Preview strip */}
      {displayUrl && (
        <div className="flex items-center gap-4 p-3 bg-secondary/50 rounded-xl border border-border">
          <img
            src={displayUrl}
            alt="Logo preview"
            className="w-16 h-16 rounded-xl object-contain border border-border bg-white"
            onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Logo atual</p>
            <p className="text-xs text-muted-foreground truncate max-w-xs">
              {isStorageUrl ? "Arquivo enviado" : displayUrl}
            </p>
          </div>
          <button onClick={handleRemove} className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setMode("upload")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all ${mode === "upload" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"}`}
        >
          <Upload className="w-4 h-4" />
          Enviar arquivo
        </button>
        <button
          onClick={() => setMode("url")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all ${mode === "url" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"}`}
        >
          <Link className="w-4 h-4" />
          Usar URL
        </button>
      </div>

      {mode === "upload" ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/3 transition-all group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          {isUploading ? (
            <div className="space-y-2">
              <div className="w-8 h-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Enviando... {Math.round(progress)}%</p>
              <div className="w-full bg-secondary rounded-full h-1.5">
                <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
                <ImageIcon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-sm font-semibold text-foreground">Arraste ou clique para enviar</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG — máximo 5 MB</p>
            </>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://exemplo.com/logo.png"
            className="flex-1 h-11"
            onKeyDown={(e) => e.key === "Enter" && handleUrlApply()}
          />
          <Button onClick={handleUrlApply} size="sm" className="h-11 px-4">
            Aplicar
          </Button>
        </div>
      )}
    </div>
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

function ColorPicker({ label, description, value, onChange }: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold mb-0.5 block">{label}</label>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      <div className="flex gap-3 items-center">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-12 rounded-xl border border-input cursor-pointer p-0.5 shrink-0"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 h-12 font-mono"
          maxLength={7}
        />
      </div>
    </div>
  );
}

const COLOR_PRESETS = [
  { label: "Vinho clássico", primary: "#7D2535", secondary: "#FAF7F5" },
  { label: "Rosa moderno", primary: "#C2185B", secondary: "#FFF0F5" },
  { label: "Roxo elegante", primary: "#6A1B9A", secondary: "#F8F4FF" },
  { label: "Azul profissional", primary: "#1565C0", secondary: "#F0F5FF" },
  { label: "Verde natural", primary: "#2E7D32", secondary: "#F0FFF4" },
  { label: "Marrom terroso", primary: "#5D4037", secondary: "#FDF6F0" },
  { label: "Laranja vibrante", primary: "#E65100", secondary: "#FFF8F0" },
  { label: "Preto & branco", primary: "#1A1A1A", secondary: "#FAFAFA" },
];

function BookingPreview({ primaryColor, secondaryColor, salonName }: {
  primaryColor: string;
  secondaryColor: string;
  salonName: string;
}) {
  const initial = salonName.charAt(0).toUpperCase();
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0);

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-lg" style={{ fontFamily: "inherit" }}>
      {/* Step tabs */}
      <div className="flex border-b border-border bg-secondary/30">
        {(["Início", "Serviço", "Tamanho"] as const).map((label, i) => (
          <button
            key={label}
            onClick={() => setActiveStep(i as 0 | 1 | 2)}
            className="flex-1 py-2 text-xs font-bold transition-all"
            style={activeStep === i ? { color: primaryColor, borderBottom: `2px solid ${primaryColor}`, background: hexToRgba(primaryColor, 0.05) } : { color: '#888' }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ background: secondaryColor }}>
        {/* Mini header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: primaryColor }}>
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-gray-800 truncate">{salonName}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Agendamento Online</div>
          </div>
          {/* Progress bar */}
          <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ background: primaryColor, width: activeStep === 0 ? "0%" : activeStep === 1 ? "25%" : "50%" }} />
          </div>
        </div>

        {/* Step 0 — Intro */}
        {activeStep === 0 && (
          <div className="p-4 space-y-3">
            <div className="text-center py-2">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-2" style={{ background: hexToRgba(primaryColor, 0.1) }}>
                <Sparkles className="w-5 h-5" style={{ color: primaryColor }} />
              </div>
              <div className="text-sm font-bold text-gray-800">Antes de começar</div>
              <div className="text-xs text-gray-400 mt-0.5">Leia as informações abaixo</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3 flex gap-3">
              <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{ background: hexToRgba(primaryColor, 0.1) }}>
                <span className="text-xs font-bold" style={{ color: primaryColor }}>$</span>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-800">Como funciona o pagamento?</div>
                <div className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">Pix, cartão ou dinheiro — combinado diretamente com a trancista.</div>
              </div>
            </div>
            <button className="w-full py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-1" style={{ background: primaryColor }}>
              Começar agendamento <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 1 — Service */}
        {activeStep === 1 && (
          <div className="p-4 space-y-2">
            <div className="text-sm font-bold text-gray-800 mb-3">1. Qual serviço você deseja?</div>
            {[
              { name: "Box Braids", desc: "Tranças individuais", price: "R$ 200", dur: "6h" },
              { name: "Nagô", desc: "Tranças raiz", price: "R$ 150", dur: "4h" },
              { name: "Twist", desc: "Tranças em duas", price: "R$ 180", dur: "5h" },
            ].map((s, i) => (
              <div
                key={s.name}
                className="bg-white rounded-xl border-2 p-3 flex justify-between items-start transition-all cursor-pointer"
                style={i === 0 ? { borderColor: primaryColor } : { borderColor: '#E5E7EB' }}
              >
                <div>
                  <div className="text-xs font-bold" style={i === 0 ? { color: primaryColor } : { color: '#1A1A1A' }}>{s.name}</div>
                  <div className="text-[10px] text-gray-400">{s.desc} · ~{s.dur}</div>
                </div>
                <div className="text-xs font-bold" style={i === 0 ? { color: primaryColor } : { color: '#666' }}>{s.price}</div>
              </div>
            ))}
          </div>
        )}

        {/* Step 2 — Size */}
        {activeStep === 2 && (
          <div className="p-4 space-y-2">
            <div className="text-sm font-bold text-gray-800 mb-1">2. Qual o tamanho?</div>
            <div className="text-[10px] text-gray-400 mb-3">O tamanho influencia no valor e tempo do serviço.</div>
            <div
              className="bg-white rounded-xl border-2 p-3"
              style={{ borderColor: primaryColor, background: hexToRgba(primaryColor, 0.04) }}
            >
              <div className="text-xs font-bold text-gray-800">Até o meio das costas</div>
              <div className="text-sm font-bold mt-0.5" style={{ color: primaryColor }}>R$ 200,00</div>
            </div>
            <div className="bg-white rounded-xl border-2 border-gray-200 p-3">
              <div className="text-xs font-bold text-gray-600">Até a cintura / Bumbum</div>
              <div className="text-sm font-bold text-gray-400 mt-0.5">R$ 350,00</div>
            </div>
            <div className="flex justify-end pt-1">
              <button className="px-4 py-2 rounded-full text-white text-xs font-bold flex items-center gap-1" style={{ background: primaryColor }}>
                Avançar <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
