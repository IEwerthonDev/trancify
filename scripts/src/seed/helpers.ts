import bcrypt from "bcryptjs";

export function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/** Gera datas YYYY-MM-DD a partir de hoje, apenas nos dias da semana informados (0=Dom … 6=Sáb). */
export function buildAvailableDates(dayOfWeekList: number[], horizonDays = 60): string[] {
  const dates: string[] = [];
  const allowed = new Set(dayOfWeekList);
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);

  for (let i = 0; i < horizonDays; i++) {
    if (allowed.has(cursor.getDay())) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
