import { Router } from "express";
import { db, appointmentsTable, tenantsTable, paymentAttemptsTable } from "@workspace/db";
import { eq, and, inArray, ne, desc } from "drizzle-orm";
import { z } from "zod";
import { requireTenant, type AuthRequest } from "../lib/auth.js";
import { createPaymentLink, checkPayment, normalizeHandle, toCentavos } from "../lib/infinitepay.js";
import { emitToTenant } from "../lib/ws.js";
import { logger } from "../lib/logger.js";

const router = Router();

function publicBaseUrl(): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL;
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return "http://localhost:5000";
}

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

function computeAmounts(appt: typeof appointmentsTable.$inferSelect, paymentType: "deposit" | "full") {
  const depositAmount = appt.depositAmount ?? Math.round(appt.servicePrice * 50) / 100;
  const remaining = Math.max(0, appt.servicePrice - appt.paidAmount);
  const amount = paymentType === "deposit" ? depositAmount : remaining > 0 ? remaining : appt.servicePrice;
  return { depositAmount, amount };
}

/**
 * Applies a successful payment to the appointment atomically (same guard as
 * the simulated /clients/pay flow — the expiry sweep can't race us) and emits
 * a realtime event to the tenant dashboard.
 */
async function applyPaidAttempt(
  attempt: typeof paymentAttemptsTable.$inferSelect,
  extra: { transactionNsu?: string; invoiceSlug?: string; captureMethod?: string; receiptUrl?: string }
): Promise<boolean> {
  const [appt] = await db
    .select()
    .from(appointmentsTable)
    .where(eq(appointmentsTable.id, attempt.appointmentId))
    .limit(1);
  if (!appt) return false;

  const newPaymentStatus = attempt.paymentType === "full" ? "fully_paid" : "deposit_paid";
  const newPaid = attempt.paymentType === "full" ? appt.servicePrice : (appt.paidAmount + attempt.amount);

  // Update the appointment first, guarded against races with the expiry
  // sweep / cancellation. Only when this actually applies do we flip the
  // payment attempt to "paid" — otherwise the two records would disagree.
  const updated = await db
    .update(appointmentsTable)
    .set({
      paidAmount: newPaid,
      paymentStatus: newPaymentStatus,
      paidAt: new Date(),
      status: "confirmed",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(appointmentsTable.id, attempt.appointmentId),
        inArray(appointmentsTable.status, ["pending", "confirmed"]),
        ne(appointmentsTable.paymentStatus, "fully_paid")
      )
    )
    .returning();

  if (updated.length === 0) {
    // Appointment was expired/cancelled/already fully paid — record the
    // gateway result but do NOT mark the attempt as applied.
    await db
      .update(paymentAttemptsTable)
      .set({
        status: "failed",
        failureReason: "appointment_not_updatable",
        transactionNsu: extra.transactionNsu ?? attempt.transactionNsu,
        invoiceSlug: extra.invoiceSlug ?? attempt.invoiceSlug,
        captureMethod: extra.captureMethod ?? attempt.captureMethod,
        receiptUrl: extra.receiptUrl ?? attempt.receiptUrl,
      })
      .where(eq(paymentAttemptsTable.id, attempt.id));
    return false;
  }

  await db
    .update(paymentAttemptsTable)
    .set({
      status: "paid",
      paidAt: new Date(),
      transactionNsu: extra.transactionNsu ?? attempt.transactionNsu,
      invoiceSlug: extra.invoiceSlug ?? attempt.invoiceSlug,
      captureMethod: extra.captureMethod ?? attempt.captureMethod,
      receiptUrl: extra.receiptUrl ?? attempt.receiptUrl,
    })
    .where(eq(paymentAttemptsTable.id, attempt.id));

  emitToTenant(attempt.tenantId, {
    type: "payment",
    appointmentId: appt.id,
    clientName: appt.clientName,
    serviceName: appt.serviceName,
    paymentType: attempt.paymentType,
    amount: attempt.amount,
    paymentStatus: newPaymentStatus,
    provider: "infinitepay",
    paidAt: new Date().toISOString(),
  });
  return true;
}

// ── POST /payments/link (public) ─────────────────────────────────────────────
// Creates an InfinitePay payment link for an appointment, validated by CPF.
// If the tenant has no InfiniteTag configured, returns { simulated: true } so
// the frontend falls back to the simulated payment flow.
const linkSchema = z.object({
  appointmentId: z.string().min(1),
  cpf: z.string().min(1),
  paymentType: z.enum(["deposit", "full"]),
});

router.post("/link", async (req, res) => {
  const parsed = linkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Dados inválidos" });
    return;
  }
  const cpf = normalizeCpf(parsed.data.cpf);
  try {
    const [appt] = await db
      .select()
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.id, parsed.data.appointmentId), eq(appointmentsTable.clientCpf, cpf)))
      .limit(1);
    if (!appt) {
      res.status(404).json({ error: "NotFound", message: "Agendamento não encontrado para este CPF" });
      return;
    }
    if (!["pending", "confirmed"].includes(appt.status) || appt.paymentStatus === "fully_paid") {
      res.status(409).json({ error: "Conflict", message: "Agendamento não pode mais ser pago." });
      return;
    }
    if (parsed.data.paymentType === "deposit" && appt.paymentStatus === "deposit_paid") {
      res.status(409).json({ error: "Conflict", message: "O sinal já foi pago." });
      return;
    }

    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, appt.tenantId)).limit(1);
    if (!tenant) {
      res.status(404).json({ error: "NotFound", message: "Salão não encontrado" });
      return;
    }

    const handle = normalizeHandle(tenant.infinitepayHandle);
    if (!handle) {
      // No InfiniteTag configured — frontend should use the simulated flow.
      res.json({ simulated: true });
      return;
    }

    const { amount } = computeAmounts(appt, parsed.data.paymentType);
    if (amount <= 0) {
      res.status(409).json({ error: "Conflict", message: "Não há valor pendente para este agendamento." });
      return;
    }

    const orderNsu = crypto.randomUUID();
    const base = publicBaseUrl();
    const label = parsed.data.paymentType === "deposit" ? "Sinal" : "Pagamento";

    const [attempt] = await db
      .insert(paymentAttemptsTable)
      .values({
        tenantId: tenant.id,
        appointmentId: appt.id,
        orderNsu,
        paymentType: parsed.data.paymentType,
        amount,
        provider: "infinitepay",
      })
      .returning();

    const { url } = await createPaymentLink({
      handle,
      orderNsu,
      amountReais: amount,
      description: `${label} — ${appt.serviceName} (${tenant.name})`,
      redirectUrl: `${base}/api/payments/callback`,
      webhookUrl: `${base}/api/payments/webhook`,
      customerName: appt.clientName,
      customerPhone: appt.clientPhone ?? undefined,
    });

    await db
      .update(paymentAttemptsTable)
      .set({ checkoutUrl: url })
      .where(eq(paymentAttemptsTable.id, attempt!.id));

    res.json({ simulated: false, checkoutUrl: url, orderNsu, amount });
  } catch (err) {
    req.log.error({ err }, "Payment link creation error");
    res.status(502).json({ error: "GatewayError", message: "Não foi possível gerar o link de pagamento. Tente novamente." });
  }
});

// ── GET /payments/callback (public redirect from InfinitePay) ────────────────
// InfinitePay redirects the buyer here with query params after checkout.
// We NEVER trust the query params alone — payment is verified server-side
// via payment_check before the appointment is updated.
router.get("/callback", async (req, res) => {
  const orderNsu = String(req.query.order_nsu ?? "");
  const transactionNsu = String(req.query.transaction_nsu ?? "");
  const invoiceSlug = String(req.query.slug ?? "");
  const receiptUrl = String(req.query.receipt_url ?? "");
  const captureMethod = String(req.query.capture_method ?? "");

  const fail = (slug: string | null) =>
    res.redirect(`/pagar/${slug ?? ""}?paid=0`);

  try {
    if (!orderNsu) {
      fail(null);
      return;
    }
    const [attempt] = await db
      .select()
      .from(paymentAttemptsTable)
      .where(eq(paymentAttemptsTable.orderNsu, orderNsu))
      .limit(1);
    if (!attempt) {
      fail(null);
      return;
    }
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, attempt.tenantId)).limit(1);
    const tenantSlug = tenant?.slug ?? "";

    if (attempt.status === "paid") {
      // Idempotent retry — only report success if the appointment really
      // reflects the payment.
      const [appt] = await db
        .select()
        .from(appointmentsTable)
        .where(eq(appointmentsTable.id, attempt.appointmentId))
        .limit(1);
      if (appt && appt.paymentStatus !== "unpaid") {
        const receipt = attempt.receiptUrl || receiptUrl;
        res.redirect(`/pagar/${tenantSlug}?paid=1${receipt ? `&receipt_url=${encodeURIComponent(receipt)}` : ""}`);
      } else {
        fail(tenantSlug);
      }
      return;
    }

    const handle = normalizeHandle(tenant?.infinitepayHandle);
    if (!handle || !transactionNsu || !invoiceSlug) {
      fail(tenantSlug);
      return;
    }

    const check = await checkPayment({ handle, orderNsu, transactionNsu, slug: invoiceSlug });
    const expectedCentavos = toCentavos(attempt.amount);
    const paidOk =
      check.success &&
      check.paid &&
      (check.paidAmount === undefined || check.paidAmount >= expectedCentavos);

    if (!paidOk) {
      logger.warn({ orderNsu, check: check.raw }, "Payment check did not confirm payment");
      fail(tenantSlug);
      return;
    }

    const applied = await applyPaidAttempt(attempt, { transactionNsu, invoiceSlug, captureMethod, receiptUrl });
    if (!applied) {
      logger.warn({ orderNsu }, "Payment confirmed by gateway but appointment could not be updated");
      fail(tenantSlug);
      return;
    }
    res.redirect(`/pagar/${tenantSlug}?paid=1${receiptUrl ? `&receipt_url=${encodeURIComponent(receiptUrl)}` : ""}`);
  } catch (err) {
    req.log.error({ err }, "Payment callback error");
    fail(null);
  }
});

// ── POST /payments/webhook (public, called by InfinitePay) ──────────────────
// Server-to-server confirmation. Respond 200 fast on success; 400 makes
// InfinitePay retry.
router.post("/webhook", async (req, res) => {
  try {
    const body = req.body ?? {};
    const orderNsu = String(body.order_nsu ?? body.orderNsu ?? "");
    const transactionNsu = String(body.transaction_nsu ?? body.transactionNsu ?? "");
    const invoiceSlug = String(body.slug ?? body.invoice_slug ?? "");

    if (!orderNsu) {
      res.status(400).json({ error: "ValidationError", message: "order_nsu ausente" });
      return;
    }

    const [attempt] = await db
      .select()
      .from(paymentAttemptsTable)
      .where(eq(paymentAttemptsTable.orderNsu, orderNsu))
      .limit(1);
    if (!attempt) {
      res.status(400).json({ error: "NotFound", message: "Pagamento não reconhecido" });
      return;
    }
    if (attempt.status === "paid") {
      const [appt] = await db
        .select()
        .from(appointmentsTable)
        .where(eq(appointmentsTable.id, attempt.appointmentId))
        .limit(1);
      if (appt && appt.paymentStatus !== "unpaid") {
        res.json({ ok: true, alreadyProcessed: true });
      } else {
        res.status(409).json({ error: "Conflict", message: "Pagamento registrado mas agendamento inconsistente" });
      }
      return;
    }

    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, attempt.tenantId)).limit(1);
    const handle = normalizeHandle(tenant?.infinitepayHandle);
    if (!handle || !transactionNsu || !invoiceSlug) {
      res.status(400).json({ error: "ValidationError", message: "Dados insuficientes para validar" });
      return;
    }

    const check = await checkPayment({ handle, orderNsu, transactionNsu, slug: invoiceSlug });
    const expectedCentavos = toCentavos(attempt.amount);
    const paidOk =
      check.success &&
      check.paid &&
      (check.paidAmount === undefined || check.paidAmount >= expectedCentavos);

    if (!paidOk) {
      res.status(400).json({ error: "NotPaid", message: "Pagamento não confirmado" });
      return;
    }

    const applied = await applyPaidAttempt(attempt, {
      transactionNsu,
      invoiceSlug,
      captureMethod: typeof body.capture_method === "string" ? body.capture_method : undefined,
      receiptUrl: typeof body.receipt_url === "string" ? body.receipt_url : undefined,
    });
    if (!applied) {
      // Payment is real but the appointment could no longer accept it
      // (expired/cancelled). Acknowledge so InfinitePay stops retrying —
      // the attempt is recorded as failed for the salon to reconcile.
      logger.warn({ orderNsu }, "Webhook payment confirmed but appointment could not be updated");
      res.json({ ok: true, applied: false });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Payment webhook error");
    res.status(400).json({ error: "InternalError", message: "Erro ao processar webhook" });
  }
});

// ── GET /payments (tenant) — payment activity for the Pagamentos tab ────────
router.get("/", requireTenant, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;

    // All appointments with any payment recorded (paid ones), newest first
    const paidAppts = await db
      .select()
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.tenantId, tenantId),
          inArray(appointmentsTable.paymentStatus, ["deposit_paid", "fully_paid"])
        )
      )
      .orderBy(desc(appointmentsTable.paidAt))
      .limit(100);

    // Appointments still awaiting payment
    const pendingAppts = await db
      .select()
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.tenantId, tenantId),
          eq(appointmentsTable.paymentStatus, "unpaid"),
          inArray(appointmentsTable.status, ["pending", "confirmed"])
        )
      )
      .orderBy(desc(appointmentsTable.createdAt))
      .limit(100);

    // Recent gateway attempts (for provider info)
    const attempts = await db
      .select()
      .from(paymentAttemptsTable)
      .where(eq(paymentAttemptsTable.tenantId, tenantId))
      .orderBy(desc(paymentAttemptsTable.createdAt))
      .limit(200);

    const attemptByAppt = new Map<string, typeof attempts[number]>();
    for (const a of attempts) {
      if (a.status === "paid" && !attemptByAppt.has(a.appointmentId)) {
        attemptByAppt.set(a.appointmentId, a);
      }
    }

    const mapAppt = (a: typeof appointmentsTable.$inferSelect) => {
      const attempt = attemptByAppt.get(a.id);
      return {
        id: a.id,
        clientName: a.clientName,
        serviceName: a.serviceName,
        date: a.date,
        time: a.time,
        servicePrice: a.servicePrice,
        paidAmount: a.paidAmount,
        depositAmount: a.depositAmount ?? Math.round(a.servicePrice * 50) / 100,
        paymentStatus: a.paymentStatus,
        status: a.status,
        bookingType: a.bookingType,
        depositDeadline: a.depositDeadline,
        paidAt: a.paidAt?.toISOString() ?? null,
        provider: attempt ? "infinitepay" : a.paidAt ? "simulated" : null,
        receiptUrl: attempt?.receiptUrl ?? null,
      };
    };

    const totalReceived = paidAppts.reduce((sum, a) => sum + a.paidAmount, 0);
    const totalPending = [...paidAppts, ...pendingAppts]
      .filter((a) => ["pending", "confirmed"].includes(a.status) && a.paymentStatus !== "fully_paid")
      .reduce((sum, a) => sum + Math.max(0, a.servicePrice - a.paidAmount), 0);

    res.json({
      summary: { totalReceived, totalPending, paidCount: paidAppts.length, pendingCount: pendingAppts.length },
      paid: paidAppts.map(mapAppt),
      pending: pendingAppts.map(mapAppt),
    });
  } catch (err) {
    req.log.error({ err }, "Payments list error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

export default router;
