"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LogAction = (
  workoutId: string,
  setId: string,
  formData: FormData,
) => Promise<void>;
type Exercise = {
  id: string;
  exerciseId: string;
  name: string;
  coachNotes: string | null;
  sets: {
    id: string;
    order: number;
    min: number;
    max: number;
    weight: string | null;
    unit: string | null;
    effort: string | null;
    log: {
      status: string;
      reps: number | null;
      weight: string | null;
      unit: string | null;
    } | null;
  }[];
  previous: {
    reps: number | null;
    weight: string | null;
    unit: string | null;
  }[];
};

export function WorkoutLogger({
  workoutId,
  startedAt,
  exercises,
  action,
}: {
  workoutId: string;
  startedAt: string;
  exercises: Exercise[];
  action: LogAction;
}) {
  const firstIncomplete = Math.max(
    0,
    exercises.findIndex((exercise) => exercise.sets.some((set) => !set.log)),
  );
  const [open, setOpen] = useState(firstIncomplete);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.parse(startedAt);
    const tick = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  const completed = useMemo(
    () => exercises.flatMap((x) => x.sets).filter((x) => x.log).length,
    [exercises],
  );
  const total = exercises.flatMap((x) => x.sets).length;
  return (
    <div className="space-y-4">
      <div className="bg-background sticky top-16 z-20 -mx-4 border-y px-4 py-3 sm:mx-0 sm:rounded-lg sm:border">
        <div className="flex items-center justify-between text-sm">
          <strong>
            Exercise {Math.min(open + 1, exercises.length)} of{" "}
            {exercises.length}
          </strong>
          <span className="tabular-nums">{formatTimer(elapsed)} elapsed</span>
        </div>
        <div className="bg-muted mt-2 h-1.5 rounded-full">
          <div
            className="h-full rounded-full bg-zinc-950 transition-[width]"
            style={{ width: `${total ? (completed / total) * 100 : 0}%` }}
          />
        </div>
      </div>
      {exercises.map((exercise, index) => (
        <section key={exercise.id} className="rounded-lg border">
          <button
            onClick={() => setOpen(index)}
            className="flex w-full items-center justify-between gap-3 p-4 text-left"
          >
            <span>
              <strong className="block">{exercise.name}</strong>
              <span className="text-muted-foreground text-xs">
                {exercise.sets.filter((x) => x.log).length} of{" "}
                {exercise.sets.length} sets logged
              </span>
            </span>
            {open === index ? <ChevronDown /> : <ChevronRight />}
          </button>
          {open === index ? (
            <div className="space-y-3 border-t p-4">
              {exercise.coachNotes ? (
                <p className="bg-muted/50 rounded-md p-3 text-sm">
                  {exercise.coachNotes}
                </p>
              ) : null}
              {exercise.previous.length ? (
                <div className="text-muted-foreground text-xs">
                  <strong className="text-foreground">Last time: </strong>
                  {exercise.previous.slice(0, 3).map((x, i) => (
                    <span key={i}>
                      {i ? " · " : ""}
                      {x.weight ?? "BW"} {x.unit ?? ""} × {x.reps ?? "—"}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  No previous performance for this exercise.
                </p>
              )}
              {exercise.sets.map((set, setIndex) =>
                set.log ? (
                  <details
                    key={set.id}
                    className="group rounded-md border bg-emerald-50/50"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between p-3 text-sm">
                      <span>
                        Set {set.order + 1} —{" "}
                        {set.log.status === "SKIPPED"
                          ? "Skipped"
                          : `${set.log.weight ?? "BW"} ${set.log.unit ?? ""} × ${set.log.reps ?? "—"}`}
                      </span>
                      <Check className="size-4 text-emerald-700" />
                    </summary>
                    <SetForm
                      action={action}
                      workoutId={workoutId}
                      set={set}
                      previous={exercise.sets[setIndex - 1]?.log ?? null}
                    />
                  </details>
                ) : (
                  <SetForm
                    key={set.id}
                    action={action}
                    workoutId={workoutId}
                    set={set}
                    previous={exercise.sets[setIndex - 1]?.log ?? null}
                  />
                ),
              )}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
function SetForm({
  action,
  workoutId,
  set,
  previous,
}: {
  action: LogAction;
  workoutId: string;
  set: Exercise["sets"][number];
  previous: Exercise["sets"][number]["log"];
}) {
  const initialWeight = set.log?.weight ?? set.weight ?? previous?.weight ?? "";
  const initialReps = String(set.log?.reps ?? set.min);
  const [weight, setWeight] = useState(initialWeight);
  const [reps, setReps] = useState(initialReps);
  const target = `${set.weight ?? "Bodyweight"}${set.unit ? ` ${set.unit}` : ""} × ${set.min}${set.max !== set.min ? `–${set.max}` : ""}${set.effort ? ` @ ${set.effort}` : ""}`;
  return (
    <form
      action={action.bind(null, workoutId, set.id)}
      className="rounded-md border p-3"
    >
      <input type="hidden" name="status" value="COMPLETED" />
      <input
        type="hidden"
        name="weightUnit"
        value={set.unit ?? previous?.unit ?? "LB"}
      />
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-muted-foreground text-xs">
            Set {set.order + 1} target
          </p>
          <p className="text-sm font-semibold">{target}</p>
        </div>
        {previous ? (
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => {
              setWeight(previous.weight ?? "");
              setReps(String(previous.reps ?? set.min));
            }}
          >
            Same as previous
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stepper
          label="Actual weight"
          name="actualWeight"
          value={weight}
          setValue={setWeight}
          step={5}
        />
        <Stepper
          label="Actual reps"
          name="actualReps"
          value={reps}
          setValue={setReps}
          step={1}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="submit" className="min-h-11 flex-1">
          Complete set
        </Button>
        <Button type="submit" variant="outline" name="status" value="SKIPPED">
          Skip
        </Button>
      </div>
    </form>
  );
}
function Stepper({
  label,
  name,
  value,
  setValue,
  step,
}: {
  label: string;
  name: string;
  value: string;
  setValue: (v: string) => void;
  step: number;
}) {
  const change = (n: number) =>
    setValue(String(Math.max(0, (Number(value) || 0) + n)));
  return (
    <label>
      <span className="mb-1 block text-xs font-medium">{label}</span>
      <span className="flex">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-r-none"
          onClick={() => change(-step)}
          aria-label={`Decrease ${label}`}
        >
          <Minus />
        </Button>
        <Input
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="decimal"
          type="number"
          step={step === 5 ? "0.5" : "1"}
          className="rounded-none text-center"
          required
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-l-none"
          onClick={() => change(step)}
          aria-label={`Increase ${label}`}
        >
          <Plus />
        </Button>
      </span>
    </label>
  );
}
function formatTimer(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [
    hours ? String(hours).padStart(2, "0") : null,
    String(minutes).padStart(2, "0"),
    String(rest).padStart(2, "0"),
  ]
    .filter(Boolean)
    .join(":");
}
