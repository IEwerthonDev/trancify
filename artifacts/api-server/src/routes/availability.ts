import { Router } from "express";
import { db, availabilityTable, appointmentsTable, servicesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireTenant, type AuthRequest } from "../lib/auth.js";
import { computeAvailableSlots } from "../lib/availability.js";
import { z } from "zod";

const router = Router();

const updateAvailabilitySchema = z.object({
  availableDays: z.array(z.number().min(0).max(6)).optional(),
  availableDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  slotIntervalMinutes: z.number().positive().optional(),
  breakAfterMinutes: z.number().min(0).optional(),
  maxAppointmentsPerDay: z.number().positive().optional(),
  blockedDates: z.array(z.string()).optional(),
});

const blockRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const unblockRangeSchema = blockRangeSchema;

async function getOrCreateAvailability(tenantId: string) {
  let [avail] = await db.select().from(availabilityTable).where(eq(availabilityTable.tenantId, tenantId)).limit(1);

  if (!avail) {
    const [created] = await db.insert(availabilityTable).values({ tenantId }).returning();
    avail = created!;
  }

  return avail;
}

function formatAvailability(avail: typeof availabilityTable.$inferSelect) {
  return {
    id: avail.id,
    tenantId: avail.tenantId,
    availableDays: avail.availableDays as number[],
    availableDates: ((avail as any).availableDates as string[]) ?? [],
    startTime: avail.startTime,
    endTime: avail.endTime,
    slotIntervalMinutes: avail.slotIntervalMinutes,
    breakAfterMinutes: avail.breakAfterMinutes,
    maxAppointmentsPerDay: avail.maxAppointmentsPerDay,
    blockedDates: (avail.blockedDates as string[]) ?? [],
  };
}

router.get("/", requireTenant, async (req: AuthRequest, res) => {
  try {
    const avail = await getOrCreateAvailability(req.user!.tenantId!);
    res.json(formatAvailability(avail));
  } catch (err) {
    req.log.error({ err }, "Get availability error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.put("/", requireTenant, async (req: AuthRequest, res) => {
  const parsed = updateAvailabilitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Dados inválidos" });
    return;
  }

  try {
    const existing = await getOrCreateAvailability(req.user!.tenantId!);

    const [updated] = await db
      .update(availabilityTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(availabilityTable.id, existing.id))
      .returning();

    res.json(formatAvailability(updated!));
  } catch (err) {
    req.log.error({ err }, "Update availability error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

// POST /availability/block-range — bulk-block an inclusive date range
router.post("/block-range", requireTenant, async (req: AuthRequest, res) => {
  const parsed = blockRangeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Datas inválidas" });
    return;
  }
  const { startDate, endDate } = parsed.data;
  if (startDate > endDate) {
    res.status(400).json({ error: "ValidationError", message: "Data inicial maior que a final" });
    return;
  }
  try {
    const existing = await getOrCreateAvailability(req.user!.tenantId!);
    const set = new Set<string>(existing.blockedDates as string[]);
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      set.add(d.toISOString().slice(0, 10));
    }
    const [updated] = await db
      .update(availabilityTable)
      .set({ blockedDates: Array.from(set).sort(), updatedAt: new Date() })
      .where(eq(availabilityTable.id, existing.id))
      .returning();
    res.json(formatAvailability(updated!));
  } catch (err) {
    req.log.error({ err }, "Block range error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

// POST /availability/unblock-range — bulk-unblock an inclusive date range
router.post("/unblock-range", requireTenant, async (req: AuthRequest, res) => {
  const parsed = unblockRangeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Datas inválidas" });
    return;
  }
  const { startDate, endDate } = parsed.data;
  try {
    const existing = await getOrCreateAvailability(req.user!.tenantId!);
    const remaining = (existing.blockedDates as string[]).filter(
      (d) => d < startDate || d > endDate
    );
    const [updated] = await db
      .update(availabilityTable)
      .set({ blockedDates: remaining, updatedAt: new Date() })
      .where(eq(availabilityTable.id, existing.id))
      .returning();
    res.json(formatAvailability(updated!));
  } catch (err) {
    req.log.error({ err }, "Unblock range error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.get("/public/:tenantId/dates", async (req, res) => {
  const { tenantId } = req.params;

  try {
    const [avail] = await db.select().from(availabilityTable).where(eq(availabilityTable.tenantId, tenantId!)).limit(1);

    if (!avail) {
      res.json({ availableDates: [] });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0]!;

    const availableDates = ((avail as any).availableDates as string[] | undefined) ?? [];
    const blockedDates = (avail.blockedDates as string[]) ?? [];

    const futureDates = availableDates.filter(
      (d) => d >= todayStr && !blockedDates.includes(d)
    );

    res.json({ availableDates: futureDates });
  } catch (err) {
    req.log.error({ err }, "Get public availability dates error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.get("/public/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const { date, serviceId } = req.query as { date: string; serviceId: string };

  if (!date || !serviceId) {
    res.status(400).json({ error: "ValidationError", message: "date e serviceId são obrigatórios" });
    return;
  }

  try {
    const [avail] = await db.select().from(availabilityTable).where(eq(availabilityTable.tenantId, tenantId!)).limit(1);

    if (!avail) {
      res.json({ date, slots: [], available: false });
      return;
    }

    const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, serviceId)).limit(1);

    if (!service) {
      res.status(404).json({ error: "NotFound", message: "Serviço não encontrado" });
      return;
    }

    const activeAppts = await db
      .select({ time: appointmentsTable.time, serviceId: appointmentsTable.serviceId })
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.tenantId, tenantId!),
          eq(appointmentsTable.date, date),
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

    const slots = computeAvailableSlots(avail, appointmentsWithDuration, service.durationHours, date);

    res.json({
      date,
      slots,
      available: slots.length > 0,
    });
  } catch (err) {
    req.log.error({ err }, "Get public availability error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

export default router;
