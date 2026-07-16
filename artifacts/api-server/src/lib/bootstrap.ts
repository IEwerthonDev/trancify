import { db, usersTable, tenantsTable, servicesTable, availabilityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logger } from "./logger";

export async function bootstrapSeed(): Promise<void> {
  if (process.env["SKIP_BOOTSTRAP_SEED"] === "1") {
    logger.info("Bootstrap seed skipped (SKIP_BOOTSTRAP_SEED=1).");
    return;
  }

  try {
    const existingAdmin = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.role, "super_admin"))
      .limit(1);

    if (existingAdmin.length === 0) {
      const hash = await bcrypt.hash("admin123", 12);
      await db.insert(usersTable).values({
        email: "admin@trancify.com",
        passwordHash: hash,
        role: "super_admin",
      });
      logger.info("Bootstrap: super admin created (admin@trancify.com).");
    }

    const existingTenant = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, "naira"))
      .limit(1);

    if (existingTenant.length > 0) {
      return;
    }

    const tenantHash = await bcrypt.hash("tenant123", 12);
    const [tenantUser] = await db
      .insert(usersTable)
      .values({
        email: "demo@salaodanaira.com.br",
        passwordHash: tenantHash,
        role: "tenant",
      })
      .returning();

    if (!tenantUser) {
      logger.warn("Bootstrap: tenant user insert returned no row; aborting seed.");
      return;
    }

    const [tenant] = await db
      .insert(tenantsTable)
      .values({
        userId: tenantUser.id,
        slug: "naira",
        name: "Salão da Naíra",
        whatsapp: "5511999887766",
        primaryColor: "#6D1F3A",
        status: "active",
      })
      .returning();

    if (!tenant) {
      logger.warn("Bootstrap: tenant insert returned no row; aborting seed.");
      return;
    }

    const services = [
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

    for (const svc of services) {
      await db.insert(servicesTable).values({ ...svc, tenantId: tenant.id });
    }

    await db.insert(availabilityTable).values({
      tenantId: tenant.id,
      availableDays: [1, 2, 3, 4, 5, 6],
      availableDates: (() => {
        const dates: string[] = [];
        const allowed = new Set([1, 2, 3, 4, 5, 6]);
        const cursor = new Date();
        cursor.setHours(12, 0, 0, 0);
        for (let i = 0; i < 60; i++) {
          if (allowed.has(cursor.getDay())) {
            dates.push(cursor.toISOString().slice(0, 10));
          }
          cursor.setDate(cursor.getDate() + 1);
        }
        return dates;
      })(),
      startTime: "08:00",
      endTime: "17:00",
      slotIntervalMinutes: 30,
      breakAfterMinutes: 90,
      maxAppointmentsPerDay: 4,
      blockedDates: [],
    });

    logger.info("Bootstrap: demo tenant + 9 services + availability seeded.");
  } catch (err) {
    logger.error({ err }, "Bootstrap seed failed (non-fatal — server continues).");
  }
}
