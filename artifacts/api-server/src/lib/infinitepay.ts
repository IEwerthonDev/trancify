import { logger } from "./logger.js";

const LINKS_URL = "https://api.checkout.infinitepay.io/links";
const PAYMENT_CHECK_URL = "https://api.checkout.infinitepay.io/payment_check";

/** Convert reais (float) to centavos (integer) safely. */
export function toCentavos(reais: number): number {
  return Math.round(reais * 100);
}

/** Normalize the tenant's InfiniteTag: strip "$", spaces and lowercase. */
export function normalizeHandle(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const clean = handle.replace(/^\$/, "").trim().toLowerCase();
  return clean.length > 0 ? clean : null;
}

export interface CreateLinkParams {
  handle: string;
  orderNsu: string;
  amountReais: number;
  description: string;
  redirectUrl: string;
  webhookUrl?: string;
  customerName?: string;
  customerPhone?: string;
}

export interface CreateLinkResult {
  url: string;
}

export async function createPaymentLink(params: CreateLinkParams): Promise<CreateLinkResult> {
  const body: Record<string, unknown> = {
    handle: params.handle,
    redirect_url: params.redirectUrl,
    order_nsu: params.orderNsu,
    items: [
      {
        quantity: 1,
        price: toCentavos(params.amountReais),
        description: params.description.slice(0, 100),
      },
    ],
  };
  if (params.webhookUrl) body.webhook_url = params.webhookUrl;
  if (params.customerName) {
    body.customer = {
      name: params.customerName,
      ...(params.customerPhone ? { phone_number: params.customerPhone.replace(/\D/g, "") } : {}),
    };
  }

  const res = await fetch(LINKS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    logger.error({ status: res.status, body: text.slice(0, 300) }, "InfinitePay link creation failed");
    throw new Error(`InfinitePay respondeu ${res.status}`);
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Resposta inválida da InfinitePay");
  }

  const url = json?.url ?? json?.link ?? json?.checkout_url;
  if (!url || typeof url !== "string") {
    logger.error({ body: text.slice(0, 300) }, "InfinitePay link response missing url");
    throw new Error("InfinitePay não retornou o link de pagamento");
  }
  return { url };
}

export interface PaymentCheckParams {
  handle: string;
  orderNsu: string;
  transactionNsu: string;
  slug: string;
}

export interface PaymentCheckResult {
  success: boolean;
  paid: boolean;
  amount?: number; // centavos
  paidAmount?: number; // centavos
  captureMethod?: string;
  raw: any;
}

export async function checkPayment(params: PaymentCheckParams): Promise<PaymentCheckResult> {
  const res = await fetch(PAYMENT_CHECK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handle: params.handle,
      order_nsu: params.orderNsu,
      transaction_nsu: params.transactionNsu,
      slug: params.slug,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    logger.error({ status: res.status, body: text.slice(0, 300) }, "InfinitePay payment_check failed");
    return { success: false, paid: false, raw: text };
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    return { success: false, paid: false, raw: text };
  }

  return {
    success: Boolean(json?.success),
    paid: Boolean(json?.paid),
    amount: typeof json?.amount === "number" ? json.amount : undefined,
    paidAmount: typeof json?.paid_amount === "number" ? json.paid_amount : undefined,
    captureMethod: typeof json?.capture_method === "string" ? json.capture_method : undefined,
    raw: json,
  };
}
