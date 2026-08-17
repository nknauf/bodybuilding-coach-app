"use client";

import { addDays, format, startOfWeek } from "date-fns";
import { CalendarPlus, Dumbbell, Plus, Salad, Sparkles } from "lucide-react";
import { useState } from "react";
import { useDemo } from "@/demo/demo-provider";
import type {
  DemoMeal,
  DemoSupplement,
  DemoWorkout,
  DemoWorkoutExercise,
} from "@/demo/model";
import { WeightChart } from "@/components/weight-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Kind = "workout" | "meal" | "supplement";

export function CoachClientDemo({ clientId }: { clientId: string }) {
  const { state, dispatch } = useDemo();
  const client =
    state.clients.find((item) => item.id === clientId) ?? state.clients[0]!;
  const [drawer, setDrawer] = useState<{ kind: Kind; date?: string } | null>(
    null,
  );
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const workouts = state.workouts.filter((item) => item.clientId === client.id);
  const meals = state.meals.filter((item) => item.clientId === client.id);
  const supplements = state.supplements.filter(
    (item) => item.clientId === client.id,
  );
  const completedSets = workouts
    .flatMap((x) => x.exercises.flatMap((y) => y.sets))
    .filter((x) => x.status === "COMPLETED").length;
  const totalSets = workouts.flatMap((x) =>
    x.exercises.flatMap((y) => y.sets),
  ).length;
  const compliance = totalSets
    ? Math.round((completedSets / totalSets) * 100)
    : 0;
  const weights = state.bodyweights.filter(
    (item) => item.clientId === client.id,
  );
  const events = [
    ...workouts.map((x) => ({
      id: x.id,
      kind: "workout" as const,
      name: x.name,
      at: x.scheduledAt,
      complete: x.status === "COMPLETED",
    })),
    ...meals.map((x) => ({
      id: x.id,
      kind: "meal" as const,
      name: x.name,
      at: x.scheduledAt,
      complete: Boolean(x.completedAt),
    })),
    ...supplements.map((x) => ({
      id: x.id,
      kind: "supplement" as const,
      name: x.name,
      at: x.scheduledAt,
      complete: Boolean(x.completedAt),
    })),
  ];
  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-center gap-4 border-b pb-5">
        <span className="bg-muted grid size-11 place-items-center rounded-full font-semibold">
          {client.initials}
        </span>
        <div className="min-w-44 flex-1">
          <p className="text-muted-foreground text-xs">Demo client</p>
          <h1 className="text-2xl font-semibold">{client.name}</h1>
        </div>
        <Summary
          label="Latest weight"
          value={weights.length ? `${weights.at(-1)!.value} LB` : "—"}
        />
        <Summary label="Workout compliance" value={`${compliance}%`} />
        <Summary label="Current streak" value="4 days" />
      </header>
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Schedule</p>
            <h2 className="text-xl font-semibold">This week</h2>
          </div>
          <span className="text-muted-foreground text-xs">
            {state.timezone}
          </span>
        </div>
        <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-7 md:px-0">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const items = events.filter((item) => item.at.startsWith(key));
            return (
              <div
                key={key}
                className="min-h-40 w-40 shrink-0 snap-start rounded-lg border bg-white p-2 md:w-auto"
              >
                <button
                  onClick={() => setDrawer({ kind: "workout", date: key })}
                  className="hover:bg-muted flex w-full items-center justify-between rounded-md p-1 text-left"
                >
                  <span>
                    <span className="text-muted-foreground block text-xs uppercase">
                      {format(day, "EEE")}
                    </span>
                    <strong>{format(day, "d")}</strong>
                  </span>
                  <Plus className="size-4" />
                </button>
                <div className="mt-2 space-y-1.5">
                  {items.length ? (
                    items.map((item) => (
                      <div
                        key={`${item.kind}-${item.id}`}
                        className={`${item.kind === "workout" ? "border-blue-200 bg-blue-50" : item.kind === "meal" ? "border-emerald-200 bg-emerald-50" : "border-violet-200 bg-violet-50"} rounded-md border p-2 text-xs`}
                      >
                        <strong className="block truncate">{item.name}</strong>
                        <span className="text-muted-foreground">
                          {format(new Date(item.at), "p")}{" "}
                          {item.complete ? "✓" : ""}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground p-1 text-xs">
                      Nothing scheduled
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold">Quick add</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <Quick
            icon={Dumbbell}
            title="Workout"
            detail="Schedule training"
            onClick={() => setDrawer({ kind: "workout" })}
          />
          <Quick
            icon={Salad}
            title="Meal"
            detail="Assign nutrition"
            onClick={() => setDrawer({ kind: "meal" })}
          />
          <Quick
            icon={Sparkles}
            title="Supplement"
            detail="Add protocol"
            onClick={() => setDrawer({ kind: "supplement" })}
          />
        </div>
      </section>
      <section id="progress" className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Bodyweight trend</CardTitle>
          </CardHeader>
          <CardContent>
            <WeightChart
              points={weights.map((item) => ({
                date: format(new Date(item.measuredAt), "MMM d"),
                value: item.value,
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.activity
              .filter((item) => item.clientId === client.id)
              .slice(0, 6)
              .map((item) => (
                <div
                  key={item.id}
                  className="border-b pb-2 text-sm last:border-0"
                >
                  <strong className="block font-medium">{item.label}</strong>
                  <span className="text-muted-foreground text-xs">
                    {format(new Date(item.at), "MMM d, p")}
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>
      </section>
      <Sheet
        open={Boolean(drawer)}
        onOpenChange={(open) => !open && setDrawer(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Add {drawer?.kind}</SheetTitle>
            <SheetDescription>
              This updates only the fictional demo session.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-8">
            {drawer?.kind === "workout" ? (
              <WorkoutForm
                date={drawer.date}
                clientId={client.id}
                onSave={(workout) => {
                  dispatch({ type: "ADD_WORKOUT", workout });
                  dispatch({
                    type: "ADD_ACTIVITY",
                    activity: {
                      id: crypto.randomUUID(),
                      clientId: client.id,
                      label: `Coach scheduled ${workout.name}`,
                      at: new Date().toISOString(),
                    },
                  });
                  setDrawer(null);
                }}
                exercises={state.exercises}
              />
            ) : drawer?.kind === "meal" ? (
              <MealForm
                date={drawer.date}
                clientId={client.id}
                save={(meal) => {
                  dispatch({ type: "ADD_MEAL", meal });
                  setDrawer(null);
                }}
              />
            ) : drawer?.kind === "supplement" ? (
              <SupplementForm
                date={drawer.date}
                clientId={client.id}
                save={(supplement) => {
                  dispatch({ type: "ADD_SUPPLEMENT", supplement });
                  setDrawer(null);
                }}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-28">
      <p className="text-muted-foreground text-xs">{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
function Quick({
  icon: Icon,
  title,
  detail,
  onClick,
}: {
  icon: typeof CalendarPlus;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="hover:bg-muted/50 flex items-center gap-3 rounded-lg border bg-white p-3 text-left"
    >
      <span className="bg-muted grid size-9 place-items-center rounded-md">
        <Icon className="size-4" />
      </span>
      <span>
        <strong className="block text-sm">{title}</strong>
        <span className="text-muted-foreground text-xs">{detail}</span>
      </span>
    </button>
  );
}
function defaultDate(date?: string) {
  return `${date ?? format(new Date(), "yyyy-MM-dd")}T12:00`;
}

function WorkoutForm({
  date,
  clientId,
  exercises,
  onSave,
}: {
  date?: string;
  clientId: string;
  exercises: { id: string; name: string }[];
  onSave: (workout: DemoWorkout) => void;
}) {
  const [count, setCount] = useState(3);
  const [reps, setReps] = useState(10);
  function submit(formData: FormData) {
    const exerciseId = String(formData.get("exerciseId"));
    const selected =
      exercises.find((x) => x.id === exerciseId) ?? exercises[0]!;
    const workoutId = crypto.randomUUID();
    const assigned: DemoWorkoutExercise = {
      id: crypto.randomUUID(),
      exerciseId: selected.id,
      name: selected.name,
      sets: Array.from({ length: count }, () => ({
        id: crypto.randomUUID(),
        targetRepsMin: reps,
        targetRepsMax: reps,
        unit: "LB" as const,
      })),
      previous: [],
    };
    onSave({
      id: workoutId,
      clientId,
      name: String(formData.get("name")),
      scheduledAt: new Date(String(formData.get("scheduledAt"))).toISOString(),
      status: "SCHEDULED",
      exercises: [assigned],
    });
  }
  return (
    <form action={submit} className="space-y-4">
      <label className="block text-sm font-medium">
        Workout name
        <Input name="name" required placeholder="Push B" className="mt-1" />
      </label>
      <label className="block text-sm font-medium">
        Date and time
        <Input
          name="scheduledAt"
          type="datetime-local"
          required
          defaultValue={defaultDate(date)}
          className="mt-1"
        />
      </label>
      <label className="block text-sm font-medium">
        Exercise
        <select
          name="exerciseId"
          className="mt-1 h-10 w-full rounded-lg border px-3 text-sm"
        >
          {exercises.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <div>
        <span className="text-sm font-medium">Quick prescription</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            [2, 8],
            [3, 8],
            [3, 10],
            [4, 8],
            [4, 10],
          ].map(([c, r]) => (
            <Button
              key={`${c}-${r}`}
              type="button"
              size="xs"
              variant={count === c && reps === r ? "default" : "outline"}
              onClick={() => {
                setCount(c!);
                setReps(r!);
              }}
            >
              {c}×{r}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">
          Sets
          <Input
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            className="mt-1"
          />
        </label>
        <label className="text-sm font-medium">
          Reps
          <Input
            type="number"
            min={1}
            max={100}
            value={reps}
            onChange={(event) => setReps(Number(event.target.value))}
            className="mt-1"
          />
        </label>
      </div>
      <Button className="w-full">Schedule workout</Button>
    </form>
  );
}
function MealForm({
  date,
  clientId,
  save,
}: {
  date?: string;
  clientId: string;
  save: (meal: DemoMeal) => void;
}) {
  function submit(data: FormData) {
    save({
      id: crypto.randomUUID(),
      clientId,
      name: String(data.get("name")),
      scheduledAt: new Date(String(data.get("scheduledAt"))).toISOString(),
      calories: Number(data.get("calories")),
      protein: Number(data.get("protein")),
      carbs: Number(data.get("carbs") || 0),
      fat: Number(data.get("fat") || 0),
    });
  }
  return (
    <form action={submit} className="space-y-3">
      <Input name="name" placeholder="Meal name" required />
      <Input
        name="scheduledAt"
        type="datetime-local"
        defaultValue={defaultDate(date)}
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <Input name="calories" type="number" placeholder="Calories" required />
        <Input
          name="protein"
          type="number"
          placeholder="Protein (g)"
          required
        />
        <Input name="carbs" type="number" placeholder="Carbs (g)" />
        <Input name="fat" type="number" placeholder="Fat (g)" />
      </div>
      <Button className="w-full">Schedule meal</Button>
    </form>
  );
}
function SupplementForm({
  date,
  clientId,
  save,
}: {
  date?: string;
  clientId: string;
  save: (supplement: DemoSupplement) => void;
}) {
  function submit(data: FormData) {
    save({
      id: crypto.randomUUID(),
      clientId,
      name: String(data.get("name")),
      dosage: String(data.get("dosage")),
      scheduledAt: new Date(String(data.get("scheduledAt"))).toISOString(),
    });
  }
  return (
    <form action={submit} className="space-y-3">
      <Input name="name" placeholder="Supplement" required />
      <Input name="dosage" placeholder="Dosage" required />
      <Input
        name="scheduledAt"
        type="datetime-local"
        defaultValue={defaultDate(date)}
        required
      />
      <Button className="w-full">Add supplement</Button>
    </form>
  );
}
