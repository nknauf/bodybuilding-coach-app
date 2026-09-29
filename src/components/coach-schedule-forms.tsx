"use client";

import {
  Fragment,
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { ChevronDown, Plus, Search } from "lucide-react";
import type { ActionState } from "@/app/actions/state";
import { initialActionState } from "@/app/actions/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  BuilderFooter,
  ScheduleControls,
  OptionalDetails,
  ItemMenu,
  SortHandle,
  RepRangeInput,
  PresetMenu,
  builderFormClass,
  builderBodyClass,
} from "@/components/builder-ui";
import { duplicateExercise, parseRepRange } from "@/lib/builder-values";
import { rankExercises } from "@/lib/exercise-search";

type ScheduleAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

type ExerciseOption = {
  id: string;
  name: string;
  scope: string;
  muscleGroup?: string;
  equipment?: string;
  category?: string;
};

export type WorkoutValues = {
  name: string;
  scheduledAt: string;
  notes: string;
  exercises: {
    id?: string;
    exerciseId: string;
    exerciseName?: string;
    notes: string;
    sets: {
      id?: string;
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
  mode = "create",
  initialValues,
  createExerciseAction,
  exercises,
  defaultScheduledAt = "",
  onDirtyChange,
  onCreated,
  onCancel,
}: {
  action: ScheduleAction;
  mode?: "create" | "edit";
  initialValues?: WorkoutValues;
  createExerciseAction: ScheduleAction;
  exercises: ExerciseOption[];
  defaultScheduledAt?: string;
  onDirtyChange?: (dirty: boolean) => void;
  onCreated?: () => void;
  onCancel?: () => void;
}) {
  const [state, dispatch, pending] = useActionState(action, initialActionState);
  const [exerciseCatalog, setExerciseCatalog] = useState(exercises);
  const form = useForm<WorkoutValues>({
    defaultValues: initialValues ?? {
      name: "",
      scheduledAt: defaultScheduledAt,
      notes: "",
      exercises: [],
    },
  });
  const builderRef = useRef<HTMLFormElement>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [emptyError, setEmptyError] = useState(false);
  const items = useFieldArray({
    control: form.control,
    name: "exercises",
    keyName: "fieldKey",
  });
  const scheduledAt = useWatch({ control: form.control, name: "scheduledAt" });
  const { isDirty } = form.formState;
  const { reset } = form;
  useEffect(() => {
    if (initialValues && !isDirty) reset(initialValues);
  }, [initialValues, isDirty, reset]);
  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);
  useEffect(() => {
    if (state.ok) onCreated?.();
  }, [state.ok, onCreated]);

  const submit = form.handleSubmit(
    (values) => {
      if (!values.exercises.length) {
        setEmptyError(true);
        return;
      }
      const invalidIndex = values.exercises.findIndex((exercise) =>
        exercise.sets.some(
          (set) => !parseRepRange(`${set.repsMin}-${set.repsMax}`),
        ),
      );
      if (invalidIndex >= 0) {
        setExpandedKey(items.fields[invalidIndex].fieldKey);
        form.setError(`exercises.${invalidIndex}.sets`, {
          message: "Enter valid reps for every set (for example, 8–10).",
        });
        return;
      }
      const data = new FormData();
      data.set(
        "payload",
        JSON.stringify({
          ...values,
          notes: values.notes || undefined,
          exercises: values.exercises.map((exercise) => ({
            id: exercise.id,
            exerciseId: exercise.exerciseId,
            notes: exercise.notes || undefined,
            sets: exercise.sets.map((set) => ({
              id: set.id,
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
    },
    (errors) => {
      const index = errors.exercises?.findIndex?.((error) => Boolean(error));
      if (index !== undefined && index >= 0)
        setExpandedKey(items.fields[index]?.fieldKey ?? null);
    },
  );

  return (
    <form ref={builderRef} onSubmit={submit} className={builderFormClass}>
      <div
        className={builderBodyClass}
        data-builder-scroll
        onInvalidCapture={(event) => {
          const card = (event.target as HTMLElement).closest<HTMLElement>(
            "[data-exercise-key]",
          );
          if (card) setExpandedKey(card.dataset.exerciseKey ?? null);
        }}
      >
        {!state.ok && state.message ? (
          <p className="text-destructive text-sm" role="alert">
            {state.message}
          </p>
        ) : null}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Workout information</h3>
          <Field label="Workout name">
            <Input
              {...form.register("name")}
              required
              maxLength={120}
              className="sm:max-w-xs"
            />
          </Field>
        </section>
        <ScheduleControls
          value={scheduledAt}
          onChange={(value) =>
            form.setValue("scheduledAt", value, { shouldDirty: true })
          }
        />
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">
            Exercises{" "}
            <span className="text-muted-foreground font-normal">
              ({items.fields.length})
            </span>
          </h3>
          {emptyError && !items.fields.length && (
            <p role="alert" className="text-destructive text-sm">
              Add at least one exercise.
            </p>
          )}
          {items.fields.map((item, index) => (
            <ExerciseEditor
              key={item.fieldKey}
              index={index}
              itemKey={item.fieldKey}
              expanded={expandedKey === item.fieldKey}
              onToggle={() =>
                setExpandedKey(
                  expandedKey === item.fieldKey ? null : item.fieldKey,
                )
              }
              recentIds={recentIds}
              onSelect={(id) =>
                setRecentIds((current) =>
                  [id, ...current.filter((item) => item !== id)].slice(0, 5),
                )
              }
              onMove={items.move}
              onDuplicate={() => {
                items.insert(
                  index + 1,
                  duplicateExercise(form.getValues(`exercises.${index}`)),
                  { shouldFocus: false },
                );
                setExpandedKey(null);
                requestAnimationFrame(() => {
                  const cards =
                    builderRef.current?.querySelectorAll<HTMLElement>(
                      "[data-exercise-key]",
                    );
                  setExpandedKey(
                    cards?.[index + 1]?.dataset.exerciseKey ?? null,
                  );
                });
              }}
              form={form}
              exercises={exerciseCatalog}
              createExerciseAction={createExerciseAction}
              onExerciseCreated={(exercise) =>
                setExerciseCatalog((current) =>
                  current.some((item) => item.id === exercise.id)
                    ? current
                    : [...current, exercise].sort((a, b) =>
                        a.name.localeCompare(b.name),
                      ),
                )
              }
              canRemove={true}
              onRemove={() => items.remove(index)}
              onUp={() => items.move(index, index - 1)}
              onDown={() => items.move(index, index + 1)}
              first={index === 0}
              last={index === items.fields.length - 1}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              items.append(
                {
                  exerciseId: "",
                  notes: "",
                  sets: Array.from({ length: 3 }, () => ({
                    repsMin: "8",
                    repsMax: "8",
                    weight: "",
                    unit: "LB" as const,
                    effort: "",
                  })),
                },
                { shouldFocus: false },
              );
              requestAnimationFrame(() => {
                const cards = builderRef.current?.querySelectorAll<HTMLElement>(
                  "[data-exercise-key]",
                );
                setExpandedKey(
                  cards?.[cards.length - 1]?.dataset.exerciseKey ?? null,
                );
              });
            }}
          >
            <Plus /> Add exercise
          </Button>
        </div>
        <OptionalDetails label="Workout notes (optional)">
          <Field label="Workout notes">
            <Textarea {...form.register("notes")} maxLength={2000} />
          </Field>
        </OptionalDetails>
      </div>
      <ActionFooter
        onCancel={onCancel}
        pending={pending}
        state={state}
        label={mode === "edit" ? "Save workout" : "Create workout"}
      />
    </form>
  );
}

function ExerciseEditor({
  index,
  itemKey,
  expanded,
  onToggle,
  recentIds,
  onSelect,
  onMove,
  onDuplicate,
  form,
  exercises,
  createExerciseAction,
  onExerciseCreated,
  canRemove,
  onRemove,
  onUp,
  onDown,
  first,
  last,
}: {
  index: number;
  itemKey: string;
  expanded: boolean;
  onToggle: () => void;
  recentIds: string[];
  onSelect: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onDuplicate: () => void;
  form: ReturnType<typeof useForm<WorkoutValues>>;
  exercises: ExerciseOption[];
  createExerciseAction: ScheduleAction;
  onExerciseCreated: (exercise: ExerciseOption) => void;
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
    keyName: "fieldKey",
  });
  const selectedExercise = form.getValues(`exercises.${index}`);
  const [search, setSearch] = useState(
    selectedExercise.exerciseName ??
      exercises.find((item) => item.id === selectedExercise.exerciseId)?.name ??
      "",
  );
  const [creating, setCreating] = useState(false);
  const [creatorName, setCreatorName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("CHEST");
  const [equipment, setEquipment] = useState("BARBELL");
  const [category, setCategory] = useState("COMPOUND");
  const [createMessage, setCreateMessage] = useState("");
  const [createPending, startCreateTransition] = useTransition();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeMatch, setActiveMatch] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const closeCreator = () => {
    setCreating(false);
    requestAnimationFrame(() => searchRef.current?.focus());
  };
  const selectedId = useWatch({
    control: form.control,
    name: `exercises.${index}.exerciseId`,
  });
  const watched = useWatch({
    control: form.control,
    name: `exercises.${index}`,
  });
  const recent = recentIds
    .map((id) => exercises.find((exercise) => exercise.id === id))
    .filter((exercise): exercise is ExerciseOption => Boolean(exercise));
  const matches = search.trim()
    ? rankExercises(exercises, search)
    : [
        ...recent,
        ...exercises
          .filter((exercise) => !recentIds.includes(exercise.id))
          .sort((a, b) => a.name.localeCompare(b.name)),
      ].slice(0, 20);
  useEffect(() => {
    if (expanded) requestAnimationFrame(() => searchRef.current?.focus());
  }, [expanded]);
  const selectExercise = (exercise: ExerciseOption) => {
    form.setValue(`exercises.${index}.exerciseId`, exercise.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
    onSelect(exercise.id);
    setSearch(exercise.name);
    setSuggestionsOpen(false);
    searchRef.current?.focus();
  };
  const openCreator = () => {
    setCreatorName(search);
    setCreateMessage("");
    setSuggestionsOpen(false);
    setCreating(true);
  };
  const createExercise = () => {
    if (!creatorName.trim()) {
      setCreateMessage("Enter an exercise name.");
      return;
    }
    const data = new FormData();
    data.set("name", creatorName.trim());
    data.set("muscleGroup", muscleGroup);
    data.set("equipment", equipment);
    data.set("category", category);
    setCreateMessage("");
    startCreateTransition(async () => {
      const result = await createExerciseAction(initialActionState, data);
      setCreateMessage(result.message);
      if (!result.createdExercise) return;
      onExerciseCreated(result.createdExercise);
      selectExercise(result.createdExercise);
      closeCreator();
    });
  };
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
    <fieldset
      data-exercise-key={itemKey}
      data-sort-group="exercises"
      data-sort-index={index}
      className="rounded-xl border"
    >
      <div className="flex items-center gap-1 p-2">
        <SortHandle
          index={index}
          group="exercises"
          onMove={onMove}
          label={`exercise ${index + 1}`}
        />
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={`exercise-body-${itemKey}`}
          onClick={onToggle}
          className="min-w-0 flex-1 py-2 text-left"
        >
          <span className="block truncate text-sm font-semibold">
            {index + 1}.{" "}
            {watched?.exerciseId
              ? (exercises.find(
                  (exercise) => exercise.id === watched.exerciseId,
                )?.name ??
                watched.exerciseName ??
                "Exercise")
              : "Choose an exercise"}
          </span>
          <span className="text-muted-foreground block text-xs">
            {watched?.sets?.length ?? 0} sets ·{" "}
            {watched?.sets?.length &&
            watched.sets.every(
              (set) =>
                set.repsMin === watched.sets[0].repsMin &&
                set.repsMax === watched.sets[0].repsMax,
            )
              ? `${watched.sets[0].repsMin}${watched.sets[0].repsMax !== watched.sets[0].repsMin ? `–${watched.sets[0].repsMax}` : ""} reps`
              : "Varied sets"}
          </span>
        </button>
        <ChevronDown
          className={`text-muted-foreground size-4 ${expanded ? "rotate-180" : ""}`}
        />
        <ItemMenu
          label={`exercise ${index + 1}`}
          onUp={onUp}
          onDown={onDown}
          onRemove={onRemove}
          onDuplicate={onDuplicate}
          first={first}
          last={last}
          canRemove={canRemove}
        />
      </div>
      <div
        id={`exercise-body-${itemKey}`}
        hidden={!expanded}
        className="space-y-3 border-t p-3"
      >
        <div className="space-y-2">
          <div
            className="relative min-w-0 flex-1"
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setSuggestionsOpen(false);
            }}
          >
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor={`exercise-search-${index}`}
            >
              Exercise {index + 1}
            </label>
            <Search className="text-muted-foreground absolute top-9 left-3 size-4" />
            <Input
              ref={searchRef}
              id={`exercise-search-${index}`}
              value={search}
              onFocus={(event) => {
                setActiveMatch(0);
                setSuggestionsOpen(true);
                event.target.select();
              }}
              onChange={(event) => {
                setSearch(event.target.value);
                setActiveMatch(0);
                setSuggestionsOpen(true);
                if (selectedId)
                  form.setValue(`exercises.${index}.exerciseId`, "", {
                    shouldDirty: true,
                  });
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && suggestionsOpen) {
                  setSuggestionsOpen(false);
                  event.stopPropagation();
                } else if (event.key === "ArrowDown" && matches.length) {
                  event.preventDefault();
                  setSuggestionsOpen(true);
                  setActiveMatch((current) => (current + 1) % matches.length);
                } else if (event.key === "ArrowUp" && matches.length) {
                  event.preventDefault();
                  setActiveMatch(
                    (current) =>
                      (current - 1 + matches.length) % matches.length,
                  );
                } else if (
                  event.key === "Enter" &&
                  suggestionsOpen &&
                  matches.length
                ) {
                  event.preventDefault();
                  selectExercise(matches[activeMatch] ?? matches[0]);
                }
              }}
              placeholder="Type an exercise name"
              className="pl-9"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={suggestionsOpen}
              aria-controls={
                suggestionsOpen ? `exercise-results-${index}` : undefined
              }
              aria-activedescendant={
                suggestionsOpen && matches.length
                  ? `exercise-result-${index}-${Math.min(activeMatch, matches.length - 1)}`
                  : undefined
              }
            />
            <input
              type="hidden"
              {...form.register(`exercises.${index}.exerciseId`, {
                required: "Select an exercise.",
              })}
            />
            {form.formState.errors.exercises?.[index]?.exerciseId ? (
              <p className="text-destructive mt-1 text-xs" role="alert">
                Select an exercise from the results.
              </p>
            ) : null}
            {suggestionsOpen ? (
              <div className="bg-popover absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border shadow-lg">
                <div id={`exercise-results-${index}`} role="listbox">
                  {matches.length ? (
                    matches.map((exercise, matchIndex) => (
                      <Fragment key={exercise.id}>
                        {!search.trim() &&
                          (matchIndex === 0 ||
                            matchIndex === recent.length) && (
                            <p
                              role="presentation"
                              className="text-muted-foreground px-3 py-2 text-xs"
                            >
                              {matchIndex === 0 && recent.length
                                ? "Recently selected"
                                : "Exercise library"}
                            </p>
                          )}
                        <button
                          id={`exercise-result-${index}-${matchIndex}`}
                          type="button"
                          role="option"
                          tabIndex={-1}
                          aria-selected={matchIndex === activeMatch}
                          className={`hover:bg-muted focus-visible:bg-muted focus-visible:outline-ring block w-full px-3 py-2 text-left focus-visible:outline-2 ${matchIndex === activeMatch ? "bg-muted" : ""}`}
                          onPointerDown={(event) => event.preventDefault()}
                          onClick={() => selectExercise(exercise)}
                        >
                          <span className="block text-sm font-medium">
                            {exercise.name}
                          </span>
                          <span className="text-muted-foreground block text-xs">
                            {[
                              exercise.muscleGroup,
                              exercise.equipment?.replaceAll("_", " "),
                              exercise.category?.toLowerCase(),
                            ]
                              .filter(Boolean)
                              .join(" · ") ||
                              (exercise.scope === "COACH"
                                ? "Custom exercise"
                                : "Library exercise")}
                          </span>
                        </button>
                      </Fragment>
                    ))
                  ) : (
                    <p className="text-muted-foreground px-3 py-2 text-sm">
                      No matches found.
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start rounded-none border-t"
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={openCreator}
                >
                  <Plus /> Create custom exercise
                </Button>
              </div>
            ) : null}
          </div>
        </div>
        <Sheet
          open={creating}
          onOpenChange={(open) => {
            if (!open && !createPending) closeCreator();
          }}
          disablePointerDismissal
        >
          <SheetContent
            className="z-[60] w-full overflow-y-auto sm:max-w-md"
            showCloseButton={false}
          >
            <SheetHeader>
              <SheetTitle>Create exercise</SheetTitle>
              <SheetDescription>
                Add a custom exercise to your catalog and select it for this
                workout.
              </SheetDescription>
            </SheetHeader>
            <form
              className="space-y-4 px-4 pb-8"
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                createExercise();
              }}
            >
              <Field label="Name">
                <Input
                  autoFocus
                  value={creatorName}
                  onChange={(event) => setCreatorName(event.target.value)}
                  maxLength={120}
                  required
                />
              </Field>
              {createMessage ? (
                <p className="text-destructive text-sm" role="alert">
                  {createMessage}
                </p>
              ) : null}
              <Field label="Muscle group">
                <select
                  className="bg-background h-10 w-full rounded-lg border px-3 text-sm"
                  value={muscleGroup}
                  onChange={(event) => setMuscleGroup(event.target.value)}
                >
                  {["CHEST", "BACK", "SHOULDERS", "LEGS", "ARMS", "CORE"].map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Equipment">
                <select
                  className="bg-background h-10 w-full rounded-lg border px-3 text-sm"
                  value={equipment}
                  onChange={(event) => setEquipment(event.target.value)}
                >
                  {[
                    "BARBELL",
                    "DUMBBELL",
                    "CABLE",
                    "BODYWEIGHT",
                    "PIN_LOADED_MACHINE",
                    "PLATE_LOADED_MACHINE",
                  ].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </Field>
              <Field label="Category">
                <select
                  className="bg-background h-10 w-full rounded-lg border px-3 text-sm"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {["COMPOUND", "ISOLATION", "CARDIO", "MOBILITY"].map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
              </Field>
              <div className="flex gap-2">
                <Button type="submit" disabled={createPending}>
                  {createPending ? "Creating..." : "Create and select"}
                </Button>
                <SheetClose
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      disabled={createPending}
                    />
                  }
                >
                  Cancel
                </SheetClose>
              </div>
            </form>
          </SheetContent>
        </Sheet>

        <div className="space-y-2">
          {form.formState.errors.exercises?.[index]?.sets?.message && (
            <p role="alert" className="text-destructive text-sm">
              {form.formState.errors.exercises[index]?.sets?.message}
            </p>
          )}
          <PresetMenu onSelect={addPreset} />
          <div className="text-muted-foreground grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-2 text-xs">
            <span>Set</span>
            <span>Weight ({watched?.sets?.[0]?.unit ?? "LB"})</span>
            <span>Reps</span>
            <span>RPE/RIR</span>
            <span />
          </div>
          {sets.fields.map((set, setIndex) => (
            <div
              key={set.fieldKey}
              data-sort-group={`sets-${itemKey}`}
              data-sort-index={setIndex}
              className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] items-center gap-2"
            >
              <SortHandle
                index={setIndex}
                group={`sets-${itemKey}`}
                onMove={sets.move}
                label={`set ${setIndex + 1}`}
                number={setIndex + 1}
              />
              <Input
                aria-label={`Target weight for set ${setIndex + 1}`}
                aria-description={`Weight in ${watched?.sets?.[setIndex]?.unit ?? "LB"}`}
                inputMode="decimal"
                type="number"
                min={0}
                step="0.01"
                placeholder="BW"
                {...form.register(`exercises.${index}.sets.${setIndex}.weight`)}
              />
              <RepRangeInput
                min={watched?.sets?.[setIndex]?.repsMin ?? ""}
                max={watched?.sets?.[setIndex]?.repsMax ?? ""}
                label={`Rep range for set ${setIndex + 1}`}
                onChange={(min, max) => {
                  if (min && max) form.clearErrors(`exercises.${index}.sets`);
                  form.setValue(
                    `exercises.${index}.sets.${setIndex}.repsMin`,
                    min,
                    { shouldDirty: true },
                  );
                  form.setValue(
                    `exercises.${index}.sets.${setIndex}.repsMax`,
                    max,
                    { shouldDirty: true },
                  );
                }}
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
              <ItemMenu
                label={`set ${setIndex + 1}`}
                first={setIndex === 0}
                last={setIndex === sets.fields.length - 1}
                canRemove={sets.fields.length > 1}
                onUp={() => sets.move(setIndex, setIndex - 1)}
                onDown={() => sets.move(setIndex, setIndex + 1)}
                onRemove={() => sets.remove(setIndex)}
                onDuplicate={() =>
                  sets.insert(setIndex + 1, {
                    ...form.getValues(`exercises.${index}.sets.${setIndex}`),
                    id: undefined,
                  })
                }
              />
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
          </div>
        </div>
        <OptionalDetails label="Exercise notes (optional)">
          <Input
            placeholder="Exercise notes"
            aria-label={`Notes for exercise ${index + 1}`}
            maxLength={1000}
            {...form.register(`exercises.${index}.notes`)}
          />
        </OptionalDetails>
      </div>
    </fieldset>
  );
}

export type MealValues = {
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
  mode = "create",
  initialValues,
  defaultScheduledAt = "",
  onDirtyChange,
  onCreated,
  onCancel,
}: {
  action: ScheduleAction;
  mode?: "create" | "edit";
  initialValues?: MealValues;
  defaultScheduledAt?: string;
  onDirtyChange?: (dirty: boolean) => void;
  onCreated?: () => void;
  onCancel?: () => void;
}) {
  const [state, dispatch, pending] = useActionState(action, initialActionState);
  const form = useForm<MealValues>({
    defaultValues: initialValues ?? {
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
  const scheduledAt = useWatch({ control: form.control, name: "scheduledAt" });
  const { isDirty } = form.formState;
  const { reset } = form;
  useEffect(() => {
    if (initialValues && !isDirty) reset(initialValues);
  }, [initialValues, isDirty, reset]);
  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);
  useEffect(() => {
    if (state.ok) onCreated?.();
  }, [state.ok, onCreated]);
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
    <form onSubmit={submit} className={builderFormClass}>
      <div className={builderBodyClass} data-builder-scroll>
        {!state.ok && state.message ? (
          <p className="text-destructive text-sm" role="alert">
            {state.message}
          </p>
        ) : null}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Meal information</h3>
          <Field label="Meal name">
            <Input
              {...form.register("name")}
              required
              maxLength={120}
              className="sm:max-w-xs"
            />
          </Field>
        </section>
        <ScheduleControls
          value={scheduledAt}
          onChange={(value) =>
            form.setValue("scheduledAt", value, { shouldDirty: true })
          }
        />
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Nutrition targets</h3>
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
        </section>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Ingredients</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                ingredients.append(
                  { name: "", amount: "" },
                  {
                    focusName: `ingredients.${ingredients.fields.length}.name`,
                  },
                )
              }
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
            <div
              key={ingredient.id}
              data-sort-group="ingredients"
              data-sort-index={index}
              className="flex items-center gap-2"
            >
              <SortHandle
                index={index}
                group="ingredients"
                onMove={ingredients.move}
                label={`ingredient ${index + 1}`}
              />
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
              <ItemMenu
                label={`ingredient ${index + 1}`}
                first={index === 0}
                last={index === ingredients.fields.length - 1}
                onUp={() => ingredients.move(index, index - 1)}
                onDown={() => ingredients.move(index, index + 1)}
                onRemove={() => ingredients.remove(index)}
                onDuplicate={() =>
                  ingredients.insert(index + 1, {
                    ...form.getValues(`ingredients.${index}`),
                  })
                }
              />
            </div>
          ))}
        </div>
        <OptionalDetails label="Description (optional)">
          <Field label="Description">
            <Textarea {...form.register("description")} maxLength={2000} />
          </Field>
        </OptionalDetails>
      </div>
      <ActionFooter
        onCancel={onCancel}
        pending={pending}
        state={state}
        label={mode === "edit" ? "Save meal" : "Create meal"}
      />
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function ActionFooter({
  pending,
  state,
  label,
  onCancel,
}: {
  onCancel?: () => void;
  pending: boolean;
  state: ActionState;
  label: string;
}) {
  return (
    <BuilderFooter onCancel={onCancel}>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : label}
      </Button>
      {state.ok && state.message ? (
        <p
          className={
            state.ok ? "text-sm text-emerald-700" : "text-destructive text-sm"
          }
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
    </BuilderFooter>
  );
}
