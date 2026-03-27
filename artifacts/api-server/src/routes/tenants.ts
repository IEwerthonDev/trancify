import { Router } from "express";
import { db, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireTenant, type AuthRequest } from "../lib/auth.js";
import { z } from "zod";

const router = Router();

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(3).max(50).regex(SLUG_REGEX, "Slug inválido: use apenas letras minúsculas, números e hífens").optional(),
  whatsapp: z.string().optional(),
  logoUrl: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
});

const activateSubscriptionSchema = z.object({
  plan: z.enum(["monthly", "annual"]),
});

function formatTenant(tenant: typeof tenantsTable.$inferSelect) {
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    email: "",
    whatsapp: tenant.whatsapp ?? null,
    logoUrl: tenant.logoUrl ?? null,
    primaryColor: tenant.primaryColor ?? null,
    secondaryColor: tenant.secondaryColor ?? null,
    status: tenant.status,
    subscriptionStatus: tenant.subscriptionStatus,
    subscriptionPlan: tenant.subscriptionPlan ?? null,
    trialEndsAt: tenant.trialEndsAt.toISOString(),
    subscriptionStartedAt: tenant.subscriptionStartedAt?.toISOString() ?? null,
    subscriptionEndsAt: tenant.subscriptionEndsAt?.toISOString() ?? null,
    createdAt: tenant.createdAt.toISOString(),
  };
}

router.get("/me", requireTenant, async (req: AuthRequest, res) => {
  try {
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, req.user!.tenantId!)).limit(1);

    if (!tenant) {
      res.status(404).json({ error: "NotFound", message: "Tenant não encontrado" });
      return;
    }

    res.json(formatTenant(tenant));
  } catch (err) {
    req.log.error({ err }, "Get tenant error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.patch("/me", requireTenant, async (req: AuthRequest, res) => {
  const parsed = updateTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Dados inválidos" });
    return;
  }

  try {
    const [updated] = await db
      .update(tenantsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(tenantsTable.id, req.user!.tenantId!))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "NotFound", message: "Tenant não encontrado" });
      return;
    }

    res.json(formatTenant(updated));
  } catch (err: any) {
    if (err?.code === "23505" && err?.constraint?.includes("slug")) {
      res.status(409).json({ error: "SlugConflict", message: "Este link já está em uso. Escolha outro." });
      return;
    }
    req.log.error({ err }, "Update tenant error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.get("/subscription", requireTenant, async (req: AuthRequest, res) => {
  try {
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, req.user!.tenantId!)).limit(1);

    if (!tenant) {
      res.status(404).json({ error: "NotFound", message: "Tenant não encontrado" });
      return;
    }

    const now = new Date();
    let subscriptionStatus = tenant.subscriptionStatus;

    if (subscriptionStatus === "trial" && tenant.trialEndsAt < now) {
      subscriptionStatus = "expired";
      await db.update(tenantsTable).set({ subscriptionStatus: "expired", updatedAt: new Date() }).where(eq(tenantsTable.id, tenant.id));
    }

    res.json({
      subscriptionStatus,
      subscriptionPlan: tenant.subscriptionPlan ?? null,
      trialEndsAt: tenant.trialEndsAt.toISOString(),
      subscriptionStartedAt: tenant.subscriptionStartedAt?.toISOString() ?? null,
      subscriptionEndsAt: tenant.subscriptionEndsAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Get subscription error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.post("/subscription/activate", requireTenant, async (req: AuthRequest, res) => {
  const parsed = activateSubscriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Dados inválidos" });
    return;
  }

  try {
    const { plan } = parsed.data;
    const now = new Date();
    const endsAt = plan === "annual"
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [updated] = await db
      .update(tenantsTable)
      .set({
        subscriptionStatus: "active",
        subscriptionPlan: plan,
        subscriptionStartedAt: now,
        subscriptionEndsAt: endsAt,
        updatedAt: new Date(),
      })
      .where(eq(tenantsTable.id, req.user!.tenantId!))
      .returning();

    res.json({
      subscriptionStatus: updated!.subscriptionStatus,
      subscriptionPlan: updated!.subscriptionPlan ?? null,
      trialEndsAt: updated!.trialEndsAt.toISOString(),
      subscriptionStartedAt: updated!.subscriptionStartedAt?.toISOString() ?? null,
      subscriptionEndsAt: updated!.subscriptionEndsAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Activate subscription error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.post("/subscription/cancel", requireTenant, async (req: AuthRequest, res) => {
  try {
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, req.user!.tenantId!)).limit(1);

    if (!tenant) {
      res.status(404).json({ error: "NotFound", message: "Tenant não encontrado" });
      return;
    }

    if (tenant.subscriptionStatus !== "active") {
      res.status(400).json({ error: "BadRequest", message: "Assinatura não está ativa" });
      return;
    }

    const [updated] = await db
      .update(tenantsTable)
      .set({ subscriptionStatus: "cancelled", updatedAt: new Date() })
      .where(eq(tenantsTable.id, req.user!.tenantId!))
      .returning();

    res.json({
      subscriptionStatus: updated!.subscriptionStatus,
      subscriptionPlan: updated!.subscriptionPlan ?? null,
      trialEndsAt: updated!.trialEndsAt.toISOString(),
      subscriptionStartedAt: updated!.subscriptionStartedAt?.toISOString() ?? null,
      subscriptionEndsAt: updated!.subscriptionEndsAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Cancel subscription error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.get("/public/:slug", async (req, res) => {
  try {
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, req.params.slug!)).limit(1);

    if (!tenant || tenant.status === "blocked") {
      res.status(404).json({ error: "NotFound", message: "Salon não encontrado" });
      return;
    }

    res.json({
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      whatsapp: tenant.whatsapp ?? null,
      logoUrl: tenant.logoUrl ?? null,
      primaryColor: tenant.primaryColor ?? null,
      secondaryColor: tenant.secondaryColor ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Get public tenant error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

export default router;
