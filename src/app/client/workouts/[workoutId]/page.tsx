import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { fastLogSetAction, finalizeWorkoutAction } from "@/app/actions/client";
import { ConfirmForm } from "@/components/confirm-form";
import { WorkoutLogger } from "@/components/workout-logger";
import { Button } from "@/components/ui/button";
import { AuthorizationError } from "@/server/auth/errors";
import { requireActor } from "@/server/auth/current-user";
import { getClientWorkout } from "@/server/services/client";

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
  const logged = workout.exercises
    .flatMap((x) => x.assignedSets)
    .filter((x) => x.log).length;
  return (
    <main className="mx-auto max-w-3xl space-y-5 pb-24">
      <header>
        <p className="text-muted-foreground text-sm">
          {formatInTimeZone(
            workout.scheduledAt,
            workout.scheduleTimezone,
            "EEEE, MMMM d · p",
          )}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {workout.name}
        </h1>
        {workout.notes ? (
          <p className="text-muted-foreground mt-2">{workout.notes}</p>
        ) : null}
      </header>
      <WorkoutLogger
        workoutId={workout.id}
        startedAt={workout.updatedAt.toISOString()}
        action={fastLogSetAction}
        exercises={workout.exercises.map((exercise) => ({
          id: exercise.id,
          exerciseId: exercise.exerciseId,
          name: exercise.exerciseNameSnapshot,
          coachNotes: exercise.coachNotes,
          sets: exercise.assignedSets.map((set) => ({
            id: set.id,
            order: set.orderIndex,
            min: set.targetRepsMin ?? set.expectedReps,
            max: set.targetRepsMax ?? set.expectedReps,
            weight: set.targetWeight?.toString() ?? null,
            unit: set.targetWeightUnit,
            effort: set.targetEffort?.toString() ?? null,
            log: set.log
              ? {
                  status: set.log.status,
                  reps: set.log.actualReps,
                  weight: set.log.actualWeight?.toString() ?? null,
                  unit: set.log.weightUnit,
                }
              : null,
          })),
          previous: workout.previousLogs
            .filter(
              (log) => log.workoutExercise.exerciseId === exercise.exerciseId,
            )
            .map((log) => ({
              reps: log.actualReps,
              weight: log.actualWeight?.toString() ?? null,
              unit: log.weightUnit,
            })),
        }))}
      />
      {!workout.finalizedAt ? (
        <ConfirmForm
          action={finalizeWorkoutAction.bind(null, workout.id)}
          message="Finish and lock this workout? You will not be able to edit it afterward."
        >
          <Button type="submit" size="lg" className="w-full" disabled={!logged}>
            Finish workout
          </Button>
          {!logged ? (
            <p className="text-muted-foreground mt-2 text-center text-xs">
              Complete or skip at least one set first.
            </p>
          ) : null}
        </ConfirmForm>
      ) : (
        <p className="rounded-lg border bg-emerald-50 p-4 text-center text-sm font-medium">
          Workout complete
        </p>
      )}
    </main>
  );
}
