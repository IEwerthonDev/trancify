import type { Availability } from "@workspace/db";

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface ExistingAppointment {
  time: string;
  durationHours: number;
}

export function computeAvailableSlots(
  availability: Availability,
  existingAppointments: ExistingAppointment[],
  serviceDurationHours: number,
  date: string
): string[] {
  const availableDates = (availability as any).availableDates as string[] | undefined;

  if (availableDates && availableDates.length > 0) {
    if (!availableDates.includes(date)) return [];
  } else {
    const dayOfWeek = new Date(date + "T12:00:00Z").getDay();
    const availableDays = availability.availableDays as number[];
    if (!availableDays.includes(dayOfWeek)) return [];
  }

  const blockedDates = availability.blockedDates as string[];
  if (blockedDates.includes(date)) return [];

  if (existingAppointments.length >= availability.maxAppointmentsPerDay) return [];

  const startMins = timeToMinutes(availability.startTime);
  const endMins = timeToMinutes(availability.endTime);
  const interval = availability.slotIntervalMinutes;
  const breakAfter = availability.breakAfterMinutes;
  const serviceDurationMins = Math.ceil(serviceDurationHours * 60);

  const blockedRanges: Array<[number, number]> = existingAppointments.map((appt) => {
    const apptStart = timeToMinutes(appt.time);
    const apptEnd = apptStart + Math.ceil(appt.durationHours * 60) + breakAfter;
    return [apptStart, apptEnd];
  });

  const slots: string[] = [];

  for (let slotStart = startMins; slotStart <= endMins; slotStart += interval) {
    const slotEnd = slotStart + serviceDurationMins;

    let blocked = false;
    for (const [blockStart, blockEnd] of blockedRanges) {
      if (slotStart < blockEnd && slotEnd > blockStart) {
        blocked = true;
        break;
      }
    }

    if (!blocked) {
      slots.push(minutesToTime(slotStart));
    }
  }

  return slots;
}
