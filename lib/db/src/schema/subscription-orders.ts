import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const orderStatusEnum = pgEnum("order_status", ["pending", "paid", "cancelled", "refunded", "expired"]);

export const subscriptionOrdersTable = pgTable("subscription_orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  plan: text("plan").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  paymentProvider: text("payment_provider").default("abacatepay"),
  paymentReference: text("payment_reference"),
  paymentLink: text("payment_link"),
  paidAt: timestamp("paid_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancelFeedback: text("cancel_feedback"),
  pauseFeedback: text("pause_feedback"),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SubscriptionOrder = typeof subscriptionOrdersTable.$inferSelect;
