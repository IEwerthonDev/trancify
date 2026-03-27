import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const tenantStatusEnum = pgEnum("tenant_status", ["active", "blocked"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["trial", "active", "cancelled", "expired"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["monthly", "annual"]);

export const tenantsTable = pgTable("tenants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),

  // Owner personal info
  ownerName: text("owner_name"),
  birthDate: text("birth_date"),
  cpf: text("cpf"),

  // Salon address
  address: text("address"),
  cep: text("cep"),
  state: text("state"),
  city: text("city"),

  // Salon settings
  whatsapp: text("whatsapp"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),

  // Account status
  status: tenantStatusEnum("status").notNull().default("active"),

  // Subscription
  subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default("trial"),
  subscriptionPlan: subscriptionPlanEnum("subscription_plan"),
  trialEndsAt: timestamp("trial_ends_at").notNull().$defaultFn(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  subscriptionStartedAt: timestamp("subscription_started_at"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  blockAt: timestamp("block_at"),
  lastActiveAt: timestamp("last_active_at"),

  // Payment card metadata (display only — never store raw card data)
  cardLast4: text("card_last4"),
  cardBrand: text("card_brand"),
  cardExpiryMonth: text("card_expiry_month"),
  cardExpiryYear: text("card_expiry_year"),

  // Anti-abuse
  registrationIp: text("registration_ip"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenantsTable.$inferSelect;
