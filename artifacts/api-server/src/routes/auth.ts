import { Router } from "express";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { db, usersTable, tenantsTable, pendingRegistrationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { signToken, comparePassword, hashPassword, requireAuth, MIN_PASSWORD_LENGTH, type AuthRequest } from "../lib/auth.js";
import { logger } from "../lib/logger.js";
import { z } from "zod";

const router = Router();

// ── Rate limiters ─────────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "TooManyRequests", message: "Muitas tentativas de login. Tente novamente em 15 minutos." },
  skipSuccessfulRequests: false,
});

const sensitiveOpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "TooManyRequests", message: "Muitas tentativas. Tente novamente em 15 minutos." },
});

const registerLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: process.env.NODE_ENV === "development" ? 50 : 3,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown"),
  message: {
    error: "TooManyRequests",
    message: "Limite de cadastros por IP atingido. Por segurança, permitimos no máximo 3 cadastros por endereço de rede a cada 24 horas. Tente novamente amanhã ou entre em contato: contato@trancify.com.br",
  },
});

// ── Schemas ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  ownerName: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  cpf: z.string().min(11).max(14).optional(),
  cnpj: z.string().min(14).max(18).optional(),
  salonName: z.string().min(2, "Nome do salão deve ter ao menos 2 caracteres"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "URL deve conter apenas letras minúsculas, números e hífens"),
  whatsapp: z.string().min(10, "WhatsApp inválido"),
  cep: z.string().min(8),
  address: z.string().min(5),
  neighborhood: z.string().optional(),
  addressNumber: z.string().optional(),
  addressComplement: z.string().optional(),
  city: z.string().min(2),
  state: z.string().length(2),
  plan: z.enum(["monthly", "annual"]),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH),
});

const changeEmailSchema = z.object({
  currentPassword: z.string().min(1),
  newEmail: z.string().email().max(254),
});

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /register — saves pending registration, returns payment link token
router.post("/register", registerLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "ValidationError",
      message: parsed.error.issues.map((i) => i.message).join("; "),
    });
    return;
  }

  const d = parsed.data;
  const ip = req.ip ?? "unknown";

  if (!d.cpf && !d.cnpj) {
    res.status(400).json({ error: "ValidationError", message: "Informe CPF ou CNPJ." });
    return;
  }

  try {
    const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, d.email.toLowerCase())).limit(1);
    if (existingUser) {
      res.status(409).json({ error: "Conflict", message: "Este email já está cadastrado." });
      return;
    }

    const [existingSlug] = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, d.slug)).limit(1);
    if (existingSlug) {
      res.status(409).json({ error: "Conflict", message: "Esta URL de salão já está em uso. Escolha outra." });
      return;
    }

    const passwordHash = await hashPassword(d.password);

    const [pending] = await db.insert(pendingRegistrationsTable).values({
      ownerName: d.ownerName.trim(),
      email: d.email.toLowerCase(),
      passwordHash,
      birthDate: d.birthDate,
      cpf: d.cpf ?? null,
      cnpj: d.cnpj ?? null,
      salonName: d.salonName.trim(),
      slug: d.slug,
      whatsapp: d.whatsapp,
      cep: d.cep,
      address: d.address.trim(),
      neighborhood: d.neighborhood ?? null,
      addressNumber: d.addressNumber ?? null,
      addressComplement: d.addressComplement ?? null,
      city: d.city.trim(),
      state: d.state,
      plan: d.plan,
      registrationIp: ip,
    }).returning();

    const origin = req.headers.origin ?? `https://${req.headers.host}`;
    const paymentLink = `${origin}/cadastro/completar/${pending!.token}`;

    logger.info({ pendingId: pending!.id, slug: d.slug, ip }, "Pending registration created");

    res.status(201).json({ token: pending!.token, paymentLink });
  } catch (err) {
    req.log.error({ err }, "Register pending error");
    res.status(500).json({ error: "InternalError", message: "Erro interno. Tente novamente." });
  }
});

// GET /register/complete/:token — completes registration (creates user + tenant)
router.get("/register/complete/:token", async (req, res) => {
  const { token } = req.params;
  if (!token) {
    res.status(400).json({ error: "BadRequest", message: "Token inválido." });
    return;
  }

  try {
    const [pending] = await db
      .select()
      .from(pendingRegistrationsTable)
      .where(eq(pendingRegistrationsTable.token, token))
      .limit(1);

    if (!pending) {
      res.status(404).json({ error: "NotFound", message: "Link inválido ou expirado." });
      return;
    }

    if (pending.completed === "yes") {
      res.status(409).json({ error: "Conflict", message: "Este link já foi utilizado. Faça login para acessar sua conta." });
      return;
    }

    if (new Date() > pending.expiresAt) {
      res.status(410).json({ error: "Gone", message: "Este link expirou. Faça um novo cadastro." });
      return;
    }

    const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, pending.email)).limit(1);
    if (existingUser) {
      res.status(409).json({ error: "Conflict", message: "Este email já está cadastrado. Faça login." });
      return;
    }

    const [existingSlug] = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, pending.slug)).limit(1);
    if (existingSlug) {
      res.status(409).json({ error: "Conflict", message: "Esta URL de salão já está em uso. Faça um novo cadastro." });
      return;
    }

    const [user] = await db.insert(usersTable).values({
      email: pending.email,
      passwordHash: pending.passwordHash,
      role: "tenant",
    }).returning();

    const [tenant] = await db.insert(tenantsTable).values({
      userId: user!.id,
      name: pending.salonName,
      slug: pending.slug,
      whatsapp: pending.whatsapp ?? undefined,
      ownerName: pending.ownerName,
      birthDate: pending.birthDate ?? undefined,
      cpf: pending.cpf ?? undefined,
      cnpj: pending.cnpj ?? undefined,
      address: pending.address ?? undefined,
      neighborhood: pending.neighborhood ?? undefined,
      addressNumber: pending.addressNumber ?? undefined,
      addressComplement: pending.addressComplement ?? undefined,
      cep: pending.cep ?? undefined,
      city: pending.city ?? undefined,
      state: pending.state ?? undefined,
      subscriptionPlan: (pending.plan as "monthly" | "annual"),
      registrationIp: pending.registrationIp ?? undefined,
    }).returning();

    await db
      .update(pendingRegistrationsTable)
      .set({ completed: "yes", completedAt: new Date() })
      .where(eq(pendingRegistrationsTable.id, pending.id));

    const jwtToken = signToken({
      userId: user!.id,
      email: user!.email,
      role: "tenant",
      tenantId: tenant!.id,
      tenantSlug: tenant!.slug,
    });

    logger.info({ userId: user!.id, slug: tenant!.slug }, "Registration completed via payment link");

    res.status(201).json({
      token: jwtToken,
      user: {
        id: user!.id,
        email: user!.email,
        role: user!.role,
        tenantId: tenant!.id,
        tenantSlug: tenant!.slug,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Complete registration error");
    res.status(500).json({ error: "InternalError", message: "Erro interno. Tente novamente." });
  }
});

// POST /register/trial — creates account immediately in trial (no payment required)
router.post("/register/trial", registerLimiter, async (req, res) => {
  const trialSchema = registerSchema.omit({ plan: true });
  const parsed = trialSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "ValidationError",
      message: parsed.error.issues.map((i) => i.message).join("; "),
    });
    return;
  }

  const d = parsed.data;
  const ip = req.ip ?? "unknown";

  if (!d.cpf && !d.cnpj) {
    res.status(400).json({ error: "ValidationError", message: "Informe CPF ou CNPJ." });
    return;
  }

  try {
    const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, d.email.toLowerCase())).limit(1);
    if (existingUser) {
      res.status(409).json({ error: "Conflict", message: "Este email já está cadastrado." });
      return;
    }

    const [existingSlug] = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, d.slug)).limit(1);
    if (existingSlug) {
      res.status(409).json({ error: "Conflict", message: "Esta URL de salão já está em uso. Escolha outra." });
      return;
    }

    const passwordHash = await hashPassword(d.password);

    const [user] = await db.insert(usersTable).values({
      email: d.email.toLowerCase(),
      passwordHash,
      role: "tenant",
    }).returning();

    const [tenant] = await db.insert(tenantsTable).values({
      userId: user!.id,
      name: d.salonName.trim(),
      slug: d.slug,
      whatsapp: d.whatsapp,
      ownerName: d.ownerName.trim(),
      birthDate: d.birthDate,
      cpf: d.cpf ?? null,
      cnpj: d.cnpj ?? null,
      address: d.address.trim(),
      neighborhood: d.neighborhood ?? null,
      addressNumber: d.addressNumber ?? null,
      addressComplement: d.addressComplement ?? null,
      cep: d.cep,
      city: d.city.trim(),
      state: d.state,
      registrationIp: ip,
    }).returning();

    const jwtToken = signToken({
      userId: user!.id,
      email: user!.email,
      role: "tenant",
      tenantId: tenant!.id,
      tenantSlug: tenant!.slug,
    });

    logger.info({ userId: user!.id, slug: tenant!.slug }, "Trial registration created directly");

    res.status(201).json({
      token: jwtToken,
      user: {
        id: user!.id,
        email: user!.email,
        role: user!.role,
        tenantId: tenant!.id,
        tenantSlug: tenant!.slug,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Trial registration error");
    res.status(500).json({ error: "InternalError", message: "Erro interno. Tente novamente." });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Invalid email or password format" });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);

    if (!user) {
      logger.warn({ email }, "Login attempt: user not found");
      res.status(401).json({ error: "Unauthorized", message: "Email ou senha inválidos" });
      return;
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      logger.warn({ userId: user.id, email: user.email }, "Login attempt: wrong password");
      res.status(401).json({ error: "Unauthorized", message: "Email ou senha inválidos" });
      return;
    }

    let tenantId: string | undefined;
    let tenantSlug: string | undefined;

    if (user.role === "tenant") {
      const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.userId, user.id)).limit(1);
      if (tenant) {
        if (tenant.status === "blocked") {
          const now = new Date();
          const blockAt = tenant.blockAt;
          if (!blockAt || blockAt <= now) {
            logger.warn({ userId: user.id }, "Login attempt: account blocked");
            res.status(403).json({ error: "Forbidden", message: "Sua conta está bloqueada. Entre em contato com o suporte." });
            return;
          }
        }
        tenantId = tenant.id;
        tenantSlug = tenant.slug;
        await db.update(tenantsTable).set({ lastActiveAt: new Date() }).where(eq(tenantsTable.id, tenant.id));
      }
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role as "tenant" | "super_admin",
      tenantId,
      tenantSlug,
    });

    logger.info({ userId: user.id, role: user.role }, "Login successful");

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: tenantId ?? null,
        tenantSlug: tenantSlug ?? null,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.post("/logout", (_req, res) => {
  res.json({ message: "Logout realizado com sucesso" });
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  res.json({
    id: user.userId,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId ?? null,
    tenantSlug: user.tenantSlug ?? null,
  });
});

router.post("/change-password", requireAuth, sensitiveOpLimiter, async (req: AuthRequest, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "ValidationError",
      message: `Dados inválidos. A nova senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    });
    return;
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);

    if (!user) {
      res.status(404).json({ error: "NotFound", message: "Usuário não encontrado" });
      return;
    }

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) {
      logger.warn({ userId: user.id }, "Change password attempt: wrong current password");
      res.status(401).json({ error: "Unauthorized", message: "Senha atual incorreta" });
      return;
    }

    const newHash = await hashPassword(newPassword);
    await db.update(usersTable).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(usersTable.id, user.id));

    logger.info({ userId: user.id }, "Password changed successfully");
    res.json({ message: "Senha alterada com sucesso" });
  } catch (err) {
    req.log.error({ err }, "Change password error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

router.post("/change-email", requireAuth, sensitiveOpLimiter, async (req: AuthRequest, res) => {
  const parsed = changeEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Dados inválidos" });
    return;
  }

  const { currentPassword, newEmail } = parsed.data;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);

    if (!user) {
      res.status(404).json({ error: "NotFound", message: "Usuário não encontrado" });
      return;
    }

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) {
      logger.warn({ userId: user.id }, "Change email attempt: wrong password");
      res.status(401).json({ error: "Unauthorized", message: "Senha atual incorreta" });
      return;
    }

    const emailLower = newEmail.toLowerCase();
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, emailLower)).limit(1);
    if (existing && existing.id !== user.id) {
      res.status(409).json({ error: "Conflict", message: "Este e-mail já está em uso" });
      return;
    }

    await db.update(usersTable).set({ email: emailLower, updatedAt: new Date() }).where(eq(usersTable.id, user.id));

    logger.info({ userId: user.id }, "Email changed successfully");
    res.json({ message: "E-mail alterado com sucesso" });
  } catch (err) {
    req.log.error({ err }, "Change email error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

export default router;
