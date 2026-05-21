import { db, appointmentsTable, tenantsTable } from "@workspace/db";
import { eq, and, isNull, inArray, lte, sql } from "drizzle-orm";
import { sendReminderNotification, sendReviewRequestNotification } from "./whatsapp.js";
import { logger } from "./logger.js";

const FIVE_MINUTES = 5 * 60 * 1000;

function getAppointmentDateTime(appt: { date: string; time: string }): Date {
  return new Date(`${appt.date}T${appt.time}:00`);
}

async function runRemindersTick(): Promise<void> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const past1h = new Date(now.getTime() - 1 * 60 * 60 * 1000);

  try {
    const upcoming = await db
      .select()
      .from(appointmentsTable)
      .where(inArray(appointmentsTable.status, ["pending", "confirmed"]));

    const completed = await db
      .select()
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.status, "completed"),
          isNull(appointmentsTable.reviewRequestSent),
        )
      );

    // 24h reminders
    for (const appt of upcoming) {
      const apptDate = getAppointmentDateTime(appt);
      if (appt.reminder24hSent) continue;
      // Window: 23h–24h ahead
      const diffMs = apptDate.getTime() - now.getTime();
      if (diffMs > 23 * 60 * 60 * 1000 && diffMs <= 24 * 60 * 60 * 1000 + FIVE_MINUTES) {
        await sendReminderForAppointment(appt, "24h");
      }
    }

    // 2h reminders
    for (const appt of upcoming) {
      const apptDate = getAppointmentDateTime(appt);
      if (appt.reminder2hSent) continue;
      const diffMs = apptDate.getTime() - now.getTime();
      if (diffMs > 1.5 * 60 * 60 * 1000 && diffMs <= 2 * 60 * 60 * 1000 + FIVE_MINUTES) {
        await sendReminderForAppointment(appt, "2h");
      }
    }

    // Review request: 1h after appointment time, for completed appointments
    for (const appt of completed) {
      const apptDate = getAppointmentDateTime(appt);
      if (apptDate.getTime() < past1h.getTime() && !appt.reviewRequestSent) {
        await sendReviewRequestForAppointment(appt);
      }
    }

    // Auto-expire pre-appointments whose deposit deadline has passed without payment
    const todayStr = now.toISOString().slice(0, 10);
    try {
      const expired = await db
        .update(appointmentsTable)
        .set({ status: "expired", updatedAt: new Date() })
        .where(
          and(
            eq(appointmentsTable.bookingType, "pre_appointment"),
            eq(appointmentsTable.paymentStatus, "unpaid"),
            inArray(appointmentsTable.status, ["pending", "confirmed"]),
            sql`${appointmentsTable.depositDeadline} IS NOT NULL`,
            lte(appointmentsTable.depositDeadline, todayStr)
          )
        )
        .returning({ id: appointmentsTable.id });
      if (expired.length > 0) {
        logger.info({ count: expired.length }, "Auto-expired unpaid pre-appointments");
      }
    } catch (err) {
      logger.error({ err }, "Pre-appointment expiry sweep failed");
    }
  } catch (err) {
    logger.error({ err }, "Scheduler tick error");
  }
}

async function sendReminderForAppointment(
  appt: typeof appointmentsTable.$inferSelect,
  kind: "24h" | "2h",
): Promise<void> {
  try {
    if (!appt.clientPhone) {
      // Mark as sent even without phone so we don't retry
      await db
        .update(appointmentsTable)
        .set(kind === "24h" ? { reminder24hSent: new Date() } : { reminder2hSent: new Date() })
        .where(eq(appointmentsTable.id, appt.id));
      return;
    }
    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, appt.tenantId))
      .limit(1);

    await sendReminderNotification({
      kind,
      clientName: appt.clientName,
      clientPhone: appt.clientPhone,
      serviceName: appt.serviceName,
      date: appt.date,
      time: appt.time,
      tenantName: tenant?.name ?? "Salão",
      tenantPhone: tenant?.whatsapp ?? null,
    });
    await db
      .update(appointmentsTable)
      .set(kind === "24h" ? { reminder24hSent: new Date() } : { reminder2hSent: new Date() })
      .where(eq(appointmentsTable.id, appt.id));
    logger.info({ apptId: appt.id, kind }, "Reminder sent");
  } catch (err) {
    logger.error({ err, apptId: appt.id, kind }, "Reminder send failed");
  }
}

async function sendReviewRequestForAppointment(
  appt: typeof appointmentsTable.$inferSelect,
): Promise<void> {
  try {
    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, appt.tenantId))
      .limit(1);
    if (tenant && appt.clientPhone) {
      await sendReviewRequestNotification({
        clientName: appt.clientName,
        clientPhone: appt.clientPhone,
        serviceName: appt.serviceName,
        tenantName: tenant.name,
        reviewToken: appt.reviewToken,
      });
    }
    await db
      .update(appointmentsTable)
      .set({ reviewRequestSent: new Date() })
      .where(eq(appointmentsTable.id, appt.id));
  } catch (err) {
    logger.error({ err, apptId: appt.id }, "Review request send failed");
  }
}

export function startScheduler(): void {
  // Run every 5 minutes
  const intervalMs = 5 * 60 * 1000;
  logger.info({ intervalMs }, "Scheduler started");
  // First run after 30s so server has time to start
  setTimeout(() => {
    runRemindersTick();
    setInterval(runRemindersTick, intervalMs);
  }, 30 * 1000);
}
