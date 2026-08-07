import { timingSafeEqual } from "node:crypto";
import { db } from "@/server/db/client";
import { getServerEnv } from "@/lib/env";
import { effectiveEventStatus } from "@/server/domain/event-status";

function hasValidSecret(request: Request): boolean {
  const configured = getServerEnv().CRON_SECRET;
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer /, "");
  if (!configured || !supplied) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function GET(request: Request) {
  if (!hasValidSecret(request)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const now = new Date();
  const [workouts, meals, supplements] = await Promise.all([
    db.workout.findMany({
      where: { finalizedAt: null, scheduledAt: { lt: now } },
      select: { id: true, scheduledAt: true, storedStatus: true },
    }),
    db.mealEvent.findMany({
      where: { completedAt: null, scheduledAt: { lt: now } },
      select: { id: true, scheduledAt: true, storedStatus: true },
    }),
    db.supplementEvent.findMany({
      where: { completedAt: null, scheduledAt: { lt: now } },
      select: { id: true, scheduledAt: true, storedStatus: true },
    }),
  ]);

  const updates = [
    ...workouts.map((event) => ({
      model: "workout" as const,
      id: event.id,
      current: event.storedStatus,
      next: effectiveEventStatus({
        kind: "workout",
        scheduledAt: event.scheduledAt,
        now,
      }),
    })),
    ...meals.map((event) => ({
      model: "meal" as const,
      id: event.id,
      current: event.storedStatus,
      next: effectiveEventStatus({
        kind: "meal",
        scheduledAt: event.scheduledAt,
        now,
      }),
    })),
    ...supplements.map((event) => ({
      model: "supplement" as const,
      id: event.id,
      current: event.storedStatus,
      next: effectiveEventStatus({
        kind: "supplement",
        scheduledAt: event.scheduledAt,
        now,
      }),
    })),
  ].filter((event) => event.current !== event.next);

  await db.$transaction(
    updates.map((event) => {
      if (event.model === "workout") {
        return db.workout.update({
          where: { id: event.id },
          data: { storedStatus: event.next },
        });
      }
      if (event.model === "meal") {
        return db.mealEvent.update({
          where: { id: event.id },
          data: { storedStatus: event.next },
        });
      }
      return db.supplementEvent.update({
        where: { id: event.id },
        data: { storedStatus: event.next },
      });
    }),
  );
  return Response.json({ checked: updates.length, reconciledAt: now });
}
