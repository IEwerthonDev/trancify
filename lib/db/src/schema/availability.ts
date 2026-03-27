import { pgTable, text, timestamp, integer, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const availabilityTable = pgTable("availability", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().unique().references(() => tenantsTable.id, { onDelete: "cascade" }),
  availableDays: json("available_days").$type<number[]>().notNull().default([1, 2, 3, 4, 5]),
  startTime: text("start_time").notNull().default("08:00"),
  endTime: text("end_time").notNull().default("17:00"),
  slotIntervalMinutes: integer("slot_interval_minutes").notNull().default(30),
  breakAfterMinutes: integer("break_after_minutes").notNull().default(90),
  maxAppointmentsPerDay: integer("max_appointments_per_day").notNull().default(2),
  availableDates: json("available_dates").$type<string[]>().notNull().default([]),
  blockedDates: json("blocked_dates").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAvailabilitySchema = createInsertSchema(availabilityTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type Availability = typeof availabilityTable.$inferSelect;
