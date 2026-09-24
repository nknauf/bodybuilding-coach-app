"use client";

import { useCallback, useState } from "react";
import { CalendarPlus, Dumbbell, Plus, Salad, Sparkles } from "lucide-react";
import type { ActionState } from "@/app/actions/state";
import {
  WorkoutBuilder,
  MealBuilder,
  type WorkoutValues,
  type MealValues,
} from "@/components/coach-schedule-forms";
import { MutationForm } from "@/components/mutation-form";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;
type Kind = "workout" | "meal" | "supplement";
type Event = {
  id: string;
  kind: Kind;
  name: string;
  at: string;
  status: string;
  detail?: string;
  exerciseCount?: number;
  workout?: WorkoutValues;
  meal?: MealValues;
  supplement?: {
    name: string;
    dosageText: string;
    scheduledAt: string;
    coachNotes: string;
  };
  updateAction: Action;
};

export function CoachClientWorkspace({
  events,
  days,
  timezone,
  exercises,
  actions,
}: {
  events: Event[];
  days: { key: string; weekday: string; date: string; inputDate: string }[];
  timezone: string;
  exercises: { id: string; name: string; scope: string }[];
  actions: {
    workout: Action;
    meal: Action;
    supplement: Action;
    exercise: Action;
  };
}) {
  const [drawer, setDrawer] = useState<{
    kind: Kind;
    event?: Event;
    date?: string;
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const [creationDirty, setCreationDirty] = useState(false);
  const openCreate = (kind: Kind, date?: string) => {
    setCreationDirty(false);
    setEditing(true);
    setDrawer({ kind, date });
  };
  const defaultAt = drawer?.date ? `${drawer.date}T12:00` : "";
  const creationKind = editing && !drawer?.event ? drawer?.kind : null;
  const closeCreation = useCallback(() => {
    if (
      creationDirty &&
      creationKind &&
      !window.confirm(`Discard this unsaved ${creationKind}?`)
    )
      return;
    setDrawer(null);
    setEditing(false);
    setCreationDirty(false);
  }, [creationDirty, creationKind]);
  const creationSaved = useCallback(() => {
    setDrawer(null);
    setEditing(false);
    setCreationDirty(false);
  }, []);
  const closeEdit = () => {
    if (
      creationDirty &&
      drawer?.event &&
      !window.confirm(`Discard this unsaved ${drawer.kind}?`)
    )
      return;
    setDrawer(null);
    setEditing(false);
    setCreationDirty(false);
  };
  return (
    <>
      <section aria-labelledby="weekly-plan" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-sm">Schedule</p>
            <h2 id="weekly-plan" className="text-xl font-semibold">
              This week
            </h2>
          </div>
          <p className="text-muted-foreground text-xs">{timezone}</p>
        </div>
        <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-7 md:overflow-visible md:px-0">
          {days.map((day) => {
            const dayEvents = events.filter((event) =>
              event.at.startsWith(day.key),
            );
            return (
              <div
                key={day.key}
                className="bg-card min-h-40 w-[10rem] shrink-0 snap-start rounded-lg border p-2 md:w-auto"
              >
                <button
                  className="hover:bg-muted flex w-full items-center justify-between rounded-md p-1 text-left"
                  onClick={() => openCreate("workout", day.inputDate)}
                  aria-label={`Add to ${day.weekday} ${day.date}`}
                >
                  <span>
                    <span className="text-muted-foreground block text-xs uppercase">
                      {day.weekday}
                    </span>
                    <span className="font-semibold">{day.date}</span>
                  </span>
                  <Plus className="size-4" />
                </button>
                <div className="mt-2 space-y-1.5">
                  {dayEvents.length ? (
                    dayEvents.map((event) => (
                      <button
                        key={`${event.kind}-${event.id}`}
                        onClick={() => {
                          setEditing(false);
                          setCreationDirty(false);
                          setDrawer({ kind: event.kind, event });
                        }}
                        className={`w-full rounded-md border px-2 py-2 text-left text-xs ${event.kind === "workout" ? "border-blue-200 bg-blue-50" : event.kind === "meal" ? "border-emerald-200 bg-emerald-50" : "border-violet-200 bg-violet-50"}`}
                      >
                        <span className="block truncate font-medium">
                          {event.name}
                        </span>
                        <span className="text-muted-foreground flex items-center justify-between">
                          <time>{event.at.slice(11)}</time>
                          {event.status === "COMPLETED"
                            ? "✓"
                            : event.status === "OVERDUE" ||
                                event.status === "MISSED"
                              ? "!"
                              : ""}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="text-muted-foreground px-1 py-3 text-xs">
                      Nothing scheduled
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section aria-labelledby="quick-add">
        <h2 id="quick-add" className="mb-2 text-sm font-semibold">
          Quick add
        </h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <Quick
            icon={Dumbbell}
            title="Workout"
            detail="Schedule training"
            onClick={() => openCreate("workout")}
          />
          <Quick
            icon={Salad}
            title="Meal"
            detail="Assign nutrition"
            onClick={() => openCreate("meal")}
          />
          <Quick
            icon={Sparkles}
            title="Supplement"
            detail="Add protocol"
            onClick={() => openCreate("supplement")}
          />
        </div>
      </section>
      <Dialog
        open={Boolean(creationKind)}
        disablePointerDismissal
        onOpenChange={(open) => {
          if (!open) closeCreation();
        }}
      >
        <DialogContent
          className={`flex max-h-[90vh] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 ${creationKind === "workout" ? "h-[min(90vh,900px)] max-w-[1050px] sm:max-w-[1050px]" : creationKind === "meal" ? "max-w-[850px] sm:max-w-[850px]" : "max-w-[560px] sm:max-w-[560px]"}`}
          showCloseButton={false}
          overlayClassName="bg-black/40"
        >
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-lg">
                Create {creationKind ?? "item"}
              </DialogTitle>
              <DialogClose
                render={<Button type="button" variant="ghost" size="sm" />}
              >
                Close
              </DialogClose>
            </div>
            <DialogDescription>
              Times use the client&apos;s {timezone} timezone.
            </DialogDescription>
          </DialogHeader>
          <div
            className={`min-h-0 overflow-y-auto px-4 py-5 sm:px-6 ${creationKind === "workout" ? "flex-1" : "flex-auto"}`}
          >
            {creationKind === "workout" ? (
              <WorkoutBuilder
                action={actions.workout}
                createExerciseAction={actions.exercise}
                exercises={exercises}
                defaultScheduledAt={defaultAt}
                onDirtyChange={setCreationDirty}
                onCreated={creationSaved}
              />
            ) : creationKind === "meal" ? (
              <MealBuilder
                action={actions.meal}
                defaultScheduledAt={defaultAt}
                onDirtyChange={setCreationDirty}
                onCreated={creationSaved}
              />
            ) : creationKind === "supplement" ? (
              <SupplementForm
                action={actions.supplement}
                defaultScheduledAt={defaultAt}
                onDirtyChange={setCreationDirty}
                onCreated={creationSaved}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      <Sheet
        open={Boolean(drawer) && !creationKind}
        onOpenChange={(open) => {
          if (!open) {
            closeEdit();
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>
              {drawer?.event && !editing
                ? drawer.event.name
                : `${drawer?.event ? "Edit" : "Add"} ${drawer?.kind ?? "item"}`}
            </SheetTitle>
            <SheetDescription>
              {drawer?.event && !editing
                ? "Scheduled item details"
                : `Times use the client's ${timezone} timezone.`}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-8">
            {drawer?.event && !editing ? (
              <div className="space-y-5">
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-xs uppercase">
                    {drawer.event.kind}
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {drawer.event.name}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {drawer.event.at.replace("T", " · ")} ·{" "}
                    {drawer.event.detail}
                  </p>
                  <div className="mt-3">
                    <StatusBadge status={drawer.event.status} />
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setCreationDirty(false);
                    setEditing(true);
                  }}
                >
                  Edit
                </Button>
                <p className="text-muted-foreground text-xs">
                  Existing safe rescheduling rules remain enforced. Editing
                  scheduled content is intentionally separate from viewing.
                </p>
              </div>
            ) : drawer?.kind === "workout" && drawer.event?.workout ? (
              <WorkoutBuilder
                key={drawer.event.id}
                mode="edit"
                action={drawer.event.updateAction}
                createExerciseAction={actions.exercise}
                exercises={exercises}
                initialValues={drawer.event.workout}
                onDirtyChange={setCreationDirty}
                onCreated={creationSaved}
              />
            ) : drawer?.kind === "meal" && drawer.event?.meal ? (
              <MealBuilder
                key={drawer.event.id}
                mode="edit"
                action={drawer.event.updateAction}
                initialValues={drawer.event.meal}
                onDirtyChange={setCreationDirty}
                onCreated={creationSaved}
              />
            ) : drawer?.kind === "supplement" && drawer.event?.supplement ? (
              <SupplementForm
                key={drawer.event.id}
                mode="edit"
                action={drawer.event.updateAction}
                defaultScheduledAt={drawer.event.supplement.scheduledAt}
                initialValues={drawer.event.supplement}
                onDirtyChange={setCreationDirty}
                onCreated={creationSaved}
              />
            ) : null}
            {drawer?.event && editing ? (
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={closeEdit}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function SupplementForm({
  action,
  mode = "create",
  initialValues,
  defaultScheduledAt,
  onDirtyChange,
  onCreated,
}: {
  action: Action;
  mode?: "create" | "edit";
  initialValues?: {
    name: string;
    dosageText: string;
    scheduledAt: string;
    coachNotes: string;
  };
  defaultScheduledAt: string;
  onDirtyChange?: (dirty: boolean) => void;
  onCreated?: () => void;
}) {
  return (
    <MutationForm
      action={action}
      submitLabel={mode === "edit" ? "Save supplement" : "Schedule supplement"}
      className="space-y-4"
      onDirtyChange={onDirtyChange}
      onSuccess={onCreated}
    >
      <div className="space-y-1.5">
        <Label htmlFor="supplement-name">Supplement name</Label>
        <Input
          id="supplement-name"
          name="name"
          defaultValue={initialValues?.name}
          maxLength={120}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="supplement-dosage">Assigned dosage</Label>
        <Input
          id="supplement-dosage"
          name="dosageText"
          defaultValue={initialValues?.dosageText}
          maxLength={200}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="supplement-scheduled-at">
          Client-local date and time
        </Label>
        <Input
          id="supplement-scheduled-at"
          name="scheduledAt"
          type="datetime-local"
          defaultValue={initialValues?.scheduledAt ?? defaultScheduledAt}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="supplement-notes">Coach notes</Label>
        <Textarea
          id="supplement-notes"
          name="coachNotes"
          defaultValue={initialValues?.coachNotes}
          maxLength={1000}
        />
      </div>
    </MutationForm>
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
      className="hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3 text-left"
    >
      <span className="bg-muted grid size-9 place-items-center rounded-md">
        <Icon className="size-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="text-muted-foreground text-xs">{detail}</span>
      </span>
    </button>
  );
}
