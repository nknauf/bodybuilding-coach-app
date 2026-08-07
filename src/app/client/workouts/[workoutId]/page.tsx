import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { requireActor } from "@/server/auth/current-user";
import { AuthorizationError } from "@/server/auth/errors";
import { getClientWorkout } from "@/server/services/client";
import {
  finalizeWorkoutAction,
  logExtraSetAction,
  logSetAction,
  saveWorkoutNotesAction,
} from "@/app/actions/client";
import { MutationForm } from "@/components/mutation-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Textarea } from "@/components/ui/textarea";

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const actor = await requireActor(["CLIENT"]);
  const { workoutId } = await params;
  let workout;
  try {
    workout = await getClientWorkout(actor, workoutId);
  } catch (error) {
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }
  const logCount = workout.exercises.reduce(
    (count, item) =>
      count +
      item.assignedSets.filter((set) => set.log).length +
      item.setLogs.length,
    0,
  );
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">
          {formatInTimeZone(
            workout.scheduledAt,
            workout.scheduleTimezone,
            "EEEE, MMMM d · p zzz",
          )}
        </p>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {workout.name}
          </h1>
          {workout.finalizedAt ? <StatusBadge status="COMPLETED" /> : null}
        </div>
        {workout.notes ? (
          <p className="text-muted-foreground mt-2">{workout.notes}</p>
        ) : null}
      </div>
      {workout.exercises.map((exercise) => (
        <Card key={exercise.id}>
          <CardHeader>
            <CardTitle>{exercise.exerciseNameSnapshot}</CardTitle>
            {exercise.coachNotes ? (
              <p className="text-muted-foreground text-sm">
                {exercise.coachNotes}
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {!workout.finalizedAt ? (
              <MutationForm
                action={saveWorkoutNotesAction.bind(
                  null,
                  workout.id,
                  exercise.id,
                )}
                submitLabel="Save notes"
                className="bg-muted/40 grid gap-3 rounded-lg p-3 sm:grid-cols-2"
              >
                <div className="space-y-1.5">
                  <Label>Workout note</Label>
                  <Textarea
                    name="workoutNotes"
                    defaultValue={workout.clientNotes ?? ""}
                    maxLength={2000}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Exercise note</Label>
                  <Textarea
                    name="exerciseNotes"
                    defaultValue={exercise.clientNotes ?? ""}
                    maxLength={1000}
                  />
                </div>
              </MutationForm>
            ) : null}
            {exercise.assignedSets.map((set) => {
              const action = logSetAction.bind(null, workout.id, set.id);
              return (
                <div key={set.id} className="rounded-lg border p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-medium">
                      Set {set.orderIndex + 1} · {set.expectedReps} reps
                      expected
                    </p>
                    {set.log ? <StatusBadge status={set.log.status} /> : null}
                  </div>
                  {workout.finalizedAt ? (
                    <p className="text-muted-foreground text-sm">
                      {set.log
                        ? `${set.log.actualReps ?? "—"} reps · ${set.log.actualWeight?.toString() ?? "—"} ${set.log.weightUnit ?? ""}`
                        : "Not logged"}
                    </p>
                  ) : (
                    <MutationForm
                      action={action}
                      submitLabel="Save set"
                      className="grid gap-3 sm:grid-cols-4 sm:items-end"
                    >
                      <Select
                        name="status"
                        label="Status"
                        values={["COMPLETED", "SKIPPED"]}
                      />
                      <Field
                        name="actualReps"
                        label="Actual reps"
                        type="number"
                        defaultValue={set.log?.actualReps?.toString()}
                      />
                      <Field
                        name="actualWeight"
                        label="Weight"
                        type="number"
                        step="0.1"
                        defaultValue={set.log?.actualWeight?.toString()}
                        required={false}
                      />
                      <Select
                        name="weightUnit"
                        label="Unit"
                        values={["LB", "KG"]}
                      />
                    </MutationForm>
                  )}
                </div>
              );
            })}
            {exercise.setLogs.map((set, index) => (
              <div
                key={set.id}
                className="rounded-lg border border-dashed p-3 text-sm"
              >
                Extra set {index + 1}: {set.actualReps ?? "—"} reps ·{" "}
                {set.actualWeight?.toString() ?? "—"} {set.weightUnit ?? ""}
              </div>
            ))}
            {!workout.finalizedAt ? (
              <MutationForm
                action={logExtraSetAction.bind(null, workout.id, exercise.id)}
                submitLabel="Add extra set"
                className="bg-muted/50 grid gap-3 rounded-lg p-3 sm:grid-cols-3 sm:items-end"
              >
                <Field name="actualReps" label="Extra-set reps" type="number" />
                <Field
                  name="actualWeight"
                  label="Weight"
                  type="number"
                  step="0.1"
                  required={false}
                />
                <Select name="weightUnit" label="Unit" values={["LB", "KG"]} />
              </MutationForm>
            ) : null}
          </CardContent>
        </Card>
      ))}
      {!workout.finalizedAt ? (
        <form action={finalizeWorkoutAction.bind(null, workout.id)}>
          <Button size="lg" disabled={logCount < 1}>
            Finalize workout
          </Button>
          {logCount < 1 ? (
            <p className="text-muted-foreground mt-2 text-sm">
              Log at least one assigned or extra set before finalizing.
            </p>
          ) : null}
        </form>
      ) : (
        <p className="bg-muted/50 rounded-lg border p-4 text-sm">
          This workout is final and cannot be edited.
        </p>
      )}
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  step,
  defaultValue,
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  step?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`${name}-${defaultValue ?? ""}`}>{label}</Label>
      <Input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        required={required}
      />
    </div>
  );
}

function Select({
  name,
  label,
  values,
}: {
  name: string;
  label: string;
  values: string[];
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select
        name={name}
        className="bg-background h-9 w-full rounded-lg border px-2 text-sm"
      >
        {values.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
    </div>
  );
}
