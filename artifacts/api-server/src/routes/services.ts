import { Router } from "express";
import { db, servicesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireTenant, requireAuth, type AuthRequest } from "../lib/auth.js";
import { z } from "zod";

const router = Router();

const createServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  durationHours: z.number().positive(),
  priceSmall: z.number().positive(),
  priceLarge: z.number().positive(),
  sizeDependent: z.boolean().optional().default(true),
});

const updateServiceSchema = createServiceSchema.partial().extend({
  active: z.boolean().optional(),
});

function formatService(service: typeof servicesTable.$inferSelect) {
  return {
    id: service.id,
    tenantId: service.tenantId,
    name: service.name,
    description: service.description ?? null,
    durationHours: service.durationHours,
    priceSmall: service.priceSmall,
    priceLarge: service.priceLarge,
    sizeDependent: service.sizeDependent,
    active: service.active,
  };
}

router.get("/", requireTenant, async (req: AuthRequest, res) => {
  try {
    const services = await db.select().from(servicesTable).where(eq(servicesTable.tenantId, req.user!.tenantId!));
    res.json(services.map(formatService));
  } catch (err) {
    req.log.error({ err }, "Get services error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.post("/", requireTenant, async (req: AuthRequest, res) => {
  const parsed = createServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Dados inválidos" });
    return;
  }

  try {
    const [service] = await db.insert(servicesTable).values({ ...parsed.data, tenantId: req.user!.tenantId! }).returning();
    res.status(201).json(formatService(service!));
  } catch (err) {
    req.log.error({ err }, "Create service error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.patch("/:id", requireTenant, async (req: AuthRequest, res) => {
  const parsed = updateServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Dados inválidos" });
    return;
  }

  try {
    const [updated] = await db
      .update(servicesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(servicesTable.id, req.params.id!), eq(servicesTable.tenantId, req.user!.tenantId!)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "NotFound", message: "Serviço não encontrado" });
      return;
    }

    res.json(formatService(updated));
  } catch (err) {
    req.log.error({ err }, "Update service error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.delete("/:id", requireTenant, async (req: AuthRequest, res) => {
  try {
    const [deleted] = await db
      .delete(servicesTable)
      .where(and(eq(servicesTable.id, req.params.id!), eq(servicesTable.tenantId, req.user!.tenantId!)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "NotFound", message: "Serviço não encontrado" });
      return;
    }

    res.json({ message: "Serviço excluído com sucesso" });
  } catch (err) {
    req.log.error({ err }, "Delete service error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.get("/public/:tenantId", async (req, res) => {
  try {
    const services = await db
      .select()
      .from(servicesTable)
      .where(and(eq(servicesTable.tenantId, req.params.tenantId!), eq(servicesTable.active, true)));
    res.json(services.map(formatService));
  } catch (err) {
    req.log.error({ err }, "Get public services error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

export default router;
