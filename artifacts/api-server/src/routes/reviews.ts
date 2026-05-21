import { Router } from "express";
import { db, reviewsTable, appointmentsTable, tenantsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireTenant, type AuthRequest } from "../lib/auth.js";
import { z } from "zod";

const router = Router();

function formatReview(r: typeof reviewsTable.$inferSelect) {
  return {
    id: r.id,
    tenantId: r.tenantId,
    appointmentId: r.appointmentId,
    clientName: r.clientName,
    rating: r.rating,
    comment: r.comment,
    isApproved: r.isApproved,
    isPublic: r.isPublic,
    createdAt: r.createdAt.toISOString(),
  };
}

// GET /reviews — tenant lists all their reviews (for moderation)
router.get("/", requireTenant, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.tenantId, req.user!.tenantId!))
      .orderBy(desc(reviewsTable.createdAt));
    res.json(rows.map(formatReview));
  } catch (err) {
    req.log.error({ err }, "List reviews error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

// PATCH /reviews/:id — tenant updates approval / public flags
const updateSchema = z.object({
  isApproved: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

router.patch("/:id", requireTenant, async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Dados inválidos" });
    return;
  }
  try {
    const [updated] = await db
      .update(reviewsTable)
      .set(parsed.data)
      .where(and(eq(reviewsTable.id, req.params.id!), eq(reviewsTable.tenantId, req.user!.tenantId!)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "NotFound", message: "Avaliação não encontrada" });
      return;
    }
    res.json(formatReview(updated));
  } catch (err) {
    req.log.error({ err }, "Update review error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

// DELETE /reviews/:id — tenant deletes a review
router.delete("/:id", requireTenant, async (req: AuthRequest, res) => {
  try {
    const [deleted] = await db
      .delete(reviewsTable)
      .where(and(eq(reviewsTable.id, req.params.id!), eq(reviewsTable.tenantId, req.user!.tenantId!)))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "NotFound", message: "Avaliação não encontrada" });
      return;
    }
    res.json({ message: "Avaliação removida" });
  } catch (err) {
    req.log.error({ err }, "Delete review error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

// GET /reviews/public/:tenantId — public list of approved+public reviews
router.get("/public/:tenantId", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.tenantId, req.params.tenantId!),
          eq(reviewsTable.isApproved, true),
          eq(reviewsTable.isPublic, true),
        )
      )
      .orderBy(desc(reviewsTable.createdAt));
    res.json(rows.map(formatReview));
  } catch (err) {
    req.log.error({ err }, "Public reviews error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

// GET /reviews/submit/:token — fetch appointment info to display review form
router.get("/submit/:token", async (req, res) => {
  try {
    const [appt] = await db
      .select()
      .from(appointmentsTable)
      .where(eq(appointmentsTable.reviewToken, req.params.token!))
      .limit(1);
    if (!appt) {
      res.status(404).json({ error: "NotFound", message: "Link inválido ou expirado." });
      return;
    }
    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, appt.tenantId))
      .limit(1);

    // Check if already submitted
    const [existing] = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.appointmentId, appt.id))
      .limit(1);

    res.json({
      tenantName: tenant?.name ?? "Salão",
      tenantSlug: tenant?.slug ?? "",
      primaryColor: tenant?.primaryColor ?? null,
      clientName: appt.clientName,
      serviceName: appt.serviceName,
      date: appt.date,
      alreadySubmitted: !!existing,
    });
  } catch (err) {
    req.log.error({ err }, "Get review form error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

// POST /reviews/submit/:token — client submits review
const submitSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

router.post("/submit/:token", async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Avaliação inválida" });
    return;
  }
  try {
    const [appt] = await db
      .select()
      .from(appointmentsTable)
      .where(eq(appointmentsTable.reviewToken, req.params.token!))
      .limit(1);
    if (!appt) {
      res.status(404).json({ error: "NotFound", message: "Link inválido." });
      return;
    }

    const [existing] = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.appointmentId, appt.id))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "Conflict", message: "Você já enviou uma avaliação." });
      return;
    }

    await db.insert(reviewsTable).values({
      tenantId: appt.tenantId,
      appointmentId: appt.id,
      clientName: appt.clientName,
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() || null,
      isApproved: false,
      isPublic: false,
    });

    res.status(201).json({ message: "Avaliação enviada com sucesso. Obrigada!" });
  } catch (err) {
    req.log.error({ err }, "Submit review error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

export default router;
