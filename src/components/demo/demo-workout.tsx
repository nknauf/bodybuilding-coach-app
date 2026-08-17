"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronRight, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDemo } from "@/demo/demo-provider";
import type { DemoSet } from "@/demo/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DemoWorkout({ workoutId }: { workoutId: string }) {
  const { state, dispatch } = useDemo();
  const router = useRouter();
  const workout = state.workouts.find((item) => item.id === workoutId);
  const [open, setOpen] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setElapsed((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);
  if (!workout)
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-semibold">Workout not found</h1>
        <Button className="mt-4" onClick={() => router.push("/demo/client")}>
          Back to Today
        </Button>
      </div>
    );
  const allSets = workout.exercises.flatMap((exercise) => exercise.sets);
  const completed = allSets.filter((set) => set.status).length;
  const finish = () => {
    const now = new Date().toISOString();
    dispatch({ type: "FINALIZE_WORKOUT", workoutId, at: now });
    dispatch({
      type: "ADD_ACTIVITY",
      activity: {
        id: crypto.randomUUID(),
        clientId: workout.clientId,
        label: `Completed ${workout.name}`,
        at: now,
      },
    });
    router.push("/demo/client");
  };
  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-20">
      <header>
        <p className="text-muted-foreground text-sm">Dedicated workout mode</p>
        <h1 className="text-3xl font-semibold">{workout.name}</h1>
      </header>
      <div className="bg-background sticky top-24 z-20 rounded-lg border p-3">
        <div className="flex justify-between text-sm">
          <strong>
            {completed} of {allSets.length} sets
          </strong>
          <span className="tabular-nums">
            {Math.floor(elapsed / 60)
              .toString()
              .padStart(2, "0")}
            :{(elapsed % 60).toString().padStart(2, "0")} elapsed
          </span>
        </div>
        <div className="bg-muted mt-2 h-1.5 rounded-full">
          <div
            className="h-full rounded-full bg-zinc-950"
            style={{
              width: `${allSets.length ? (completed / allSets.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
      {workout.exercises.map((exercise, index) => (
        <section key={exercise.id} className="rounded-lg border bg-white">
          <button
            onClick={() => setOpen(index)}
            className="flex w-full items-center justify-between p-4 text-left"
          >
            <span>
              <strong className="block">{exercise.name}</strong>
              <span className="text-muted-foreground text-xs">
                {exercise.sets.filter((set) => set.status).length} of{" "}
                {exercise.sets.length} complete
              </span>
            </span>
            {open === index ? <ChevronDown /> : <ChevronRight />}
          </button>
          {open === index ? (
            <div className="space-y-3 border-t p-4">
              {exercise.notes ? (
                <p className="bg-muted rounded-md p-3 text-sm">
                  {exercise.notes}
                </p>
              ) : null}
              <p className="text-muted-foreground text-xs">
                <strong className="text-foreground">Last time: </strong>
                {exercise.previous.length
                  ? exercise.previous.map((item, itemIndex) => (
                      <span key={itemIndex}>
                        {itemIndex ? " · " : ""}
                        {item.weight ?? "BW"} {item.unit} × {item.reps}
                      </span>
                    ))
                  : "No previous performance"}
              </p>
              {exercise.sets.map((set, setIndex) => (
                <SetLogger
                  key={set.id}
                  workoutId={workout.id}
                  set={set}
                  previous={exercise.sets[setIndex - 1]}
                />
              ))}
            </div>
          ) : null}
        </section>
      ))}
      <Button
        size="lg"
        className="w-full"
        disabled={!completed || Boolean(workout.finalizedAt)}
        onClick={finish}
      >
        {workout.finalizedAt ? "Workout complete" : "Finish workout"}
      </Button>
    </div>
  );
}

function SetLogger({
  workoutId,
  set,
  previous,
}: {
  workoutId: string;
  set: DemoSet;
  previous?: DemoSet;
}) {
  const { dispatch } = useDemo();
  const [weight, setWeight] = useState(
    String(
      set.actualWeight ?? set.targetWeight ?? previous?.actualWeight ?? "",
    ),
  );
  const [reps, setReps] = useState(String(set.actualReps ?? set.targetRepsMin));
  if (set.status)
    return (
      <div className="flex items-center justify-between rounded-md border bg-emerald-50/50 p-3 text-sm">
        <span>
          {set.status === "SKIPPED"
            ? "Skipped"
            : `${set.actualWeight ?? "BW"} ${set.unit} × ${set.actualReps}`}
        </span>
        <Button
          size="xs"
          variant="ghost"
          onClick={() =>
            dispatch({ type: "REOPEN_SET", workoutId, setId: set.id })
          }
        >
          <Check className="text-emerald-700" /> Edit
        </Button>
      </div>
    );
  return (
    <div className="rounded-md border p-3">
      <div className="mb-3 flex justify-between gap-2">
        <div>
          <p className="text-muted-foreground text-xs">Target</p>
          <strong className="text-sm">
            {set.targetWeight ?? "Bodyweight"}{" "}
            {set.targetWeight ? set.unit : ""} × {set.targetRepsMin}
            {set.targetRepsMax !== set.targetRepsMin
              ? `–${set.targetRepsMax}`
              : ""}
          </strong>
        </div>
        {previous?.status === "COMPLETED" ? (
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              setWeight(String(previous.actualWeight ?? ""));
              setReps(String(previous.actualReps ?? set.targetRepsMin));
            }}
          >
            Same as previous
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stepper
          label="Actual weight"
          value={weight}
          setValue={setWeight}
          step={5}
        />
        <Stepper label="Actual reps" value={reps} setValue={setReps} step={1} />
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          className="flex-1"
          onClick={() =>
            dispatch({
              type: "LOG_SET",
              workoutId,
              setId: set.id,
              reps: Number(reps),
              weight: weight ? Number(weight) : undefined,
              status: "COMPLETED",
            })
          }
        >
          Complete set
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            dispatch({
              type: "LOG_SET",
              workoutId,
              setId: set.id,
              status: "SKIPPED",
            })
          }
        >
          Skip
        </Button>
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  setValue,
  step,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  step: number;
}) {
  const change = (amount: number) =>
    setValue(String(Math.max(0, Number(value || 0) + amount)));
  return (
    <label>
      <span className="mb-1 block text-xs font-medium">{label}</span>
      <span className="flex">
        <Button
          size="icon"
          variant="outline"
          className="rounded-r-none"
          onClick={() => change(-step)}
        >
          <Minus />
        </Button>
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          type="number"
          inputMode="decimal"
          className="rounded-none text-center"
        />
        <Button
          size="icon"
          variant="outline"
          className="rounded-l-none"
          onClick={() => change(step)}
        >
          <Plus />
        </Button>
      </span>
    </label>
  );
}
