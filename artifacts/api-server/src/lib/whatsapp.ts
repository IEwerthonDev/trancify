const CALLMEBOT_APIKEY = process.env.CALLMEBOT_APIKEY;
const CALLMEBOT_PHONE = process.env.CALLMEBOT_PHONE;

function isConfigured(): boolean {
  return Boolean(CALLMEBOT_APIKEY && CALLMEBOT_PHONE);
}

async function sendCallMeBot(message: string, destinationPhone?: string | null): Promise<void> {
  const raw = (destinationPhone && destinationPhone.trim()) || CALLMEBOT_PHONE!;
  const phone = raw.replace(/\D/g, "");
  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("phone", phone);
  url.searchParams.set("text", message);
  url.searchParams.set("apikey", CALLMEBOT_APIKEY!);

  const res = await fetch(url.toString());

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CallMeBot error (${res.status}): ${body.slice(0, 200)}`);
  }
}

export interface BookingNotificationData {
  clientName: string;
  clientPhone?: string | null;
  clientAge?: number | null;
  serviceName: string;
  braidSize: string;
  servicePrice: number;
  paymentMethod: string;
  date: string;
  time: string;
  hairDescription?: string | null;
  referencePhotos?: string[];
  notes?: string | null;
  tenantName: string;
  tenantPhone?: string | null;
}

function braidSizeLabel(s: string): string {
  return s === "mid_back" ? "Até o meio das costas" : "Até a cintura/bumbum";
}

function paymentLabel(p: string): string {
  const map: Record<string, string> = { pix: "Pix", card: "Cartão", cash: "Dinheiro" };
  return map[p] ?? p;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function formatPrice(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function publicBaseUrl(): string {
  return process.env.PUBLIC_BASE_URL || "https://trancify.com.br";
}

export interface ReminderData {
  kind: "24h" | "2h";
  clientName: string;
  clientPhone: string;
  serviceName: string;
  date: string;
  time: string;
  tenantName: string;
  tenantPhone?: string | null;
}

export async function sendReminderNotification(data: ReminderData): Promise<void> {
  if (!isConfigured()) {
    console.log("[WhatsApp] not configured — reminder skipped.");
    return;
  }
  const when = data.kind === "24h" ? "amanhã" : "em 2 horas";
  const lines: string[] = [
    `🔔 Lembrete: você tem agendamento ${when}!`,
    ``,
    `Olá ${data.clientName.split(" ")[0]}! Passando para lembrar do seu horário em ${data.tenantName}:`,
    ``,
    `✂️ ${data.serviceName}`,
    `📅 ${formatDate(data.date)} às ${data.time}`,
  ];
  if (data.tenantPhone) {
    lines.push(``, `Em caso de dúvidas, fale com a trancista no WhatsApp: ${data.tenantPhone}`);
  }
  await sendCallMeBot(lines.join("\n"), data.clientPhone);
}

export interface ReviewRequestData {
  clientName: string;
  clientPhone: string;
  serviceName: string;
  tenantName: string;
  reviewToken: string;
}

export async function sendReviewRequestNotification(data: ReviewRequestData): Promise<void> {
  if (!isConfigured()) {
    console.log("[WhatsApp] not configured — review request skipped.");
    return;
  }
  const url = `${publicBaseUrl()}/avaliar/${data.reviewToken}`;
  const lines: string[] = [
    `⭐ Como foi seu atendimento?`,
    ``,
    `Olá ${data.clientName.split(" ")[0]}! Obrigada por escolher ${data.tenantName} para fazer seu ${data.serviceName}.`,
    ``,
    `Sua opinião é muito importante. Avalie o atendimento aqui:`,
    url,
  ];
  await sendCallMeBot(lines.join("\n"), data.clientPhone);
}

export async function sendBookingNotification(data: BookingNotificationData): Promise<void> {
  if (!isConfigured()) {
    console.log("[WhatsApp] CALLMEBOT_APIKEY ou CALLMEBOT_PHONE não configurados — notificação ignorada.");
    return;
  }

  const lines: string[] = [
    `✨ Novo agendamento em ${data.tenantName}!`,
    ``,
    `👤 Cliente: ${data.clientName}`,
  ];

  if (data.clientAge) lines.push(`🎂 Idade: ${data.clientAge} anos`);
  if (data.clientPhone) lines.push(`📱 WhatsApp: ${data.clientPhone}`);

  lines.push(
    ``,
    `✂️ Serviço: ${data.serviceName}`,
    `📏 Tamanho: ${braidSizeLabel(data.braidSize)}`,
    `💰 Valor: ${formatPrice(data.servicePrice)}`,
    `💳 Pagamento: ${paymentLabel(data.paymentMethod)}`,
    ``,
    `📅 Data: ${formatDate(data.date)}`,
    `🕐 Horário: ${data.time}`
  );

  if (data.hairDescription) lines.push(``, `💇 Cabelo: ${data.hairDescription}`);
  if (data.notes) lines.push(`📝 Obs: ${data.notes}`);

  const photoCount = data.referencePhotos?.length ?? 0;
  if (photoCount > 0) {
    lines.push(``, `🖼️ ${photoCount} foto(s) de referência enviadas pelo sistema.`);
  }

  await sendCallMeBot(lines.join("\n"));
}
