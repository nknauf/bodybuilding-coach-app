import "server-only";

import type { Actor } from "@/server/auth/authorization";
import { requireAccessibleClient } from "@/server/auth/scopes";
import { db } from "@/server/db/client";
import {
  dateOnlyValue,
  localDateUtcRange,
  localDayKey,
} from "@/server/domain/time";
import { effectiveEventStatus } from "@/server/domain/event-status";

export async function getClientCalendarMonth(
  actor: Actor,
  year: number,
  month: number,
) {
  if (
    !Number.isInteger(year) ||
    year < 1900 ||
    year > 2200 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  )
    throw new Error("Invalid month.");
  const client = await requireAccessibleClient(db, actor);
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = new Date(Date.UTC(year, month, 1))
    .toISOString()
    .slice(0, 10);
  const range = {
    start: localDateUtcRange(first, client.user.timezone).start,
    end: localDateUtcRange(nextMonth, client.user.timezone).start,
  };
  const [workouts, meals, supplements, media] = await Promise.all([
    db.workout.findMany({
      where: {
        clientId: client.id,
        scheduledAt: { gte: range.start, lt: range.end },
      },
      select: { scheduledAt: true },
    }),
    db.mealEvent.findMany({
      where: {
        clientId: client.id,
        scheduledAt: { gte: range.start, lt: range.end },
      },
      select: { scheduledAt: true },
    }),
    db.supplementEvent.findMany({
      where: {
        clientId: client.id,
        scheduledAt: { gte: range.start, lt: range.end },
      },
      select: { scheduledAt: true },
    }),
    db.media.findMany({
      where: {
        clientId: client.id,
        OR: [
          {
            mediaDate: {
              gte: dateOnlyValue(first),
              lt: dateOnlyValue(nextMonth),
            },
          },
          { mediaDate: null, createdAt: { gte: range.start, lt: range.end } },
        ],
      },
      select: { mediaDate: true, createdAt: true },
    }),
  ]);
  const days: Record<
    string,
    { workouts: number; meals: number; supplements: number; media: number }
  > = {};
  const increment = (
    day: string,
    kind: "workouts" | "meals" | "supplements" | "media",
  ) => {
    days[day] ??= { workouts: 0, meals: 0, supplements: 0, media: 0 };
    days[day][kind]++;
  };
  for (const item of workouts)
    increment(localDayKey(item.scheduledAt, client.user.timezone), "workouts");
  for (const item of meals)
    increment(localDayKey(item.scheduledAt, client.user.timezone), "meals");
  for (const item of supplements)
    increment(
      localDayKey(item.scheduledAt, client.user.timezone),
      "supplements",
    );
  for (const item of media)
    increment(
      item.mediaDate
        ? item.mediaDate.toISOString().slice(0, 10)
        : localDayKey(item.createdAt, client.user.timezone),
      "media",
    );
  return { client, days };
}

export async function getClientDayDetails(actor: Actor, day: string) {
  const client = await requireAccessibleClient(db, actor);
  const range = localDateUtcRange(day, client.user.timezone);
  const [workouts, meals, supplements] = await Promise.all([
    db.workout.findMany({
      where: {
        clientId: client.id,
        scheduledAt: { gte: range.start, lt: range.end },
      },
      select: {
        id: true,
        name: true,
        scheduledAt: true,
        finalizedAt: true,
        notes: true,
      },
      orderBy: { scheduledAt: "asc" },
    }),
    db.mealEvent.findMany({
      where: {
        clientId: client.id,
        scheduledAt: { gte: range.start, lt: range.end },
      },
      select: {
        id: true,
        name: true,
        scheduledAt: true,
        completedAt: true,
        description: true,
      },
      orderBy: { scheduledAt: "asc" },
    }),
    db.supplementEvent.findMany({
      where: {
        clientId: client.id,
        scheduledAt: { gte: range.start, lt: range.end },
      },
      select: {
        id: true,
        name: true,
        dosageText: true,
        scheduledAt: true,
        completedAt: true,
        coachNotes: true,
      },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);
  const now = new Date();
  return {
    workouts: workouts.map((item) => ({
      ...item,
      status: effectiveEventStatus({
        kind: "workout",
        scheduledAt: item.scheduledAt,
        completedAt: item.finalizedAt,
        now,
      }),
    })),
    meals: meals.map((item) => ({
      ...item,
      status: effectiveEventStatus({
        kind: "meal",
        scheduledAt: item.scheduledAt,
        completedAt: item.completedAt,
        now,
      }),
    })),
    supplements: supplements.map((item) => ({
      ...item,
      status: effectiveEventStatus({
        kind: "supplement",
        scheduledAt: item.scheduledAt,
        completedAt: item.completedAt,
        now,
      }),
    })),
  };
}
