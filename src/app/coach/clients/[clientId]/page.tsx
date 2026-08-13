import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { requireActor } from "@/server/auth/current-user";
import { requireCoachProfileId } from "@/server/auth/authorization";
import { AuthorizationError } from "@/server/auth/errors";
import { getCurrentWeekReport } from "@/server/services/reports";
import { db } from "@/server/db/client";
import {
  scheduleMealAction,
  scheduleSupplementAction,
  scheduleWorkoutAction,
} from "@/app/actions/coach";
import { MealBuilder, WorkoutBuilder } from "@/components/coach-schedule-forms";
import { MutationForm } from "@/components/mutation-form";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WeightChart } from "@/components/weight-chart";

export default async function CoachClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const actor = await requireActor(["COACH"]);
  const { clientId } = await params;
  let report;
  try {
    report = await getCurrentWeekReport(actor, clientId);
  } catch (error) {
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }
  const coachId = requireCoachProfileId(actor);
  const [exercises, recentSetLogs] = await Promise.all([
    db.exercise.findMany({
      where: {
        isActive: true,
        OR: [{ scope: "GLOBAL" }, { ownerCoachId: coachId }],
      },
      select: { id: true, name: true, scope: true },
      orderBy: { name: "asc" },
    }),
    db.workoutSetLog.findMany({
      where: {
        clientId: report.profile.id,
        status: "COMPLETED",
        workout: { coachId },
      },
      include: {
        workoutExercise: { select: { exerciseNameSnapshot: true } },
      },
      orderBy: { loggedAt: "desc" },
      take: 20,
    }),
  ]);
  const events = [
    ...report.workouts.map((item) => ({
      id: item.id,
      type: "Workout",
      name: item.name,
      at: item.scheduledAt,
      status: item.effectiveStatus,
    })),
    ...report.meals.map((item) => ({
      id: item.id,
      type: "Meal",
      name: item.name,
      at: item.scheduledAt,
      status: item.effectiveStatus,
    })),
    ...report.supplements.map((item) => ({
      id: item.id,
      type: "Supplement",
      name: item.name,
      at: item.scheduledAt,
      status: item.effectiveStatus,
    })),
  ].toSorted((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <div className="space-y-8">
      <header>
        <p className="text-muted-foreground text-sm">Client overview</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {report.profile.user.firstName} {report.profile.user.lastName}
          </h1>
          <StatusBadge status={report.profile.status} />
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Scheduling uses {report.profile.user.timezone}; coach-facing event
          times render in {actor.timezone}.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Overall", report.compliancePercent.overall],
          ["Workout", report.compliancePercent.workout],
          ["Meals", report.compliancePercent.meal],
          ["Supplements", report.compliancePercent.supplement],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-3">
              <p className="text-muted-foreground text-sm">{label}</p>
              <CardTitle className="text-3xl">
                {value === null ? "—" : `${value}%`}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Daily", report.streaks.daily],
          ["Weekly", report.streaks.weekly],
          ["Workout", report.streaks.workout],
          ["Meal", report.streaks.meal],
          ["Overall", report.streaks.overall],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-muted-foreground text-xs">{label} streak</p>
              <p className="text-xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>This week&apos;s plan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {events.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nothing scheduled this week.
            </p>
          ) : (
            events.map((event) => (
              <div
                key={`${event.type}-${event.id}`}
                className="rounded-lg border p-3"
              >
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground text-xs font-medium uppercase">
                    {event.type}
                  </span>
                  <StatusBadge status={event.status} />
                </div>
                <p className="mt-2 font-medium">{event.name}</p>
                <time className="text-muted-foreground text-sm">
                  {formatInTimeZone(
                    event.at,
                    actor.timezone,
                    "EEE, MMM d · p zzz",
                  )}
                </time>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Build a workout</CardTitle>
          <p className="text-muted-foreground text-sm">
            Add and reorder exercises, then define each assigned set.
          </p>
        </CardHeader>
        <CardContent>
          <WorkoutBuilder
            action={scheduleWorkoutAction.bind(null, clientId)}
            exercises={exercises}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Schedule meal</CardTitle>
          </CardHeader>
          <CardContent>
            <MealBuilder action={scheduleMealAction.bind(null, clientId)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Schedule supplement</CardTitle>
          </CardHeader>
          <CardContent>
            <MutationForm
              action={scheduleSupplementAction.bind(null, clientId)}
              submitLabel="Schedule supplement"
              className="space-y-4"
            >
              <Field name="name" label="Supplement" />
              <Field name="dosageText" label="Assigned dosage" />
              <Field
                name="scheduledAt"
                label="Client-local date and time"
                type="datetime-local"
              />
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Coach notes</span>
                <Textarea name="coachNotes" maxLength={1000} />
              </label>
            </MutationForm>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>30-day bodyweight</CardTitle>
          </CardHeader>
          <CardContent>
            <WeightChart
              points={report.weightTrend.points.map((point) => ({
                date: formatInTimeZone(
                  point.measuredAt,
                  report.profile.user.timezone,
                  "MMM d",
                ),
                value: point.value,
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent exercise performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentSetLogs.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No completed sets yet.
              </p>
            ) : (
              recentSetLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {log.workoutExercise.exerciseNameSnapshot}
                    </p>
                    <p className="text-muted-foreground">
                      {formatInTimeZone(
                        log.loggedAt,
                        report.profile.user.timezone,
                        "MMM d, p",
                      )}
                    </p>
                  </div>
                  <p className="font-medium">
                    {log.actualWeight?.toString() ?? "—"} {log.weightUnit ?? ""}{" "}
                    × {log.actualReps ?? "—"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
}: {
  name: string;
  label: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required />
    </div>
  );
}
