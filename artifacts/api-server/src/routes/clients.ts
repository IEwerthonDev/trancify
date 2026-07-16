import { Router } from "express";
import { db, clientsTable, appointmentsTable, tenantsTable } from "@workspace/db";
import { eq, and, inArray, ne, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

const lookupSchema = z.object({
  tenantId: z.string().min(1),
  cpf: z.string().min(1),
});

// POST /clients/lookup (public) — find saved client by CPF in this tenant
router.post("/lookup", async (req, res) => {
  const parsed = lookupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Dados inválidos" });
    return;
  }
  const cpf = normalizeCpf(parsed.data.cpf);
  if (cpf.length !== 11) {
    res.status(400).json({ error: "ValidationError", message: "CPF deve ter 11 dígitos" });
    return;
  }
  try {
    const [client] = await db
      .select()
      .from(clientsTable)
      .where(and(eq(clientsTable.tenantId, parsed.data.tenantId), eq(clientsTable.cpf, cpf)))
      .limit(1);
    if (!client) {
      res.status(404).json({ error: "NotFound", message: "Cliente não encontrado" });
      return;
    }
    res.json({
      cpf: client.cpf,
      name: client.name,
      phone: client.phone ?? "",
      age: client.age ?? null,
      hairDescription: client.hairDescription ?? "",
    });
  } catch (err) {
    req.log.error({ err }, "Client lookup error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

// POST /clients/pending-payments (public) — list pre-appointments awaiting payment
const pendingSchema = z.object({
  tenantId: z.string().min(1),
  cpf: z.string().min(1),
});

router.post("/pending-payments", async (req, res) => {
  const parsed = pendingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Dados inválidos" });
    return;
  }
  const cpf = normalizeCpf(parsed.data.cpf);
  if (cpf.length !== 11) {
    res.status(400).json({ error: "ValidationError", message: "CPF deve ter 11 dígitos" });
    return;
  }
  try {
    const appts = await db
      .select()
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.tenantId, parsed.data.tenantId),
          eq(appointmentsTable.clientCpf, cpf),
          inArray(appointmentsTable.paymentStatus, ["unpaid", "deposit_paid"]),
          inArray(appointmentsTable.status, ["pending", "confirmed"])
        )
      );
    res.json(
      appts.map((a) => ({
        id: a.id,
        serviceName: a.serviceName,
        braidSize: a.braidSize,
        clientName: a.clientName,
        status: a.status,
        date: a.date,
        time: a.time,
        servicePrice: a.servicePrice,
        depositAmount: a.depositAmount ?? Math.round(a.servicePrice * 50) / 100,
        paidAmount: a.paidAmount,
        paymentStatus: a.paymentStatus,
        bookingType: a.bookingType,
        depositDeadline: a.depositDeadline,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Pending payments lookup error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

// POST /clients/history (public) — last 10 appointments for a CPF (all statuses)
const historySchema = z.object({
  tenantId: z.string().min(1),
  cpf: z.string().min(1),
});

router.post("/history", async (req, res) => {
  const parsed = historySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Dados inválidos" });
    return;
  }
  const cpf = normalizeCpf(parsed.data.cpf);
  if (cpf.length !== 11) {
    res.status(400).json({ error: "ValidationError", message: "CPF deve ter 11 dígitos" });
    return;
  }
  try {
    const appts = await db
      .select()
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.tenantId, parsed.data.tenantId),
          eq(appointmentsTable.clientCpf, cpf)
        )
      )
      .orderBy(desc(appointmentsTable.date), desc(appointmentsTable.time))
      .limit(10);
    res.json(
      appts.map((a) => ({
        id: a.id,
        serviceName: a.serviceName,
        braidSize: a.braidSize,
        clientName: a.clientName,
        status: a.status,
        date: a.date,
        time: a.time,
        servicePrice: a.servicePrice,
        depositAmount: a.depositAmount ?? Math.round(a.servicePrice * 50) / 100,
        paidAmount: a.paidAmount,
        paymentStatus: a.paymentStatus,
        bookingType: a.bookingType,
        depositDeadline: a.depositDeadline,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Client history lookup error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

// POST /clients/pay — mock payment endpoint (in production this would integrate Pix/Stripe)
const paySchema = z.object({
  appointmentId: z.string().min(1),
  cpf: z.string().min(1),
  paymentType: z.enum(["deposit", "full"]),
  paymentMethod: z.enum(["pix", "card", "cash"]).optional(),
});

router.post("/pay", async (req, res) => {
  const parsed = paySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Dados inválidos" });
    return;
  }
  const cpf = normalizeCpf(parsed.data.cpf);
  try {
    // Read first to compute amounts (NOT for status decisioning — that's gated atomically below)
    const [appt] = await db
      .select()
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.id, parsed.data.appointmentId), eq(appointmentsTable.clientCpf, cpf)))
      .limit(1);
    if (!appt) {
      res.status(404).json({ error: "NotFound", message: "Agendamento não encontrado para este CPF" });
      return;
    }

    const depositAmount = appt.depositAmount ?? Math.round(appt.servicePrice * 50) / 100;
    const newPaid = parsed.data.paymentType === "full" ? appt.servicePrice : depositAmount;
    const newPaymentStatus = parsed.data.paymentType === "full" ? "fully_paid" : "deposit_paid";

    // ATOMIC conditional update — guarantees the scheduler's expiry sweep can't race us.
    // We only succeed if the row is still pending/confirmed AND not already fully_paid.
    const updated = await db
      .update(appointmentsTable)
      .set({
        paidAmount: newPaid,
        paymentStatus: newPaymentStatus,
        paidAt: new Date(),
        paymentMethod: parsed.data.paymentMethod ?? appt.paymentMethod,
        status: "confirmed",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(appointmentsTable.id, parsed.data.appointmentId),
          eq(appointmentsTable.clientCpf, cpf),
          inArray(appointmentsTable.status, ["pending", "confirmed"]),
          ne(appointmentsTable.paymentStatus, "fully_paid")
        )
      )
      .returning();

    if (updated.length === 0) {
      // The row was expired/cancelled or already fully paid between our read and write
      res.status(409).json({
        error: "Conflict",
        message: "Agendamento não pode mais ser pago (expirou, foi cancelado ou já está pago).",
      });
      return;
    }

    res.json({
      message: "Pagamento registrado",
      appointment: {
        id: updated[0]!.id,
        paymentStatus: updated[0]!.paymentStatus,
        paidAmount: updated[0]!.paidAmount,
        servicePrice: updated[0]!.servicePrice,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Pay appointment error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

export default router;
