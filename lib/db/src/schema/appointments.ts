import { pgTable, text, timestamp, integer, real, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { servicesTable } from "./services";

export const appointmentStatusEnum = pgEnum("appointment_status", ["pending", "confirmed", "cancelled", "completed"]);
export const paymentMethodEnum = pgEnum("payment_method", ["pix", "card", "cash"]);
export const braidSizeEnum = pgEnum("braid_size", ["mid_back", "waist_butt"]);

export const appointmentsTable = pgTable("appointments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  serviceId: text("service_id").notNull().references(() => servicesTable.id),
  serviceName: text("service_name").notNull(),
  clientName: text("client_name").notNull(),
  clientAge: integer("client_age"),
  clientPhone: text("client_phone"),
  hairDescription: text("hair_description"),
  referencePhotos: json("reference_photos").$type<string[]>().notNull().default([]),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  braidSize: braidSizeEnum("braid_size").notNull(),
  servicePrice: real("service_price").notNull(),
  materialCost: real("material_cost"),
  date: text("date").notNull(),
  time: text("time").notNull(),
  status: appointmentStatusEnum("status").notNull().default("pending"),
  token: text("token").notNull().$defaultFn(() => crypto.randomUUID()),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true, token: true, createdAt: true, updatedAt: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;
