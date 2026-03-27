import { Router } from "express";
import { db, usersTable, tenantsTable, appointmentsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireSuperAdmin, hashPassword, type AuthRequest } from "../lib/auth.js";
import { z } from "zod";

const router = Router();

const createTenantSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  whatsapp: z.string().optional(),
});

const updateTenantSchema = z.object({
  name: z.string().optional(),
  ownerName: z.string().optional(),
  email: z.string().email().optional(),
  status: z.enum(["active", "blocked"]).optional(),
  subscriptionStatus: z.enum(["trial", "active", "cancelled", "expired"]).optional(),
  subscriptionPlan: z.enum(["monthly", "annual"]).optional(),
  blockAt: z.string().optional(),
  birthDate: z.string().optional(),
  cpf: z.string().optional(),
  address: z.string().optional(),
  cep: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  whatsapp: z.string().optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6),
});

function subscriptionLabel(t: typeof tenantsTable.$inferSelect): string {
  switch (t.subscriptionStatus) {
    case "trial": return "Período de teste";
    case "active": return t.subscriptionPlan === "annual" ? "Anual" : "Mensal";
    case "cancelled": return "Cancelada";
    case "expired": return "Expirada";
    default: return "-";
  }
}

async function formatAdminTenant(tenant: typeof tenantsTable.$inferSelect) {
  const user = await db.select().from(usersTable).where(eq(usersTable.id, tenant.userId)).limit(1);
  const apptCount = await db
    .select({ count: count() })
    .from(appointmentsTable)
    .where(eq(appointmentsTable.tenantId, tenant.id));

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    ownerName: tenant.ownerName ?? null,
    email: user[0]?.email ?? "",
    status: tenant.status,
    subscriptionStatus: tenant.subscriptionStatus,
    subscriptionPlan: tenant.subscriptionPlan ?? null,
    subscriptionLabel: subscriptionLabel(tenant),
    trialEndsAt: tenant.trialEndsAt.toISOString(),
    subscriptionStartedAt: tenant.subscriptionStartedAt?.toISOString() ?? null,
    subscriptionEndsAt: tenant.subscriptionEndsAt?.toISOString() ?? null,
    totalAppointments: apptCount[0]?.count ?? 0,
    createdAt: tenant.createdAt.toISOString(),
    lastActiveAt: tenant.lastActiveAt?.toISOString() ?? null,
    blockAt: tenant.blockAt?.toISOString() ?? null,
    // Personal & address info
    birthDate: tenant.birthDate ?? null,
    cpf: tenant.cpf ?? null,
    address: tenant.address ?? null,
    cep: tenant.cep ?? null,
    state: tenant.state ?? null,
    city: tenant.city ?? null,
    whatsapp: tenant.whatsapp ?? null,
    // Card metadata
    cardLast4: tenant.cardLast4 ?? null,
    cardBrand: tenant.cardBrand ?? null,
    cardExpiryMonth: tenant.cardExpiryMonth ?? null,
    cardExpiryYear: tenant.cardExpiryYear ?? null,
    registrationIp: tenant.registrationIp ?? null,
  };
}

router.get("/tenants", requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const tenants = await db.select().from(tenantsTable).orderBy(tenantsTable.createdAt);
    const formatted = await Promise.all(tenants.map(formatAdminTenant));
    res.json(formatted);
  } catch (err) {
    req.log.error({ err }, "Admin get tenants error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.post("/tenants", requireSuperAdmin, async (req: AuthRequest, res) => {
  const parsed = createTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Dados inválidos: " + parsed.error.issues.map(i => i.message).join(", ") });
    return;
  }

  const { name, email, password, slug, whatsapp } = parsed.data;

  try {
    const existingEmail = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existingEmail.length > 0) {
      res.status(409).json({ error: "Conflict", message: "Email já cadastrado" });
      return;
    }

    const existingSlug = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, slug)).limit(1);
    if (existingSlug.length > 0) {
      res.status(409).json({ error: "Conflict", message: "Slug já em uso" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(usersTable).values({ email: email.toLowerCase(), passwordHash, role: "tenant" }).returning();

    const [tenant] = await db
      .insert(tenantsTable)
      .values({ userId: user!.id, name, slug, whatsapp })
      .returning();

    res.status(201).json(await formatAdminTenant(tenant!));
  } catch (err) {
    req.log.error({ err }, "Admin create tenant error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.patch("/tenants/:id", requireSuperAdmin, async (req: AuthRequest, res) => {
  const parsed = updateTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Dados inválidos" });
    return;
  }

  try {
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, req.params.id!)).limit(1);

    if (!tenant) {
      res.status(404).json({ error: "NotFound", message: "Tenant não encontrado" });
      return;
    }

    const updateData: Partial<typeof tenantsTable.$inferInsert> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.ownerName !== undefined) updateData.ownerName = parsed.data.ownerName;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.subscriptionStatus !== undefined) updateData.subscriptionStatus = parsed.data.subscriptionStatus;
    if (parsed.data.subscriptionPlan !== undefined) updateData.subscriptionPlan = parsed.data.subscriptionPlan;
    if (parsed.data.blockAt) updateData.blockAt = new Date(parsed.data.blockAt);
    if (parsed.data.birthDate !== undefined) updateData.birthDate = parsed.data.birthDate;
    if (parsed.data.cpf !== undefined) updateData.cpf = parsed.data.cpf;
    if (parsed.data.address !== undefined) updateData.address = parsed.data.address;
    if (parsed.data.cep !== undefined) updateData.cep = parsed.data.cep;
    if (parsed.data.state !== undefined) updateData.state = parsed.data.state;
    if (parsed.data.city !== undefined) updateData.city = parsed.data.city;
    if (parsed.data.whatsapp !== undefined) updateData.whatsapp = parsed.data.whatsapp;

    const [updated] = await db
      .update(tenantsTable)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(tenantsTable.id, req.params.id!))
      .returning();

    if (parsed.data.email) {
      await db
        .update(usersTable)
        .set({ email: parsed.data.email.toLowerCase(), updatedAt: new Date() })
        .where(eq(usersTable.id, tenant.userId));
    }

    res.json(await formatAdminTenant(updated!));
  } catch (err) {
    req.log.error({ err }, "Admin update tenant error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.delete("/tenants/:id", requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, req.params.id!)).limit(1);

    if (!tenant) {
      res.status(404).json({ error: "NotFound", message: "Tenant não encontrado" });
      return;
    }

    await db.delete(tenantsTable).where(eq(tenantsTable.id, tenant.id));
    await db.delete(usersTable).where(eq(usersTable.id, tenant.userId));

    res.json({ message: "Tenant excluído com sucesso" });
  } catch (err) {
    req.log.error({ err }, "Admin delete tenant error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.post("/tenants/:id/reset-password", requireSuperAdmin, async (req: AuthRequest, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Senha inválida (mínimo 6 caracteres)" });
    return;
  }

  try {
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, req.params.id!)).limit(1);

    if (!tenant) {
      res.status(404).json({ error: "NotFound", message: "Tenant não encontrado" });
      return;
    }

    const newHash = await hashPassword(parsed.data.newPassword);
    await db.update(usersTable).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(usersTable.id, tenant.userId));

    res.json({ message: "Senha redefinida com sucesso" });
  } catch (err) {
    req.log.error({ err }, "Admin reset password error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.get("/stats", requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const tenants = await db.select().from(tenantsTable);
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t) => t.status === "active").length;
    const blockedTenants = tenants.filter((t) => t.status === "blocked").length;

    const appointments = await db.select().from(appointmentsTable);
    const totalAppointments = appointments.length;
    const totalRevenue = appointments.reduce((sum, a) => sum + a.servicePrice, 0);

    const monthlyMap = new Map<string, { appointments: number; revenue: number; profit: number }>();
    for (const appt of appointments) {
      const month = appt.date.slice(0, 7);
      const existing = monthlyMap.get(month) ?? { appointments: 0, revenue: 0, profit: 0 };
      existing.appointments++;
      existing.revenue += appt.servicePrice;
      existing.profit += appt.servicePrice - (appt.materialCost ?? 0);
      monthlyMap.set(month, existing);
    }

    const monthlyData = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    res.json({
      totalTenants,
      activeTenants,
      blockedTenants,
      totalAppointments,
      totalRevenue,
      monthlyData,
    });
  } catch (err) {
    req.log.error({ err }, "Admin stats error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

export default router;
