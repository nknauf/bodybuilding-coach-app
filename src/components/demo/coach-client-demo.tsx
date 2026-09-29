"use client";

import { addDays, format, startOfWeek } from "date-fns";
import {
  CalendarPlus,
  Dumbbell,
  Plus,
  Salad,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  BuilderFooter,
  ScheduleControls,
  ItemMenu,
  SortHandle,
  PresetMenu,
  builderFormClass,
  builderBodyClass,
} from "@/components/builder-ui";
import { rankExercises } from "@/lib/exercise-search";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
      <Dialog
        open={Boolean(drawer)}
        onOpenChange={(open) => !open && setDrawer(null)}
      >
        <DialogContent
          showCloseButton={false}
          className={`flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 ${drawer?.kind === "supplement" ? "sm:max-w-[520px]" : "sm:max-w-[760px]"}`}
        >
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <DialogTitle>Create {drawer?.kind}</DialogTitle>
            <DialogDescription>
              This updates only the fictional demo session.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            {drawer?.kind === "workout" ? (
              <WorkoutForm
                onCancel={() => setDrawer(null)}
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
                onCancel={() => setDrawer(null)}
                date={drawer.date}
                clientId={client.id}
                save={(meal) => {
                  dispatch({ type: "ADD_MEAL", meal });
                  setDrawer(null);
                }}
              />
            ) : drawer?.kind === "supplement" ? (
              <SupplementForm
                onCancel={() => setDrawer(null)}
                date={drawer.date}
                clientId={client.id}
                save={(supplement) => {
                  dispatch({ type: "ADD_SUPPLEMENT", supplement });
                  setDrawer(null);
                }}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
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
  onCancel,
  clientId,
  exercises,
  onCreateExercise,
  onSave,
}: {
  date?: string;
  onCancel: () => void;
  clientId: string;
  exercises: { id: string; name: string }[];
  onCreateExercise: (name: string) => { id: string; name: string };
  onSave: (workout: DemoWorkout) => void;
}) {
  const makeDraft = (): DemoExerciseDraftState => ({
    key: crypto.randomUUID(),
    exerciseId: "",
    count: 3,
    reps: 8,
    search: "",
    creating: false,
  });
  const [draftExercises, setDraftExercises] = useState<
    DemoExerciseDraftState[]
  >([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const move = (from: number, to: number) =>
    setDraftExercises((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  const updateDraft = (key: string, update: Partial<DemoExerciseDraftState>) =>
    setDraftExercises((current) =>
      current.map((item) => (item.key === key ? { ...item, ...update } : item)),
    );
  function submit(formData: FormData) {
    if (!draftExercises.length) {
      setError("Add at least one exercise.");
      return;
    }
    const invalid = draftExercises.find(
      (draft) =>
        !exercises.some((exercise) => exercise.id === draft.exerciseId) ||
        !Number.isInteger(draft.count) ||
        draft.count < 1 ||
        draft.count > 10 ||
        !Number.isInteger(draft.reps) ||
        draft.reps < 1 ||
        draft.reps > 100,
    );

    if (invalid) {
      setExpanded(invalid.key);
      setError("Select an exercise and enter valid sets and reps.");
      return;
    }
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
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget));
      }}
      className={builderFormClass}
    >
      <div className={builderBodyClass} data-builder-scroll>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <h3 className="text-sm font-semibold">Workout information</h3>
        <label className="block text-sm font-medium">
          Workout name
          <Input
            name="name"
            required
            placeholder="Push B"
            className="mt-1 sm:max-w-xs"
          />
        </label>
        <ScheduleControls name="scheduledAt" value={defaultDate(date)} />
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">
            Exercises ({draftExercises.length})
          </h3>
          {draftExercises.map((draft, index) => (
            <DemoExerciseDraft
              key={draft.key}
              expanded={expanded === draft.key}
              onToggle={() =>
                setExpanded(expanded === draft.key ? null : draft.key)
              }
              onMove={move}
              last={index === draftExercises.length - 1}
              onDuplicate={() => {
                const copy = { ...draft, key: crypto.randomUUID() };
                setDraftExercises((current) => [
                  ...current.slice(0, index + 1),
                  copy,
                  ...current.slice(index + 1),
                ]);
                setExpanded(copy.key);
              }}
              recentIds={recentIds}
              onSelect={(id) =>
                setRecentIds((current) =>
                  [id, ...current.filter((item) => item !== id)].slice(0, 5),
                )
              }
              draft={draft}
              index={index}
              exercises={exercises}
              canRemove={true}
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
            onClick={() => {
              const draft = makeDraft();
              setDraftExercises((current) => [...current, draft]);
              setExpanded(draft.key);
            }}
          >
            <Plus /> Add exercise
          </Button>
        </div>
      </div>
      <BuilderFooter onCancel={onCancel}>
        <Button type="submit">Create workout</Button>
      </BuilderFooter>
    </form>
  );
}

function DemoExerciseDraft({
  expanded,
  onToggle,
  onMove,
  last,
  onDuplicate,
  recentIds,
  onSelect,
  draft,
  index,
  exercises,
  canRemove,
  update,
  remove,
  createExercise,
}: {
  expanded: boolean;
  onToggle: () => void;
  onMove: (from: number, to: number) => void;
  last: boolean;
  onDuplicate: () => void;
  recentIds: string[];
  onSelect: (id: string) => void;
  draft: DemoExerciseDraftState;
  index: number;
  exercises: { id: string; name: string }[];
  canRemove: boolean;
  update: (update: Partial<DemoExerciseDraftState>) => void;
  remove: () => void;
  createExercise: (name: string) => { id: string; name: string };
}) {
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const normalizedSearch = draft.search.trim().toLowerCase();
  const matches = normalizedSearch
    ? rankExercises(exercises, draft.search)
    : [
        ...recentIds
          .map((id) => exercises.find((exercise) => exercise.id === id))
          .filter((exercise): exercise is { id: string; name: string } =>
            Boolean(exercise),
          ),
        ...exercises
          .filter((exercise) => !recentIds.includes(exercise.id))
          .sort((a, b) => a.name.localeCompare(b.name)),
      ].slice(0, 20);
  const hasExactMatch = exercises.some(
    (exercise) => exercise.name.toLowerCase() === normalizedSearch,
  );
  const select = (exercise: { id: string; name: string }) => {
    update({ exerciseId: exercise.id, search: exercise.name });
    onSelect(exercise.id);
    setOpen(false);
  };
  useEffect(() => {
    if (expanded) requestAnimationFrame(() => input.current?.focus());
  }, [expanded]);
  return (
    <fieldset
      data-sort-group="demo-exercises"
      data-sort-index={index}
      className="rounded-xl border"
    >
      <div className="flex items-center gap-1 p-2">
        <SortHandle
          index={index}
          group="demo-exercises"
          onMove={onMove}
          label={`exercise ${index + 1}`}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`demo-body-${draft.key}`}
          className="min-w-0 flex-1 py-2 text-left"
        >
          <span className="block truncate text-sm font-semibold">
            {index + 1}.{" "}
            {exercises.find((exercise) => exercise.id === draft.exerciseId)
              ?.name ?? "Choose an exercise"}
          </span>
          <span className="text-muted-foreground text-xs">
            {draft.count} sets · {draft.reps} reps
          </span>
        </button>
        <ChevronDown className={`size-4 ${expanded ? "rotate-180" : ""}`} />
        <ItemMenu
          label={`exercise ${index + 1}`}
          first={index === 0}
          last={last}
          canRemove={canRemove}
          onUp={() => onMove(index, index - 1)}
          onDown={() => onMove(index, index + 1)}
          onRemove={remove}
          onDuplicate={onDuplicate}
        />
      </div>
      <div
        hidden={!expanded}
        id={`demo-body-${draft.key}`}
        className="space-y-3 border-t p-3"
      >
        <div
          className="relative"
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setOpen(false);
          }}
        >
          <Input
            ref={input}
            value={draft.search}
            role="combobox"
            aria-label={`Search exercise ${index + 1}`}
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={open ? `demo-results-${draft.key}` : undefined}
            aria-activedescendant={
              open && matches.length
                ? `demo-result-${draft.key}-${Math.min(active, matches.length - 1)}`
                : undefined
            }
            onFocus={(event) => {
              setActive(0);
              setOpen(true);
              event.target.select();
            }}
            onChange={(event) => {
              update({ search: event.target.value, exerciseId: "" });
              setActive(0);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && open) {
                setOpen(false);
                event.stopPropagation();
              } else if (
                ["ArrowDown", "ArrowUp"].includes(event.key) &&
                matches.length
              ) {
                event.preventDefault();
                setOpen(true);
                setActive(
                  (current) =>
                    (current +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      matches.length) %
                    matches.length,
                );
              } else if (event.key === "Enter" && open && matches.length) {
                event.preventDefault();
                select(matches[active] ?? matches[0]);
              }
            }}
            placeholder="Search exercises"
          />
          {open && (
            <div className="bg-popover absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border shadow-lg">
              <div id={`demo-results-${draft.key}`} role="listbox">
                {matches.map((exercise, matchIndex) => (
                  <Fragment key={exercise.id}>
                    {!normalizedSearch &&
                      (matchIndex === 0 || matchIndex === recentIds.length) && (
                        <p
                          role="presentation"
                          className="text-muted-foreground px-3 py-2 text-xs"
                        >
                          {matchIndex === 0 && recentIds.length
                            ? "Recently selected"
                            : "Exercise library"}
                        </p>
                      )}
                    <button
                      id={`demo-result-${draft.key}-${matchIndex}`}
                      role="option"
                      tabIndex={-1}
                      aria-selected={active === matchIndex}
                      type="button"
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => select(exercise)}
                      className={`hover:bg-muted block w-full px-3 py-2 text-left text-sm ${active === matchIndex ? "bg-muted" : ""}`}
                    >
                      {exercise.name}
                    </button>
                  </Fragment>
                ))}
                {!matches.length && (
                  <p className="text-muted-foreground p-3 text-sm">
                    No matches found.
                  </p>
                )}
              </div>
              {normalizedSearch && !hasExactMatch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start rounded-none border-t"
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => select(createExercise(draft.search))}
                >
                  <Plus /> Create custom exercise
                </Button>
              )}
            </div>
          )}
        </div>

        <PresetMenu onSelect={(count, reps) => update({ count, reps })} />
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Sets
            <Input
              type="number"
              min={1}
              max={10}
              value={draft.count}
              onChange={(event) =>
                update({ count: Number(event.target.value) })
              }
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
      </div>
    </fieldset>
  );
}

function MealForm({
  date,
  onCancel,
  clientId,
  save,
}: {
  date?: string;
  onCancel: () => void;
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
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget));
      }}
      className={builderFormClass}
    >
      <div className={builderBodyClass} data-builder-scroll>
        <h3 className="text-sm font-semibold">Meal information</h3>
        <label className="block space-y-1.5 text-sm">
          Meal name
          <Input
            name="name"
            className="sm:max-w-xs"
            placeholder="Meal name"
            required
          />
        </label>
        <ScheduleControls name="scheduledAt" value={defaultDate(date)} />
        <h3 className="text-sm font-semibold">Nutrition targets</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input
            aria-label="Calories"
            name="calories"
            type="number"
            placeholder="Calories"
            required
          />
          <Input
            aria-label="Protein (g)"
            name="protein"
            type="number"
            placeholder="Protein (g)"
            required
          />
          <Input
            aria-label="Carbohydrates (g)"
            name="carbs"
            type="number"
            placeholder="Carbs (g)"
          />
          <Input
            aria-label="Fat (g)"
            name="fat"
            type="number"
            placeholder="Fat (g)"
          />
        </div>
      </div>
      <BuilderFooter onCancel={onCancel}>
        <Button type="submit">Create meal</Button>
      </BuilderFooter>
    </form>
  );
}
function SupplementForm({
  date,
  onCancel,
  clientId,
  save,
}: {
  date?: string;
  onCancel: () => void;
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
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget));
      }}
      className={builderFormClass}
    >
      <div className={builderBodyClass} data-builder-scroll>
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Supplement information</h3>
          <label className="block space-y-1.5 text-sm">
            Supplement name
            <Input
              name="name"
              className="sm:max-w-xs"
              placeholder="Supplement"
              required
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            Assigned dosage
            <Input name="dosage" placeholder="Dosage" required />
          </label>
        </section>
        <ScheduleControls name="scheduledAt" value={defaultDate(date)} />
      </div>
      <BuilderFooter onCancel={onCancel}>
        <Button type="submit">Create supplement</Button>
      </BuilderFooter>
    </form>
  );
}
