"use client";

import Link from "next/link";
import { addDays, format, startOfWeek } from "date-fns";
import { Check, Dumbbell, Salad, Sparkles } from "lucide-react";
import { useState } from "react";
import { useDemo } from "@/demo/demo-provider";
import { WeightChart } from "@/components/weight-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ClientDemo() {
  const { state, dispatch } = useDemo();
  const clientId = state.primaryClientId;
  const today = format(new Date(), "yyyy-MM-dd");
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const workouts = state.workouts.filter((x) => x.clientId === clientId);
  const meals = state.meals.filter((x) => x.clientId === clientId);
  const supplements = state.supplements.filter((x) => x.clientId === clientId);
  const todayWorkouts = workouts.filter((x) => x.scheduledAt.startsWith(today));
  const todayMeals = meals.filter((x) => x.scheduledAt.startsWith(today));
  const todaySupplements = supplements.filter((x) =>
    x.scheduledAt.startsWith(today),
  );
  const weights = state.bodyweights.filter((x) => x.clientId === clientId);
  const completeMeal = (id: string, name: string) => {
    const now = new Date().toISOString();
    dispatch({ type: "COMPLETE_MEAL", mealId: id, at: now });
    dispatch({
      type: "ADD_ACTIVITY",
      activity: {
        id: crypto.randomUUID(),
        clientId,
        label: `Ate ${name} as planned`,
        at: now,
      },
    });
  };
  return (
    <div className="space-y-8">
      <header>
        <p className="text-muted-foreground text-sm">
          {format(new Date(), "EEEE, MMMM d")}
        </p>
        <h1 className="text-3xl font-semibold">Today</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Everything below is safe to try. Your changes stay in this tab.
        </p>
      </header>
      <div className="flex flex-col gap-6">
        <section id="calendar" className="order-2">
          <h2 className="mb-3 text-xl font-semibold">This week</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 lg:grid lg:grid-cols-7">
            {Array.from({ length: 7 }, (_, i) => addDays(monday, i)).map(
              (day) => {
                const key = format(day, "yyyy-MM-dd");
                const count =
                  workouts.filter((x) => x.scheduledAt.startsWith(key)).length +
                  meals.filter((x) => x.scheduledAt.startsWith(key)).length +
                  supplements.filter((x) => x.scheduledAt.startsWith(key))
                    .length;
                return (
                  <div
                    key={key}
                    className={`${key === today ? "border-zinc-900 bg-white" : "bg-white"} min-w-20 rounded-lg border p-3 text-center`}
                  >
                    <span className="text-muted-foreground block text-xs uppercase">
                      {format(day, "EEE")}
                    </span>
                    <strong className="block text-lg">
                      {format(day, "d")}
                    </strong>
                    <span className="text-muted-foreground text-xs">
                      {count} items
                    </span>
                  </div>
                );
              },
            )}
          </div>
        </section>
        <section className="order-1">
          <h2 className="mb-3 text-xl font-semibold">Today&apos;s actions</h2>
          <div className="space-y-3">
            {todayWorkouts.map((workout) => (
              <Card key={workout.id} className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Dumbbell className="mt-1 size-5 text-blue-700" />
                    <div className="flex-1">
                      <strong className="text-lg">{workout.name}</strong>
                      <p className="text-muted-foreground text-sm">
                        {format(new Date(workout.scheduledAt), "p")} ·{" "}
                        {workout.exercises.length} exercises
                      </p>
                    </div>
                  </div>
                  <Button
                    className="mt-4 w-full"
                    render={
                      <Link href={`/demo/client/workouts/${workout.id}`} />
                    }
                  >
                    {workout.status === "COMPLETED"
                      ? "Review workout"
                      : "Start workout"}
                  </Button>
                </CardContent>
              </Card>
            ))}
            {todayMeals.map((meal) => (
              <Card key={meal.id} className="border-emerald-200 bg-emerald-50">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Salad className="mt-1 size-5 text-emerald-700" />
                    <div className="flex-1">
                      <strong>{meal.name}</strong>
                      <p className="text-muted-foreground text-sm">
                        {meal.calories} kcal · {meal.protein}g protein
                      </p>
                    </div>
                    {meal.completedAt ? (
                      <Check className="text-emerald-700" />
                    ) : null}
                  </div>
                  {!meal.completedAt ? (
                    <>
                      <Button
                        className="mt-4 w-full"
                        onClick={() => completeMeal(meal.id, meal.name)}
                      >
                        Ate as planned
                      </Button>
                      <MealActuals mealId={meal.id} />
                    </>
                  ) : null}
                </CardContent>
              </Card>
            ))}
            <Card className="border-violet-200 bg-violet-50">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-3">
                  <Sparkles className="size-5 text-violet-700" />
                  <div>
                    <strong>Supplements</strong>
                    <p className="text-muted-foreground text-sm">
                      {todaySupplements.filter((x) => !x.completedAt).length}{" "}
                      remaining
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {todaySupplements.map((item) => (
                    <button
                      key={item.id}
                      disabled={Boolean(item.completedAt)}
                      onClick={() =>
                        dispatch({
                          type: "COMPLETE_SUPPLEMENT",
                          supplementId: item.id,
                          at: new Date().toISOString(),
                        })
                      }
                      className="flex w-full items-center gap-3 rounded-md border bg-white p-3 text-left text-sm disabled:opacity-60"
                    >
                      <span
                        className={`${item.completedAt ? "bg-zinc-900 text-white" : "border"} grid size-5 place-items-center rounded`}
                      >
                        {item.completedAt ? "✓" : ""}
                      </span>
                      <span>
                        <strong>{item.name}</strong> — {item.dosage}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
      <section id="progress" className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Bodyweight trend</CardTitle>
          </CardHeader>
          <CardContent>
            <WeightChart
              points={weights.map((x) => ({
                date: format(new Date(x.measuredAt), "MMM d"),
                value: x.value,
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Log bodyweight</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={(data) => {
                const value = Number(data.get("value"));
                if (!value) return;
                const at = new Date().toISOString();
                dispatch({
                  type: "LOG_BODYWEIGHT",
                  entry: {
                    id: crypto.randomUUID(),
                    clientId,
                    value,
                    unit: "LB",
                    measuredAt: at,
                  },
                });
                dispatch({
                  type: "ADD_ACTIVITY",
                  activity: {
                    id: crypto.randomUUID(),
                    clientId,
                    label: `Logged ${value} LB`,
                    at,
                  },
                });
              }}
              className="space-y-3"
            >
              <Input
                name="value"
                type="number"
                step="0.1"
                min="1"
                placeholder="Weight in lb"
                required
              />
              <Button className="w-full">Log weight</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MealActuals({ mealId }: { mealId: string }) {
  const { dispatch } = useDemo();
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <Button
        variant="ghost"
        size="sm"
        className="mt-1 w-full"
        onClick={() => setOpen(true)}
      >
        Log something different
      </Button>
    );
  return (
    <form
      action={(data) =>
        dispatch({
          type: "COMPLETE_MEAL",
          mealId,
          at: new Date().toISOString(),
          actuals: {
            calories: Number(data.get("calories")) || undefined,
            protein: Number(data.get("protein")) || undefined,
          },
        })
      }
      className="mt-3 grid grid-cols-2 gap-2"
    >
      <Input name="calories" type="number" placeholder="Calories" />
      <Input name="protein" type="number" placeholder="Protein" />
      <Button className="col-span-2" variant="outline">
        Save actuals
      </Button>
    </form>
  );
}
