import {
  db,
  usersTable,
  tenantsTable,
  servicesTable,
  availabilityTable,
  clientsTable,
  appointmentsTable,
  reviewsTable,
  paymentAttemptsTable,
  subscriptionOrdersTable,
  pendingRegistrationsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { SEED } from "./constants";
import { addDays, buildAvailableDates, daysFromNow, hashPassword } from "./helpers";

/** Seg–Sáb — alinhado ao fluxo público que exige `availableDates` explícitas. */
const DEMO_AVAILABLE_DAYS = [1, 2, 3, 4, 5, 6];

const DEFAULT_SERVICES = [
  { name: "Box Braids", durationHours: 5, priceSmall: 170, priceLarge: 200, sizeDependent: true },
  { name: "Twist Braids", durationHours: 5, priceSmall: 170, priceLarge: 200, sizeDependent: true },
  { name: "Gypsy / Boho Braids", durationHours: 5, priceSmall: 170, priceLarge: 200, sizeDependent: true },
  { name: "French Curl Braids", durationHours: 4, priceSmall: 200, priceLarge: 200, sizeDependent: false },
  { name: "Chanel", durationHours: 4, priceSmall: 170, priceLarge: 170, sizeDependent: false },
  { name: "Faux Locs Individual", durationHours: 5, priceSmall: 250, priceLarge: 250, sizeDependent: false },
  { name: "Faux Locs Método Crochê", durationHours: 4, priceSmall: 350, priceLarge: 350, sizeDependent: false },
  { name: "Fulani Braids", durationHours: 4, priceSmall: 170, priceLarge: 170, sizeDependent: false },
  { name: "Fulani Braids com Cachos", durationHours: 5, priceSmall: 250, priceLarge: 250, sizeDependent: false },
];

const BELA_SERVICES = [
  { name: "Knotless Braids", durationHours: 4, priceSmall: 180, priceLarge: 220, sizeDependent: true },
  { name: "Passion Twists", durationHours: 4, priceSmall: 160, priceLarge: 190, sizeDependent: true },
  { name: "Cornrows", durationHours: 2, priceSmall: 120, priceLarge: 120, sizeDependent: false },
];

async function ensureSuperAdmin() {
  const existing = await db.select().from(usersTable).where(eq(usersTable.role, "super_admin")).limit(1);
  if (existing.length > 0) {
    console.log("Super admin already exists");
    return;
  }
  await db.insert(usersTable).values({
    email: SEED.admin.email,
    passwordHash: await hashPassword(SEED.admin.password),
    role: "super_admin",
  });
  console.log("Super admin created:", SEED.admin.email);
}

async function ensureTenantUser(email: string, password: string) {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing) return existing;
  const [user] = await db
    .insert(usersTable)
    .values({
      email,
      passwordHash: await hashPassword(password),
      role: "tenant",
    })
    .returning();
  if (!user) throw new Error(`Failed to create tenant user ${email}`);
  return user;
}

type TenantConfig = (typeof SEED.tenants)[keyof typeof SEED.tenants] & {
  subscriptionStatus: "trial" | "active" | "cancelled" | "expired" | "paused";
  subscriptionPlan?: "monthly" | "annual";
};

async function ensureTenant(config: TenantConfig) {
  let [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, config.slug)).limit(1);

  if (!tenant) {
    const user = await ensureTenantUser(config.email, config.password);
    [tenant] = await db
      .insert(tenantsTable)
      .values({
        userId: user.id,
        slug: config.slug,
        name: config.name,
        ownerName: "ownerName" in config ? config.ownerName : undefined,
        whatsapp: config.whatsapp,
        primaryColor: config.primaryColor,
        secondaryColor: "secondaryColor" in config ? config.secondaryColor : undefined,
        cpf: "cpf" in config ? config.cpf : undefined,
        address: "address" in config ? config.address : undefined,
        addressNumber: "addressNumber" in config ? config.addressNumber : undefined,
        neighborhood: "neighborhood" in config ? config.neighborhood : undefined,
        city: "city" in config ? config.city : undefined,
        state: "state" in config ? config.state : undefined,
        cep: "cep" in config ? config.cep : undefined,
        status: "active",
        subscriptionStatus: config.subscriptionStatus,
        subscriptionPlan: config.subscriptionPlan,
        subscriptionStartedAt: config.subscriptionStatus === "active" ? daysFromNow(-30) : null,
        subscriptionEndsAt: config.subscriptionStatus === "active" ? daysFromNow(335) : null,
        trialEndsAt: daysFromNow(7),
        lastActiveAt: new Date(),
      })
      .returning();
    console.log(`Tenant created: ${config.slug}`);
  } else {
    await db
      .update(tenantsTable)
      .set({
        name: config.name,
        ownerName: "ownerName" in config ? config.ownerName : tenant.ownerName,
        whatsapp: config.whatsapp,
        primaryColor: config.primaryColor,
        secondaryColor: "secondaryColor" in config ? config.secondaryColor : tenant.secondaryColor,
        cpf: "cpf" in config ? config.cpf : tenant.cpf,
        address: "address" in config ? config.address : tenant.address,
        addressNumber: "addressNumber" in config ? config.addressNumber : tenant.addressNumber,
        neighborhood: "neighborhood" in config ? config.neighborhood : tenant.neighborhood,
        city: "city" in config ? config.city : tenant.city,
        state: "state" in config ? config.state : tenant.state,
        cep: "cep" in config ? config.cep : tenant.cep,
        subscriptionStatus: config.subscriptionStatus,
        subscriptionPlan: config.subscriptionPlan ?? tenant.subscriptionPlan,
        subscriptionStartedAt:
          config.subscriptionStatus === "active" ? tenant.subscriptionStartedAt ?? daysFromNow(-30) : tenant.subscriptionStartedAt,
        subscriptionEndsAt:
          config.subscriptionStatus === "active" ? tenant.subscriptionEndsAt ?? daysFromNow(335) : tenant.subscriptionEndsAt,
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tenantsTable.id, tenant.id));
    console.log(`Tenant updated: ${config.slug}`);
  }

  if (!tenant) throw new Error(`Tenant ${config.slug} missing after upsert`);
  return tenant;
}

async function ensureServices(tenantId: string, services: typeof DEFAULT_SERVICES) {
  const existing = await db.select().from(servicesTable).where(eq(servicesTable.tenantId, tenantId));
  if (existing.length > 0) return existing;

  for (const svc of services) {
    await db.insert(servicesTable).values({ ...svc, tenantId });
  }
  console.log(`Services created for tenant ${tenantId}`);
  return db.select().from(servicesTable).where(eq(servicesTable.tenantId, tenantId));
}

async function ensureAvailability(tenantId: string): Promise<string[]> {
  const availableDates = buildAvailableDates(DEMO_AVAILABLE_DAYS, 60);
  const payload = {
    availableDays: DEMO_AVAILABLE_DAYS,
    availableDates,
    startTime: "08:00",
    endTime: "17:00",
    slotIntervalMinutes: 30,
    breakAfterMinutes: 90,
    maxAppointmentsPerDay: 4,
    blockedDates: [] as string[],
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select()
    .from(availabilityTable)
    .where(eq(availabilityTable.tenantId, tenantId))
    .limit(1);

  if (existing) {
    await db.update(availabilityTable).set(payload).where(eq(availabilityTable.id, existing.id));
    console.log(`Availability refreshed for tenant ${tenantId} (${availableDates.length} dates)`);
  } else {
    await db.insert(availabilityTable).values({ tenantId, ...payload });
    console.log(`Availability created for tenant ${tenantId} (${availableDates.length} dates)`);
  }

  return availableDates;
}

async function ensureClient(
  tenantId: string,
  client: (typeof SEED.clients)[keyof typeof SEED.clients]
) {
  const [existing] = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.tenantId, tenantId), eq(clientsTable.cpf, client.cpf)))
    .limit(1);
  if (existing) return;

  await db.insert(clientsTable).values({
    tenantId,
    cpf: client.cpf,
    name: client.name,
    phone: client.phone,
    age: client.age,
    hairDescription: client.hairDescription,
  });
  console.log(`Client created: ${client.name}`);
}

async function ensureNairaOperationalData(
  tenantId: string,
  services: typeof servicesTable.$inferSelect[],
  availableDates: string[]
) {
  const serviceByName = (name: string) => services.find((s) => s.name === name) ?? services[0]!;
  const pickFutureDate = (index: number) =>
    availableDates[Math.min(index, Math.max(availableDates.length - 1, 0))] ?? addDays(index + 1);

  const [marker] = await db
    .select()
    .from(appointmentsTable)
    .where(and(eq(appointmentsTable.tenantId, tenantId), eq(appointmentsTable.reviewToken, SEED.tokens.reviewOpen)))
    .limit(1);

  if (!marker) {
    for (const cpf of [SEED.clients.ana.cpf, SEED.clients.maria.cpf]) {
      await db
        .delete(appointmentsTable)
        .where(and(eq(appointmentsTable.tenantId, tenantId), eq(appointmentsTable.clientCpf, cpf)));
    }

    const specs = [
      {
        key: "today-confirmed",
        serviceName: "Box Braids",
        date: pickFutureDate(0),
        time: "10:00",
        status: "confirmed" as const,
        bookingType: "appointment",
        paymentStatus: "fully_paid",
        servicePrice: 200,
        depositAmount: 100,
        paidAmount: 200,
        materialCost: null as number | null,
        client: SEED.clients.ana,
        reviewToken: SEED.tokens.reviewSubmitted,
      },
      {
        key: "future-unpaid",
        serviceName: "Twist Braids",
        date: pickFutureDate(2),
        time: "09:00",
        status: "pending" as const,
        bookingType: "pre_appointment",
        paymentStatus: "unpaid",
        servicePrice: 200,
        depositAmount: 100,
        paidAmount: 0,
        materialCost: null,
        client: SEED.clients.ana,
        reviewToken: crypto.randomUUID(),
      },
      {
        key: "future-deposit",
        serviceName: "Gypsy / Boho Braids",
        date: pickFutureDate(5),
        time: "14:00",
        status: "confirmed" as const,
        bookingType: "appointment",
        paymentStatus: "deposit_paid",
        servicePrice: 200,
        depositAmount: 100,
        paidAmount: 100,
        materialCost: null,
        client: SEED.clients.ana,
        reviewToken: crypto.randomUUID(),
      },
      {
        key: "completed-profit",
        serviceName: "Fulani Braids",
        date: addDays(-21),
        time: "10:30",
        status: "completed" as const,
        bookingType: "appointment",
        paymentStatus: "fully_paid",
        servicePrice: 170,
        depositAmount: 85,
        paidAmount: 170,
        materialCost: 45,
        client: SEED.clients.ana,
        reviewToken: SEED.tokens.reviewOpen,
      },
      {
        key: "maria-completed",
        serviceName: "Chanel",
        date: addDays(-7),
        time: "15:00",
        status: "completed" as const,
        bookingType: "appointment",
        paymentStatus: "fully_paid",
        servicePrice: 170,
        depositAmount: 85,
        paidAmount: 170,
        materialCost: 30,
        client: SEED.clients.maria,
        reviewToken: crypto.randomUUID(),
      },
      {
        key: "cancelled",
        serviceName: "French Curl Braids",
        date: addDays(-3),
        time: "11:00",
        status: "cancelled" as const,
        bookingType: "appointment",
        paymentStatus: "unpaid",
        servicePrice: 200,
        depositAmount: 100,
        paidAmount: 0,
        materialCost: null,
        client: SEED.clients.maria,
        reviewToken: crypto.randomUUID(),
      },
    ];

    for (const spec of specs) {
      const service = serviceByName(spec.serviceName);
      const [appt] = await db
        .insert(appointmentsTable)
        .values({
          tenantId,
          serviceId: service.id,
          serviceName: spec.serviceName,
          clientName: spec.client.name,
          clientAge: spec.client.age,
          clientPhone: spec.client.phone,
          hairDescription: spec.client.hairDescription,
          paymentMethod: "pix",
          braidSize: "waist_butt",
          servicePrice: spec.servicePrice,
          materialCost: spec.materialCost,
          date: spec.date,
          time: spec.time,
          status: spec.status,
          bookingType: spec.bookingType,
          paymentStatus: spec.paymentStatus,
          clientCpf: spec.client.cpf,
          depositAmount: spec.depositAmount,
          paidAmount: spec.paidAmount,
          depositDeadline: addDays(2),
          paidAt: spec.paidAmount > 0 ? new Date() : null,
          reviewToken: spec.reviewToken,
          notes: `Agendamento demo (${spec.key})`,
        })
        .returning();

      if (appt && spec.paidAmount > 0) {
        await db.insert(paymentAttemptsTable).values({
          tenantId,
          appointmentId: appt.id,
          orderNsu: `seed-${spec.key}`,
          paymentType: spec.paymentStatus === "fully_paid" ? "full" : "deposit",
          amount: spec.paidAmount,
          status: "paid",
          provider: "simulated",
          paidAt: new Date(),
        });
      }
    }
    console.log("Demo appointments and payments created");
  } else {
    console.log("Demo appointments already exist");
  }

  const [hasReviews] = await db.select().from(reviewsTable).where(eq(reviewsTable.tenantId, tenantId)).limit(1);
  if (!hasReviews) {
    const [submittedAppt] = await db
      .select()
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.tenantId, tenantId), eq(appointmentsTable.reviewToken, SEED.tokens.reviewSubmitted)))
      .limit(1);

    if (submittedAppt) {
      await db.insert(reviewsTable).values({
        tenantId,
        appointmentId: submittedAppt.id,
        clientName: submittedAppt.clientName,
        rating: 5,
        comment: "Atendimento impecável! Voltarei com certeza.",
        isApproved: true,
        isPublic: true,
      });
    }

    await db.insert(reviewsTable).values({
      tenantId,
      appointmentId: null,
      clientName: "Juliana Mendes",
      rating: 4,
      comment: "Adorei o resultado, só demorou um pouco mais que o esperado.",
      isApproved: false,
      isPublic: false,
    });

    console.log("Demo reviews created");
  } else {
    console.log("Demo reviews already exist");
  }

  const [hasSubscription] = await db
    .select()
    .from(subscriptionOrdersTable)
    .where(eq(subscriptionOrdersTable.tenantId, tenantId))
    .limit(1);
  if (!hasSubscription) {
    await db.insert(subscriptionOrdersTable).values({
      tenantId,
      plan: "monthly",
      amountCents: 4990,
      status: "paid",
      paymentProvider: "simulated",
      paymentReference: "seed-subscription-naira",
      paidAt: daysFromNow(-30),
      periodStart: daysFromNow(-30),
      periodEnd: daysFromNow(335),
    });
    console.log("Demo subscription order created");
  }
}

async function ensurePendingRegistration() {
  const [existing] = await db
    .select()
    .from(pendingRegistrationsTable)
    .where(eq(pendingRegistrationsTable.token, SEED.tokens.pendingRegistration))
    .limit(1);
  if (existing) return;

  await db.insert(pendingRegistrationsTable).values({
    token: SEED.tokens.pendingRegistration,
    ownerName: "Carla Pendente",
    email: SEED.pendingRegistration.email,
    passwordHash: await hashPassword(SEED.pendingRegistration.password),
    salonName: SEED.pendingRegistration.salonName,
    slug: SEED.pendingRegistration.slug,
    whatsapp: "5511965432109",
    plan: SEED.pendingRegistration.plan,
    completed: "no",
    expiresAt: daysFromNow(7),
  });
  console.log("Pending registration created");
}

export async function runSeed() {
  await ensureSuperAdmin();

  const naira = await ensureTenant({
    ...SEED.tenants.naira,
    subscriptionStatus: "active",
    subscriptionPlan: "monthly",
  });
  const nairaServices = await ensureServices(naira.id, DEFAULT_SERVICES);
  const nairaDates = await ensureAvailability(naira.id);
  await ensureClient(naira.id, SEED.clients.ana);
  await ensureClient(naira.id, SEED.clients.maria);
  await ensureNairaOperationalData(naira.id, nairaServices, nairaDates);

  const bela = await ensureTenant({
    ...SEED.tenants.bela,
    subscriptionStatus: "trial",
  });
  await ensureServices(bela.id, BELA_SERVICES);
  await ensureAvailability(bela.id);

  await ensurePendingRegistration();

  console.log("\n✅ Seed complete!");
  console.log(`See SEED_CREDENTIALS.md for all demo access URLs and logins.`);
}
