import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { appointmentsTable } from "./appointments";

export const reviewsTable = pgTable("reviews", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  appointmentId: text("appointment_id").references(() => appointmentsTable.id, { onDelete: "set null" }),
  clientName: text("client_name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  isApproved: boolean("is_approved").notNull().default(false),
  isPublic: boolean("is_public").notNull().default(false),
  token: text("token").notNull().$defaultFn(() => crypto.randomUUID()).unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Review = typeof reviewsTable.$inferSelect;
