import { db, usersTable, tenantsTable, servicesTable, availabilityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  // Check if super admin exists
  const existingAdmin = await db.select().from(usersTable).where(eq(usersTable.role, "super_admin")).limit(1);
  
  if (existingAdmin.length > 0) {
    console.log("Super admin already exists");
  } else {
    const hash = await bcrypt.hash("admin123", 12);
    const [admin] = await db.insert(usersTable).values({
      email: "admin@trancify.com",
      passwordHash: hash,
      role: "super_admin",
    }).returning();
    console.log("Super admin created:", admin.email);
  }

  // Check if demo tenant exists
  const existingTenant = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, "naira")).limit(1);
  
  if (existingTenant.length > 0) {
    console.log("Demo tenant already exists");
    process.exit(0);
  }

  const hash2 = await bcrypt.hash("tenant123", 12);
  const [tenantUser] = await db.insert(usersTable).values({
    email: "demo@salaodanaira.com.br",
    passwordHash: hash2,
    role: "tenant",
  }).returning();

  const [tenant] = await db.insert(tenantsTable).values({
    userId: tenantUser.id,
    slug: "naira",
    name: "Salão da Naíra",
    whatsapp: "5511999887766",
    primaryColor: "#6D1F3A",
    status: "active",
    plan: "professional",
  }).returning();

  console.log("Demo tenant created:", tenant.id);

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
  console.log("Services created");

  await db.insert(availabilityTable).values({
    tenantId: tenant.id,
    availableDays: [1, 2, 3, 4, 5, 6],
    startTime: "08:00",
    endTime: "17:00",
    slotIntervalMinutes: 30,
    breakAfterMinutes: 90,
    maxAppointmentsPerDay: 2,
    blockedDates: [],
  });
  console.log("Availability created");

  console.log("\n✅ Seed complete!");
  console.log("Super admin: admin@trancify.com / admin123");
  console.log("Demo tenant: demo@salaodanaira.com.br / tenant123");
  console.log("Client booking: /naira");
  
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
