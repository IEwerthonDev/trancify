import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const pendingRegistrationsTable = pgTable("pending_registrations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  token: text("token").notNull().unique().$defaultFn(() => crypto.randomUUID()),
  ownerName: text("owner_name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  birthDate: text("birth_date"),
  cpf: text("cpf"),
  cnpj: text("cnpj"),
  salonName: text("salon_name").notNull(),
  slug: text("slug").notNull(),
  whatsapp: text("whatsapp"),
  cep: text("cep"),
  address: text("address"),
  neighborhood: text("neighborhood"),
  addressNumber: text("address_number"),
  addressComplement: text("address_complement"),
  city: text("city"),
  state: text("state"),
  plan: text("plan").notNull(),
  registrationIp: text("registration_ip"),
  completed: text("completed").default("no"),
  expiresAt: timestamp("expires_at").notNull().$defaultFn(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PendingRegistration = typeof pendingRegistrationsTable.$inferSelect;
