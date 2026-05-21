import { pgTable, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const clientsTable = pgTable(
  "clients",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    cpf: text("cpf").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    age: integer("age"),
    hairDescription: text("hair_description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    tenantCpfUnique: uniqueIndex("clients_tenant_cpf_unique").on(t.tenantId, t.cpf),
  })
);

export type Client = typeof clientsTable.$inferSelect;
export type InsertClient = typeof clientsTable.$inferInsert;
