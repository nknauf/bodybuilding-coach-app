import { notFound } from "next/navigation";
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
import { MutationForm } from "@/components/mutation-form";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WeightChart } from "@/components/weight-chart";
import { formatInTimeZone } from "date-fns-tz";

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
  const exercises = await db.exercise.findMany({
    where: {
      isActive: true,
      OR: [{ scope: "GLOBAL" }, { ownerCoachId: requireCoachProfileId(actor) }],
    },
    orderBy: { name: "asc" },
  });
  const recentSetLogs = await db.workoutSetLog.findMany({
    where: {
      clientId: report.profile.id,
      status: "COMPLETED",
      workout: { coachId: requireCoachProfileId(actor) },
    },
    include: {
      workoutExercise: { select: { exerciseNameSnapshot: true } },
    },
    orderBy: { loggedAt: "desc" },
    take: 20,
  });
  const chartPoints = report.weightTrend.points.map((point) => ({
    date: formatInTimeZone(
      point.measuredAt,
      report.profile.user.timezone,
      "MMM d",
    ),
    value: point.value,
  }));
  const scheduleAction = scheduleWorkoutAction.bind(null, clientId);
  const mealAction = scheduleMealAction.bind(null, clientId);
  const supplementAction = scheduleSupplementAction.bind(null, clientId);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-muted-foreground text-sm">Client overview</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {report.profile.user.firstName} {report.profile.user.lastName}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          New assignments use the client’s local time (
          {report.profile.user.timezone}) and are stored as UTC instants. Event
          cards below render in your timezone ({actor.timezone}).
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
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
      <Card>
        <CardHeader>
          <CardTitle>This week’s events</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-3">
          {[
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
          ]
            .toSorted((a, b) => a.at.getTime() - b.at.getTime())
            .map((event) => (
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
            ))}
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>30-day bodyweight</CardTitle>
          </CardHeader>
          <CardContent>
            <WeightChart points={chartPoints} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent exercise performance</CardTitle>
            <p className="text-muted-foreground text-sm">
              Latest 20 completed set logs; extra sets remain visibly separate
              in workout detail.
            </p>
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
      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Schedule workout</CardTitle>
          </CardHeader>
          <CardContent>
            <MutationForm
              action={scheduleAction}
              submitLabel="Schedule workout"
              className="space-y-3"
            >
              <Field name="name" label="Workout name" />
              <Field
                name="scheduledAt"
                label="Client-local date and time"
                type="datetime-local"
              />
              <Field
                name="durationMinutes"
                label="Duration (minutes)"
                type="number"
              />
              <div className="space-y-1.5">
                <Label htmlFor="exerciseId">Exercise</Label>
                <select
                  id="exerciseId"
                  name="exerciseId"
                  className="bg-background h-9 w-full rounded-lg border px-2 text-sm"
                >
                  {exercises.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                name="expectedReps"
                label="Reps per set (comma separated)"
                defaultValue="8, 8, 8"
              />
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" maxLength={2000} />
              </div>
            </MutationForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Schedule meal</CardTitle>
          </CardHeader>
          <CardContent>
            <MutationForm
              action={mealAction}
              submitLabel="Schedule meal"
              className="space-y-3"
            >
              <Field name="name" label="Meal name" />
              <Field
                name="scheduledAt"
                label="Client-local date and time"
                type="datetime-local"
              />
              <Field
                name="expectedCalories"
                label="Calories (optional)"
                type="number"
                required={false}
              />
              <Field
                name="expectedProteinGrams"
                label="Protein grams"
                type="number"
                required={false}
              />
              <Field
                name="expectedCarbGrams"
                label="Carbohydrate grams"
                type="number"
                required={false}
              />
              <Field
                name="expectedFatGrams"
                label="Fat grams"
                type="number"
                required={false}
              />
            </MutationForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Schedule supplement</CardTitle>
          </CardHeader>
          <CardContent>
            <MutationForm
              action={supplementAction}
              submitLabel="Schedule supplement"
              className="space-y-3"
            >
              <Field name="name" label="Supplement" />
              <Field name="dosageText" label="Assigned dosage" />
              <Field
                name="scheduledAt"
                label="Client-local date and time"
                type="datetime-local"
              />
            </MutationForm>
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
  defaultValue,
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
      />
    </div>
  );
}
