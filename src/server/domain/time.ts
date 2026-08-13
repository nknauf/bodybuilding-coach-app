import { endOfWeek, startOfDay, startOfWeek } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export function localDayKey(instant: Date, timezone: string): string {
  const local = toZonedTime(instant, timezone);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, "0");
  const day = String(local.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function mondayWeekUtcRange(
  instant: Date,
  timezone: string,
): { start: Date; end: Date } {
  const local = toZonedTime(instant, timezone);
  const start = startOfWeek(local, { weekStartsOn: 1 });
  const end = endOfWeek(local, { weekStartsOn: 1 });
  return {
    start: fromZonedTime(start, timezone),
    end: fromZonedTime(end, timezone),
  };
}

export function localDateTimeToUtc(value: string, timezone: string): Date {
  return fromZonedTime(value, timezone);
}

export function startOfLocalDayUtc(instant: Date, timezone: string): Date {
  return fromZonedTime(startOfDay(toZonedTime(instant, timezone)), timezone);
}
