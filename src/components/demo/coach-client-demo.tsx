"use client";

import { addDays, format, startOfWeek } from "date-fns";
import {
  CalendarPlus,
  Dumbbell,
  Plus,
  Salad,
  Sparkles,
  Trash2,
} from "lucide-react";
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
type DemoExerciseDraftState = {
  key: string;
  exerciseId: string;
  count: number;
  reps: number;
  search: string;
  creating: boolean;
};

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
                onCreateExercise={(name) => {
                  const exercise = {
                    id: crypto.randomUUID(),
                    name: name.trim(),
                    scope: "COACH" as const,
                  };
                  dispatch({ type: "ADD_EXERCISE", exercise });
                  return exercise;
                }}
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
  onCreateExercise,
  onSave,
}: {
  date?: string;
  clientId: string;
  exercises: { id: string; name: string }[];
  onCreateExercise: (name: string) => { id: string; name: string };
  onSave: (workout: DemoWorkout) => void;
}) {
  const makeDraft = (): DemoExerciseDraftState => ({
    key: crypto.randomUUID(),
    exerciseId: exercises[0]?.id ?? "",
    count: 3,
    reps: 8,
    search: "",
    creating: false,
  });
  const [draftExercises, setDraftExercises] = useState([makeDraft()]);
  const updateDraft = (key: string, update: Partial<DemoExerciseDraftState>) =>
    setDraftExercises((current) =>
      current.map((item) => (item.key === key ? { ...item, ...update } : item)),
    );
  function submit(formData: FormData) {
    const workoutId = crypto.randomUUID();
    const assigned: DemoWorkoutExercise[] = draftExercises.map((draft) => {
      const selected =
        exercises.find((item) => item.id === draft.exerciseId) ?? exercises[0]!;
      return {
        id: crypto.randomUUID(),
        exerciseId: selected.id,
        name: selected.name,
        sets: Array.from({ length: draft.count }, () => ({
          id: crypto.randomUUID(),
          targetRepsMin: draft.reps,
          targetRepsMax: draft.reps,
          unit: "LB" as const,
        })),
        previous: [],
      };
    });
    onSave({
      id: workoutId,
      clientId,
      name: String(formData.get("name")),
      scheduledAt: new Date(String(formData.get("scheduledAt"))).toISOString(),
      status: "SCHEDULED",
      exercises: assigned,
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
      <div className="space-y-3">
        {draftExercises.map((draft, index) => (
          <DemoExerciseDraft
            key={draft.key}
            draft={draft}
            index={index}
            exercises={exercises}
            canRemove={draftExercises.length > 1}
            update={(update) => updateDraft(draft.key, update)}
            remove={() =>
              setDraftExercises((current) =>
                current.filter((item) => item.key !== draft.key),
              )
            }
            createExercise={onCreateExercise}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() =>
            setDraftExercises((current) => [...current, makeDraft()])
          }
        >
          <Plus /> Add exercise
        </Button>
      </div>
      <Button className="w-full">Schedule workout</Button>
    </form>
  );
}

function DemoExerciseDraft({
  draft,
  index,
  exercises,
  canRemove,
  update,
  remove,
  createExercise,
}: {
  draft: DemoExerciseDraftState;
  index: number;
  exercises: { id: string; name: string }[];
  canRemove: boolean;
  update: (update: Partial<DemoExerciseDraftState>) => void;
  remove: () => void;
  createExercise: (name: string) => { id: string; name: string };
}) {
  const normalizedSearch = draft.search.trim().toLowerCase();
  const matches = exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(normalizedSearch),
  );
  const hasExactMatch = exercises.some(
    (exercise) => exercise.name.trim().toLowerCase() === normalizedSearch,
  );
  return (
    <fieldset className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Exercise {index + 1}</span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={`Remove exercise ${index + 1}`}
          disabled={!canRemove}
          onClick={remove}
        >
          <Trash2 />
        </Button>
      </div>
      <Input
        value={draft.search}
        onChange={(event) => update({ search: event.target.value })}
        placeholder="Search exercises"
        aria-label={`Search exercise ${index + 1}`}
      />
      <select
        aria-label={`Exercise ${index + 1}`}
        className="h-10 w-full rounded-lg border px-3 text-sm"
        value={draft.exerciseId}
        onChange={(event) => update({ exerciseId: event.target.value })}
      >
        {matches.map((exercise) => (
          <option key={exercise.id} value={exercise.id}>
            {exercise.name}
          </option>
        ))}
        {!matches.some((exercise) => exercise.id === draft.exerciseId)
          ? exercises
              .filter((exercise) => exercise.id === draft.exerciseId)
              .map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))
          : null}
      </select>
      {normalizedSearch && !hasExactMatch ? (
        draft.creating ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2">
            <span className="text-sm">
              Create &quot;{draft.search.trim()}&quot;?
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const created = createExercise(draft.search);
                update({
                  exerciseId: created.id,
                  search: created.name,
                  creating: false,
                });
              }}
            >
              Create and select
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => update({ creating: false })}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => update({ creating: true })}
          >
            <Plus /> Create &quot;{draft.search.trim()}&quot;
          </Button>
        )
      ) : null}
      <div>
        <span className="text-sm font-medium">Quick prescription</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            [2, 8],
            [3, 8],
            [3, 10],
            [4, 8],
            [4, 10],
          ].map(([count, reps]) => (
            <Button
              key={`${count}-${reps}`}
              type="button"
              size="xs"
              variant={
                draft.count === count && draft.reps === reps
                  ? "default"
                  : "outline"
              }
              onClick={() => update({ count: count!, reps: reps! })}
            >
              {count}×{reps}
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
            value={draft.count}
            onChange={(event) => update({ count: Number(event.target.value) })}
            className="mt-1"
          />
        </label>
        <label className="text-sm font-medium">
          Reps
          <Input
            type="number"
            min={1}
            max={100}
            value={draft.reps}
            onChange={(event) => update({ reps: Number(event.target.value) })}
            className="mt-1"
          />
        </label>
      </div>
    </fieldset>
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
