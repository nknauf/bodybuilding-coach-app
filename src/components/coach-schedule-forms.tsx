"use client";

import {
  startTransition,
  useActionState,
  useState,
  type ReactNode,
} from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { ArrowDown, ArrowUp, Copy, Plus, Search, Trash2 } from "lucide-react";
import type { ActionState } from "@/app/actions/state";
import { initialActionState } from "@/app/actions/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ScheduleAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

type WorkoutValues = {
  name: string;
  scheduledAt: string;
  notes: string;
  exercises: {
    exerciseId: string;
    notes: string;
    sets: {
      repsMin: string;
      repsMax: string;
      weight: string;
      unit: "LB" | "KG";
      effort: string;
    }[];
  }[];
};

export function WorkoutBuilder({
  action,
  exercises,
  defaultScheduledAt = "",
}: {
  action: ScheduleAction;
  exercises: { id: string; name: string; scope: string }[];
  defaultScheduledAt?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, initialActionState);
  const form = useForm<WorkoutValues>({
    defaultValues: {
      name: "",
      scheduledAt: defaultScheduledAt,
      notes: "",
      exercises: [
        {
          exerciseId: exercises[0]?.id ?? "",
          notes: "",
          sets: Array.from({ length: 3 }, () => ({
            repsMin: "8",
            repsMax: "8",
            weight: "",
            unit: "LB" as const,
            effort: "",
          })),
        },
      ],
    },
  });
  const items = useFieldArray({ control: form.control, name: "exercises" });

  const submit = form.handleSubmit((values) => {
    const data = new FormData();
    data.set(
      "payload",
      JSON.stringify({
        ...values,
        notes: values.notes || undefined,
        exercises: values.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          notes: exercise.notes || undefined,
          sets: exercise.sets.map((set) => ({
            targetRepsMin: Number(set.repsMin),
            targetRepsMax: Number(set.repsMax || set.repsMin),
            targetWeight: set.weight === "" ? undefined : Number(set.weight),
            targetWeightUnit: set.weight === "" ? undefined : set.unit,
            targetEffort: set.effort === "" ? undefined : Number(set.effort),
          })),
        })),
      }),
    );
    startTransition(() => dispatch(data));
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Workout name">
        <Input {...form.register("name")} required maxLength={120} />
      </Field>
      <div className="grid gap-3">
        <Field label="Client-local date and time">
          <Input
            type="datetime-local"
            {...form.register("scheduledAt")}
            required
          />
        </Field>
      </div>
      <Field label="Workout notes">
        <Textarea {...form.register("notes")} maxLength={2000} />
      </Field>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Exercises and assigned sets</Label>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              items.append({
                exerciseId: exercises[0]?.id ?? "",
                notes: "",
                sets: [
                  {
                    repsMin: "8",
                    repsMax: "8",
                    weight: "",
                    unit: "LB",
                    effort: "",
                  },
                ],
              })
            }
          >
            <Plus /> Add exercise
          </Button>
        </div>
        {items.fields.map((item, index) => (
          <ExerciseEditor
            key={item.id}
            index={index}
            form={form}
            exercises={exercises}
            canRemove={items.fields.length > 1}
            onRemove={() => items.remove(index)}
            onUp={() => items.swap(index, index - 1)}
            onDown={() => items.swap(index, index + 1)}
            first={index === 0}
            last={index === items.fields.length - 1}
          />
        ))}
      </div>
      <ActionFooter pending={pending} state={state} label="Schedule workout" />
    </form>
  );
}

function ExerciseEditor({
  index,
  form,
  exercises,
  canRemove,
  onRemove,
  onUp,
  onDown,
  first,
  last,
}: {
  index: number;
  form: ReturnType<typeof useForm<WorkoutValues>>;
  exercises: { id: string; name: string; scope: string }[];
  canRemove: boolean;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
  first: boolean;
  last: boolean;
}) {
  const sets = useFieldArray({
    control: form.control,
    name: `exercises.${index}.sets`,
  });
  const [search, setSearch] = useState("");
  const selectedId = useWatch({
    control: form.control,
    name: `exercises.${index}.exerciseId`,
  });
  const matches = exercises
    .filter((exercise) =>
      exercise.name.toLowerCase().includes(search.toLowerCase()),
    )
    .slice(0, 10);
  const addPreset = (count: number, reps: number) =>
    sets.replace(
      Array.from({ length: count }, () => ({
        repsMin: String(reps),
        repsMax: String(reps),
        weight: "",
        unit: "LB" as const,
        effort: "",
      })),
    );
  return (
    <fieldset className="space-y-3 rounded-xl border p-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search exercises"
            className="pl-9"
            aria-label={`Search exercise ${index + 1}`}
          />
        </div>
        <select
          aria-label={`Exercise ${index + 1}`}
          className="bg-background h-10 min-w-36 rounded-lg border px-3 text-sm"
          {...form.register(`exercises.${index}.exerciseId`)}
        >
          {matches.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name} {exercise.scope === "COACH" ? "(custom)" : ""}
            </option>
          ))}
          {!matches.some((item) => item.id === selectedId)
            ? exercises
                .filter((item) => item.id === selectedId)
                .map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))
            : null}
        </select>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Move exercise up"
          disabled={first}
          onClick={onUp}
        >
          <ArrowUp />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Move exercise down"
          disabled={last}
          onClick={onDown}
        >
          <ArrowDown />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="destructive"
          aria-label="Remove exercise"
          disabled={!canRemove}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>
      <Input
        placeholder="Exercise notes (optional)"
        aria-label={`Notes for exercise ${index + 1}`}
        maxLength={1000}
        {...form.register(`exercises.${index}.notes`)}
      />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5" aria-label="Set presets">
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
              variant="outline"
              onClick={() => addPreset(count!, reps!)}
            >
              {count}×{reps}
            </Button>
          ))}
        </div>
        <div className="text-muted-foreground hidden grid-cols-[2.5rem_1fr_1fr_1fr_1fr_2rem] gap-2 px-1 text-xs sm:grid">
          <span>Set</span>
          <span>Weight</span>
          <span>Min reps</span>
          <span>Max reps</span>
          <span>RPE/RIR</span>
          <span />
        </div>
        {sets.fields.map((set, setIndex) => (
          <div
            key={set.id}
            className="grid grid-cols-[2rem_1fr_1fr] items-center gap-2 sm:grid-cols-[2.5rem_1fr_1fr_1fr_1fr_2rem]"
          >
            <Label>{setIndex + 1}</Label>
            <Input
              aria-label={`Target weight for set ${setIndex + 1}`}
              inputMode="decimal"
              type="number"
              min={0}
              step="0.5"
              placeholder="BW"
              {...form.register(`exercises.${index}.sets.${setIndex}.weight`)}
            />
            <Input
              aria-label={`Minimum reps for set ${setIndex + 1}`}
              type="number"
              min={1}
              max={1000}
              required
              {...form.register(`exercises.${index}.sets.${setIndex}.repsMin`)}
            />
            <Input
              aria-label={`Maximum reps for set ${setIndex + 1}`}
              type="number"
              min={1}
              max={1000}
              required
              {...form.register(`exercises.${index}.sets.${setIndex}.repsMax`)}
            />
            <Input
              aria-label={`RPE or RIR for set ${setIndex + 1}`}
              type="number"
              min={0}
              max={10}
              step="0.5"
              placeholder="—"
              {...form.register(`exercises.${index}.sets.${setIndex}.effort`)}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Remove assigned set"
              disabled={sets.fields.length === 1}
              onClick={() => sets.remove(setIndex)}
              className="col-start-3 sm:col-auto"
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              sets.append({
                repsMin: "8",
                repsMax: "8",
                weight: "",
                unit: "LB",
                effort: "",
              })
            }
          >
            <Plus /> Add set
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const previous = form.getValues(`exercises.${index}.sets`).at(-1);
              if (previous) sets.append({ ...previous });
            }}
          >
            <Copy /> Duplicate previous
          </Button>
        </div>
      </div>
    </fieldset>
  );
}

type MealValues = {
  name: string;
  description: string;
  scheduledAt: string;
  expectedCalories: string;
  expectedProteinGrams: string;
  expectedCarbGrams: string;
  expectedFatGrams: string;
  ingredients: { name: string; amount: string }[];
};

export function MealBuilder({
  action,
  defaultScheduledAt = "",
}: {
  action: ScheduleAction;
  defaultScheduledAt?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, initialActionState);
  const form = useForm<MealValues>({
    defaultValues: {
      name: "",
      description: "",
      scheduledAt: defaultScheduledAt,
      expectedCalories: "",
      expectedProteinGrams: "",
      expectedCarbGrams: "",
      expectedFatGrams: "",
      ingredients: [],
    },
  });
  const ingredients = useFieldArray({
    control: form.control,
    name: "ingredients",
  });
  const macros = useWatch({
    control: form.control,
    name: ["expectedProteinGrams", "expectedCarbGrams", "expectedFatGrams"],
  });
  const calculated = macros.some(Boolean)
    ? (Number(macros[0]) || 0) * 4 +
      (Number(macros[1]) || 0) * 4 +
      (Number(macros[2]) || 0) * 9
    : null;
  const submit = form.handleSubmit((values) => {
    const data = new FormData();
    data.set(
      "payload",
      JSON.stringify({
        ...values,
        description: values.description || undefined,
        ingredients: values.ingredients.filter((item) => item.name.trim()),
      }),
    );
    startTransition(() => dispatch(data));
  });
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Meal name">
        <Input {...form.register("name")} required maxLength={120} />
      </Field>
      <Field label="Client-local date and time">
        <Input
          type="datetime-local"
          {...form.register("scheduledAt")}
          required
        />
      </Field>
      <Field label="Description">
        <Textarea {...form.register("description")} maxLength={2000} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Manual calories">
          <Input
            type="number"
            min={0}
            max={20000}
            {...form.register("expectedCalories")}
          />
        </Field>
        <div className="rounded-lg border p-3 text-sm">
          <p className="text-muted-foreground">Calculated from macros</p>
          <p className="font-semibold">
            {calculated === null ? "Not provided" : `${calculated} kcal`}
          </p>
          <p className="text-muted-foreground text-xs">
            Manual calories take precedence.
          </p>
        </div>
        {[
          ["expectedProteinGrams", "Protein (g)"],
          ["expectedCarbGrams", "Carbohydrates (g)"],
          ["expectedFatGrams", "Fat (g)"],
        ].map(([name, label]) => (
          <Field key={name} label={label}>
            <Input
              type="number"
              min={0}
              {...form.register(name as keyof MealValues)}
            />
          </Field>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Ingredients</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => ingredients.append({ name: "", amount: "" })}
          >
            <Plus /> Add ingredient
          </Button>
        </div>
        {ingredients.fields.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Ingredients are optional.
          </p>
        ) : null}
        {ingredients.fields.map((ingredient, index) => (
          <div key={ingredient.id} className="flex gap-2">
            <Input
              placeholder="Ingredient"
              aria-label={`Ingredient ${index + 1}`}
              {...form.register(`ingredients.${index}.name`)}
            />
            <Input
              placeholder="Amount"
              aria-label={`Amount for ingredient ${index + 1}`}
              {...form.register(`ingredients.${index}.amount`)}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Remove ingredient"
              onClick={() => ingredients.remove(index)}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
      <ActionFooter pending={pending} state={state} label="Schedule meal" />
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function ActionFooter({
  pending,
  state,
  label,
}: {
  pending: boolean;
  state: ActionState;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : label}
      </Button>
      {state.message ? (
        <p
          className={
            state.ok ? "text-sm text-emerald-700" : "text-destructive text-sm"
          }
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
