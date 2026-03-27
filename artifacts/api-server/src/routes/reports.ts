import { Router } from "express";
import { db, appointmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireTenant, type AuthRequest } from "../lib/auth.js";

const router = Router();

router.get("/tenant", requireTenant, async (req: AuthRequest, res) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

  try {
    const appointments = await db
      .select()
      .from(appointmentsTable)
      .where(eq(appointmentsTable.tenantId, req.user!.tenantId!));

    let filtered = appointments;
    if (startDate) filtered = filtered.filter((a) => a.date >= startDate);
    if (endDate) filtered = filtered.filter((a) => a.date <= endDate);

    const totalAppointments = filtered.length;
    const totalRevenue = filtered.reduce((sum, a) => sum + a.servicePrice, 0);
    const totalCosts = filtered.reduce((sum, a) => sum + (a.materialCost ?? 0), 0);
    const totalProfit = totalRevenue - totalCosts;

    const appointmentsByStatus = filtered.reduce(
      (acc, a) => {
        acc[a.status] = (acc[a.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const monthlyMap = new Map<string, { appointments: number; revenue: number; profit: number }>();

    for (const appt of filtered) {
      const month = appt.date.slice(0, 7);
      const existing = monthlyMap.get(month) ?? { appointments: 0, revenue: 0, profit: 0 };
      existing.appointments++;
      existing.revenue += appt.servicePrice;
      existing.profit += appt.servicePrice - (appt.materialCost ?? 0);
      monthlyMap.set(month, existing);
    }

    const monthlyData = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    res.json({
      totalAppointments,
      totalRevenue,
      totalCosts,
      totalProfit,
      appointmentsByStatus,
      monthlyData,
    });
  } catch (err) {
    req.log.error({ err }, "Get report error");
    res.status(500).json({ error: "InternalError", message: "Erro interno" });
  }
});

export default router;
