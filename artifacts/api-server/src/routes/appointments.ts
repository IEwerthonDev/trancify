import { Router } from "express";
import { db, appointmentsTable, servicesTable, availabilityTable, tenantsTable, clientsTable } from "@workspace/db";
import { eq, and, gte, lte, desc, ne, sql, inArray } from "drizzle-orm";
import { requireTenant, type AuthRequest } from "../lib/auth.js";
import { computeAvailableSlots } from "../lib/availability.js";
import { sendBookingNotification } from "../lib/whatsapp.js";
import { z } from "zod";

const router = Router();

const bookSchema = z.object({
  tenantId: z.string(),
  serviceId: z.string(),
  clientName: z.string().min(1),
  clientAge: z.number().int().positive().optional(),
  clientPhone: z.string().min(10, "Celular é obrigatório"),
  clientCpf: z.string().optional(),
  hairDescription: z.string().optional(),
  referencePhotos: z.array(z.string()).max(3).optional(),
  paymentMethod: z.enum(["pix", "card", "cash"]),
  braidSize: z.enum(["mid_back", "waist_butt"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().optional(),
  bookingType: z.enum(["appointment", "pre_appointment"]).default("appointment"),
  // 'deposit' = pay 50% now (sinal), 'full' = pay 100% now, 'later' = pre-appointment defers payment, 'skip' = TEST ONLY
  paymentChoice: z.enum(["deposit", "full", "later", "skip"]).default("deposit"),
});

const updateAppointmentSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notes: z.string().optional(),
});

const updateCostSchema = z.object({
  materialCost: z.number().min(0),
});

function formatAppointment(appt: typeof appointmentsTable.$inferSelect) {
  return {
    id: appt.id,
    tenantId: appt.tenantId,
    serviceId: appt.serviceId,
    serviceName: appt.serviceName,
    clientName: appt.clientName,
    clientAge: appt.clientAge ?? null,
    clientPhone: appt.clientPhone ?? null,
    clientCpf: appt.clientCpf ?? null,
    hairDescription: appt.hairDescription ?? null,
    referencePhotos: (appt.referencePhotos as string[]) ?? [],
    paymentMethod: appt.paymentMethod,
    braidSize: appt.braidSize,
    servicePrice: appt.servicePrice,
    materialCost: appt.materialCost ?? null,
    profit: appt.materialCost != null ? appt.servicePrice - appt.materialCost : null,
    date: appt.date,
    time: appt.time,
    status: appt.status,
    bookingType: appt.bookingType,
    paymentStatus: appt.paymentStatus,
    paidAmount: appt.paidAmount,
    depositAmount: appt.depositAmount ?? null,
    depositDeadline: appt.depositDeadline ?? null,
    token: appt.token,
    notes: appt.notes ?? null,
    reviewToken: appt.reviewToken,
    createdAt: appt.createdAt.toISOString(),
  };
}

function calcDepositDeadline(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() - 3);
  return d.toISOString().slice(0, 10);
}

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

function normalizePhone(p?: string | null): string {
  return (p ?? "").replace(/\D/g, "");
}

router.get("/", requireTenant, async (req: AuthRequest, res) => {
  const { startDate, endDate, status } = req.query as {
    startDate?: string;
    endDate?: string;
    status?: string;
  };

  try {
    let query = db
      .select()
      .from(appointmentsTable)
      .where(eq(appointmentsTable.tenantId, req.user!.tenantId!))
      .orderBy(desc(appointmentsTable.date));

    const appointments = await db
      .select()
      .from(appointmentsTable)
      .where(eq(appointmentsTable.tenantId, req.user!.tenantId!))
      .orderBy(desc(appointmentsTable.date));

    let filtered = appointments;
    if (startDate) filtered = filtered.filter((a) => a.date >= startDate);
    if (endDate) filtered = filtered.filter((a) => a.date <= endDate);
    if (status) filtered = filtered.filter((a) => a.status === status);

    res.json(filtered.map(formatAppointment));
  } catch (err) {
    req.log.error({ err }, "Get appointments error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

// GET /appointments/clients/history — aggregate appointments by client
router.get("/clients/history", requireTenant, async (req: AuthRequest, res) => {
  try {
    const appts = await db
      .select()
      .from(appointmentsTable)
      .where(eq(appointmentsTable.tenantId, req.user!.tenantId!))
      .orderBy(desc(appointmentsTable.date));

    const map = new Map<string, {
      clientKey: string;
      clientName: string;
      clientPhone: string | null;
      totalAppointments: number;
      totalSpent: number;
      totalProfit: number;
      lastVisit: string | null;
      firstVisit: string | null;
      appointments: ReturnType<typeof formatAppointment>[];
    }>();

    for (const appt of appts) {
      const phoneNorm = normalizePhone(appt.clientPhone);
      const key = phoneNorm || `name:${appt.clientName.trim().toLowerCase()}`;
      const existing = map.get(key) ?? {
        clientKey: key,
        clientName: appt.clientName,
        clientPhone: appt.clientPhone ?? null,
        totalAppointments: 0,
        totalSpent: 0,
        totalProfit: 0,
        lastVisit: null,
        firstVisit: null,
        appointments: [],
      };
      existing.totalAppointments++;
      existing.totalSpent += appt.servicePrice;
      existing.totalProfit += appt.servicePrice - (appt.materialCost ?? 0);
      if (!existing.lastVisit || appt.date > existing.lastVisit) existing.lastVisit = appt.date;
      if (!existing.firstVisit || appt.date < existing.firstVisit) existing.firstVisit = appt.date;
      existing.appointments.push(formatAppointment(appt));
      map.set(key, existing);
    }

    const clients = Array.from(map.values()).sort((a, b) =>
      (b.lastVisit ?? "").localeCompare(a.lastVisit ?? "")
    );
    res.json(clients);
  } catch (err) {
    req.log.error({ err }, "Client history error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.get("/:id", requireTenant, async (req: AuthRequest, res) => {
  try {
    const [appt] = await db
      .select()
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.id, req.params.id!), eq(appointmentsTable.tenantId, req.user!.tenantId!)))
      .limit(1);

    if (!appt) {
      res.status(404).json({ error: "NotFound", message: "Agendamento não encontrado" });
      return;
    }

    res.json(formatAppointment(appt));
  } catch (err) {
    req.log.error({ err }, "Get appointment error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.post("/book", async (req, res) => {
  const parsed = bookSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.issues.map(i => i.message).join(", ") });
    return;
  }

  const data = parsed.data;

  try {
    const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, data.serviceId)).limit(1);

    if (!service || !service.active) {
      res.status(400).json({ error: "NotFound", message: "Serviço não encontrado ou inativo" });
      return;
    }

    if (service.tenantId !== data.tenantId) {
      res.status(400).json({ error: "ValidationError", message: "Serviço inválido para este salão" });
      return;
    }

    const [avail] = await db.select().from(availabilityTable).where(eq(availabilityTable.tenantId, data.tenantId)).limit(1);

    if (avail) {
      const activeAppts = await db
        .select({ time: appointmentsTable.time, serviceId: appointmentsTable.serviceId })
        .from(appointmentsTable)
        .where(
          and(
            eq(appointmentsTable.tenantId, data.tenantId),
            eq(appointmentsTable.date, data.date),
            // Only 'pending' and 'confirmed' should block a slot — 'cancelled', 'completed' and 'expired' all free the time
            inArray(appointmentsTable.status, ["pending", "confirmed"])
          )
        );

      const appointmentsWithDuration = await Promise.all(
        activeAppts.map(async (appt) => {
          const [svc] = await db.select().from(servicesTable).where(eq(servicesTable.id, appt.serviceId)).limit(1);
          return {
            time: appt.time,
            durationHours: svc?.durationHours ?? 4,
          };
        })
      );

      const available = computeAvailableSlots(avail, appointmentsWithDuration, service.durationHours, data.date);

      if (!available.includes(data.time)) {
        res.status(400).json({ error: "Conflict", message: "Horário não disponível. Por favor, escolha outro horário." });
        return;
      }
    }

    const servicePrice = data.braidSize === "mid_back" ? service.priceSmall : service.priceLarge;
    const depositAmount = Math.round(servicePrice * 50) / 100;
    const cpfNormalized = data.clientCpf ? normalizeCpf(data.clientCpf) : null;

    // Enforce payment rules
    if (data.bookingType === "appointment" && data.paymentChoice === "later") {
      res.status(400).json({ error: "ValidationError", message: "Agendamento exige pagamento imediato (SINAL ou INTEIRA). Use Pré-Agendamento para pagar depois." });
      return;
    }

    // Gate the TEST-ONLY "skip" choice — never accept it in production, regardless of frontend.
    if (data.paymentChoice === "skip" && process.env.NODE_ENV === "production" && process.env.ALLOW_SKIP_PAYMENT !== "true") {
      res.status(400).json({ error: "ValidationError", message: "Pagamento é obrigatório." });
      return;
    }

    let paymentStatus: "unpaid" | "deposit_paid" | "fully_paid" = "unpaid";
    let paidAmount = 0;
    let paidAt: Date | null = null;
    if (data.paymentChoice === "deposit") {
      paymentStatus = "deposit_paid";
      paidAmount = depositAmount;
      paidAt = new Date();
    } else if (data.paymentChoice === "full") {
      paymentStatus = "fully_paid";
      paidAmount = servicePrice;
      paidAt = new Date();
    } else if (data.paymentChoice === "skip") {
      // TEST ONLY — treat as deposit paid so booking is confirmed
      paymentStatus = "deposit_paid";
      paidAmount = depositAmount;
      paidAt = new Date();
    }

    const depositDeadline = data.bookingType === "pre_appointment" ? calcDepositDeadline(data.date) : null;
    const initialStatus = paymentStatus === "unpaid" ? "pending" : "confirmed";

    const [appointment] = await db
      .insert(appointmentsTable)
      .values({
        tenantId: data.tenantId,
        serviceId: data.serviceId,
        serviceName: service.name,
        clientName: data.clientName,
        clientAge: data.clientAge,
        clientPhone: data.clientPhone,
        clientCpf: cpfNormalized ?? undefined,
        hairDescription: data.hairDescription,
        referencePhotos: data.referencePhotos ?? [],
        paymentMethod: data.paymentMethod,
        braidSize: data.braidSize,
        servicePrice,
        date: data.date,
        time: data.time,
        notes: data.notes,
        status: initialStatus,
        bookingType: data.bookingType,
        paymentStatus,
        paidAmount,
        depositAmount,
        depositDeadline: depositDeadline ?? undefined,
        paidAt: paidAt ?? undefined,
      })
      .returning();

    // Upsert client profile when CPF was provided
    if (cpfNormalized && cpfNormalized.length === 11) {
      try {
        await db
          .insert(clientsTable)
          .values({
            tenantId: data.tenantId,
            cpf: cpfNormalized,
            name: data.clientName,
            phone: data.clientPhone,
            age: data.clientAge ?? null,
            hairDescription: data.hairDescription ?? null,
          })
          .onConflictDoUpdate({
            target: [clientsTable.tenantId, clientsTable.cpf],
            set: {
              name: data.clientName,
              phone: data.clientPhone,
              age: data.clientAge ?? null,
              hairDescription: data.hairDescription ?? null,
              updatedAt: new Date(),
            },
          });
      } catch (err) {
        req.log.warn({ err }, "Client upsert failed — booking still saved");
      }
    }

    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, data.tenantId)).limit(1);

    sendBookingNotification({
      tenantName: tenant?.name ?? "Salão",
      tenantPhone: tenant?.whatsapp ?? null,
      clientName: data.clientName,
      clientPhone: data.clientPhone ?? null,
      clientAge: data.clientAge ?? null,
      serviceName: service.name,
      braidSize: data.braidSize,
      servicePrice,
      paymentMethod: data.paymentMethod,
      date: data.date,
      time: data.time,
      hairDescription: data.hairDescription ?? null,
      referencePhotos: data.referencePhotos ?? [],
      notes: data.notes ?? null,
    }).catch((err) => {
      req.log.warn({ err }, "WhatsApp notification failed — booking still saved");
    });

    res.status(201).json(formatAppointment(appointment!));
  } catch (err) {
    req.log.error({ err }, "Book appointment error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.patch("/:id", requireTenant, async (req: AuthRequest, res) => {
  const parsed = updateAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Dados inválidos" });
    return;
  }

  try {
    const [updated] = await db
      .update(appointmentsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(appointmentsTable.id, req.params.id!), eq(appointmentsTable.tenantId, req.user!.tenantId!)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "NotFound", message: "Agendamento não encontrado" });
      return;
    }

    res.json(formatAppointment(updated));
  } catch (err) {
    req.log.error({ err }, "Update appointment error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.delete("/:id", requireTenant, async (req: AuthRequest, res) => {
  try {
    const [deleted] = await db
      .delete(appointmentsTable)
      .where(and(eq(appointmentsTable.id, req.params.id!), eq(appointmentsTable.tenantId, req.user!.tenantId!)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "NotFound", message: "Agendamento não encontrado" });
      return;
    }

    res.json({ message: "Agendamento excluído com sucesso" });
  } catch (err) {
    req.log.error({ err }, "Delete appointment error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.patch("/:id/cost", requireTenant, async (req: AuthRequest, res) => {
  const parsed = updateCostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Dados inválidos" });
    return;
  }

  try {
    const [appt] = await db
      .select()
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.id, req.params.id!), eq(appointmentsTable.tenantId, req.user!.tenantId!)))
      .limit(1);

    if (!appt) {
      res.status(404).json({ error: "NotFound", message: "Agendamento não encontrado" });
      return;
    }

    const [updated] = await db
      .update(appointmentsTable)
      .set({ materialCost: parsed.data.materialCost, updatedAt: new Date() })
      .where(eq(appointmentsTable.id, req.params.id!))
      .returning();

    res.json(formatAppointment(updated!));
  } catch (err) {
    req.log.error({ err }, "Update cost error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

export default router;
