import { addDays, eachDayOfInterval } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { notFound } from "next/navigation";
import {
  createExerciseAction,
  scheduleMealAction,
  scheduleSupplementAction,
  scheduleWorkoutAction,
} from "@/app/actions/coach";
import { CoachClientWorkspace } from "@/components/coach-client-workspace";
import { WeightChart } from "@/components/weight-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthorizationError } from "@/server/auth/errors";
import { requireActor } from "@/server/auth/current-user";
import { requireCoachProfileId } from "@/server/auth/authorization";
import { db } from "@/server/db/client";
import { getCurrentWeekReport } from "@/server/services/reports";

export default async function CoachClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const actor = await requireActor(["COACH"]);
  const { clientId } = await params;
  let report;
  try {
    report = await getCurrentWeekReport(actor, clientId, new Date(), 365);
  } catch (error) {
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }
  const coachId = requireCoachProfileId(actor);
  const [exercises, recentSetLogs, activity] = await Promise.all([
    db.exercise.findMany({
      where: {
        isActive: true,
        OR: [{ scope: "GLOBAL" }, { ownerCoachId: coachId }],
      },
      select: { id: true, name: true, scope: true },
      orderBy: { name: "asc" },
    }),
    db.workoutSetLog.findMany({
      where: { clientId, status: "COMPLETED", workout: { coachId } },
      include: { workoutExercise: { select: { exerciseNameSnapshot: true } } },
      orderBy: { loggedAt: "desc" },
      take: 8,
    }),
    db.auditLog.findMany({
      where: {
        createdAt: { gte: addDays(new Date(), -2) },
        OR: [
          { entityId: clientId },
          { newValue: { path: ["clientId"], equals: clientId } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);
  const timezone = report.profile.user.timezone;
  const local = (date: Date) =>
    formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm");
  const events = [
    ...report.workouts.map((x) => ({
      id: x.id,
      kind: "workout" as const,
      name: x.name,
      at: local(x.scheduledAt),
      status: x.effectiveStatus,
      detail: `${x.exercises.length} exercises`,
      exerciseCount: x.exercises.length,
    })),
    ...report.meals.map((x) => ({
      id: x.id,
      kind: "meal" as const,
      name: x.name,
      at: local(x.scheduledAt),
      status: x.effectiveStatus,
      detail: x.expectedCalories
        ? `${x.expectedCalories} kcal`
        : "Assigned meal",
    })),
    ...report.supplements.map((x) => ({
      id: x.id,
      kind: "supplement" as const,
      name: x.name,
      at: local(x.scheduledAt),
      status: x.effectiveStatus,
      detail: x.dosageText,
    })),
  ];
  const days = eachDayOfInterval({
    start: report.range.start,
    end: addDays(report.range.start, 6),
  }).map((day) => ({
    key: formatInTimeZone(day, timezone, "yyyy-MM-dd"),
    inputDate: formatInTimeZone(day, timezone, "yyyy-MM-dd"),
    weekday: formatInTimeZone(day, timezone, "EEE"),
    date: formatInTimeZone(day, timezone, "d"),
  }));
  const latest = report.weightTrend.latest;
  const name = `${report.profile.user.firstName} ${report.profile.user.lastName}`;
  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-center gap-4 border-b pb-5">
        <div className="bg-muted grid size-11 place-items-center rounded-full text-sm font-semibold">
          {report.profile.user.firstName[0]}
          {report.profile.user.lastName[0]}
        </div>
        <div className="min-w-48 flex-1">
          <p className="text-muted-foreground text-xs">Client</p>
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        </div>
        <Summary
          label="Latest weight"
          value={latest ? `${latest.value} ${latest.unit}` : "—"}
        />
        <Summary
          label="Weekly compliance"
          value={
            report.compliancePercent.overall === null
              ? "—"
              : `${report.compliancePercent.overall}%`
          }
        />
        <Summary
          label="Current streak"
          value={`${report.streaks.daily} day${report.streaks.daily === 1 ? "" : "s"}`}
        />
      </header>
      <CoachClientWorkspace
        events={events}
        days={days}
        timezone={timezone}
        exercises={exercises}
        actions={{
          workout: scheduleWorkoutAction.bind(null, clientId),
          meal: scheduleMealAction.bind(null, clientId),
          supplement: scheduleSupplementAction.bind(null, clientId),
          exercise: createExerciseAction,
        }}
      />
      <section className="space-y-3">
        <div>
          <p className="text-muted-foreground text-sm">Review</p>
          <h2 className="text-xl font-semibold">Progress</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <Card>
            <CardHeader>
              <CardTitle>Bodyweight trend</CardTitle>
              <p className="text-muted-foreground text-sm">
                Raw daily measurements with a 7-day rolling trend.
              </p>
            </CardHeader>
            <CardContent>
              <WeightChart
                points={report.weightTrend.points.map((p) => ({
                  date: formatInTimeZone(p.measuredAt, timezone, "MMM d"),
                  value: p.value,
                }))}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Compliance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Metric
                label="Workouts"
                value={report.compliancePercent.workout}
              />
              <Metric label="Meals" value={report.compliancePercent.meal} />
              <Metric
                label="Supplements"
                value={report.compliancePercent.supplement}
              />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Exercise performance</CardTitle>
            </CardHeader>
            <CardContent>
              {recentSetLogs.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {recentSetLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex justify-between rounded-lg border p-3 text-sm"
                    >
                      <span>
                        <strong className="block">
                          {log.workoutExercise.exerciseNameSnapshot}
                        </strong>
                        <span className="text-muted-foreground">
                          {formatInTimeZone(log.loggedAt, timezone, "MMM d")}
                        </span>
                      </span>
                      <strong>
                        {log.actualWeight?.toString() ?? "BW"}{" "}
                        {log.weightUnit ?? ""} × {log.actualReps ?? "—"}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty>No exercise history yet.</Empty>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Timeline</p>
            <h2 className="text-xl font-semibold">Recent activity</h2>
          </div>
          <span className="text-muted-foreground text-sm">
            Today & yesterday
          </span>
        </div>
        <Card>
          <CardContent className="pt-5">
            {activity.length ? (
              <div className="space-y-3">
                {activity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 border-b pb-3 last:border-0"
                  >
                    <span className="text-sm">
                      {activityLabel(item.action)}
                    </span>
                    <time className="text-muted-foreground text-xs">
                      {formatInTimeZone(item.createdAt, timezone, "EEE, p")}
                    </time>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>No recent client activity.</Empty>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-28">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <strong>{value === null ? "—" : `${value}%`}</strong>
      </div>
      <div className="bg-muted h-1.5 rounded-full">
        <div
          className="h-full rounded-full bg-zinc-900"
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground py-8 text-center text-sm">{children}</p>
  );
}
function activityLabel(action: string) {
  return (
    (
      {
        SET_LOGGED: "Logged a workout set",
        WORKOUT_FINALIZED: "Completed a workout",
        MEAL_COMPLETED: "Completed a meal",
        SUPPLEMENT_COMPLETED: "Completed a supplement",
        BODY_METRIC_LOGGED: "Logged bodyweight",
        EVENT_RESCHEDULED: "Rescheduled an item",
      } as Record<string, string>
    )[action] ?? action.toLowerCase().replaceAll("_", " ")
  );
}
