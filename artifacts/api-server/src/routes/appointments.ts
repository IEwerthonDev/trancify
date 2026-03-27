import { Router } from "express";
import { db, appointmentsTable, servicesTable, availabilityTable, tenantsTable } from "@workspace/db";
import { eq, and, gte, lte, desc, ne } from "drizzle-orm";
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
  hairDescription: z.string().optional(),
  referencePhotos: z.array(z.string()).max(3).optional(),
  paymentMethod: z.enum(["pix", "card", "cash"]),
  braidSize: z.enum(["mid_back", "waist_butt"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().optional(),
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
    token: appt.token,
    notes: appt.notes ?? null,
    createdAt: appt.createdAt.toISOString(),
  };
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
            ne(appointmentsTable.status, "cancelled")
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

    const [appointment] = await db
      .insert(appointmentsTable)
      .values({
        tenantId: data.tenantId,
        serviceId: data.serviceId,
        serviceName: service.name,
        clientName: data.clientName,
        clientAge: data.clientAge,
        clientPhone: data.clientPhone,
        hairDescription: data.hairDescription,
        referencePhotos: data.referencePhotos ?? [],
        paymentMethod: data.paymentMethod,
        braidSize: data.braidSize,
        servicePrice,
        date: data.date,
        time: data.time,
        notes: data.notes,
        status: "pending",
      })
      .returning();

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
