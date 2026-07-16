import { pgTable, text, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { appointmentsTable } from "./appointments";

export const paymentAttemptStatusEnum = pgEnum("payment_attempt_status", [
  "pending",
  "paid",
  "failed",
]);

export const paymentAttemptTypeEnum = pgEnum("payment_attempt_type", [
  "deposit",
  "full",
]);

export const paymentAttemptsTable = pgTable("payment_attempts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  appointmentId: text("appointment_id").notNull().references(() => appointmentsTable.id, { onDelete: "cascade" }),

  // Unique order id sent to InfinitePay (order_nsu)
  orderNsu: text("order_nsu").notNull().unique(),

  paymentType: paymentAttemptTypeEnum("payment_type").notNull(),
  amount: real("amount").notNull(), // in reais
  status: paymentAttemptStatusEnum("status").notNull().default("pending"),

  // Whether this was a real InfinitePay link or a simulated payment
  provider: text("provider").notNull().default("infinitepay"), // "infinitepay" | "simulated"

  checkoutUrl: text("checkout_url"),
  transactionNsu: text("transaction_nsu"),
  invoiceSlug: text("invoice_slug"),
  captureMethod: text("capture_method"),
  receiptUrl: text("receipt_url"),
  failureReason: text("failure_reason"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
});

export type PaymentAttempt = typeof paymentAttemptsTable.$inferSelect;
