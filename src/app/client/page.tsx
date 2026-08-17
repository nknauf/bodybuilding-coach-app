import Link from "next/link";
import { addDays, eachDayOfInterval } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { requireActor } from "@/server/auth/current-user";
import {
  getClientReport,
  getCurrentWeekReport,
} from "@/server/services/reports";
import { localDayKey, startOfLocalDayUtc } from "@/server/domain/time";
import {
  completeMealAction,
  completeMealWithActualsAction,
  completeSupplementAction,
  logBodyweightAction,
  rescheduleEventAction,
} from "@/app/actions/client";
import { MutationForm } from "@/components/mutation-form";
import { StatusBadge } from "@/components/status-badge";
import { WeightChart } from "@/components/weight-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function ClientPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; weight?: string }>;
}) {
  const actor = await requireActor(["CLIENT"]);
  const query = await searchParams;
  const weightDays = [7, 30, 90, 365].includes(Number(query.weight))
    ? Number(query.weight)
    : 30;
  const report = await getCurrentWeekReport(
    actor,
    undefined,
    new Date(),
    weightDays,
  );
  const timezone = report.profile.user.timezone;
  const now = new Date();
  const period = ["day", "week", "30", "90"].includes(query.period ?? "")
    ? (query.period ?? "week")
    : "week";
  const complianceReport =
    period === "week"
      ? report
      : await getClientReport(actor, {
          start:
            period === "day"
              ? startOfLocalDayUtc(now, timezone)
              : addDays(now, -Number(period)),
          end: now,
          now,
          weightDays,
        });
  const calendarDays = eachDayOfInterval({
    start: report.range.start,
    end: addDays(report.range.start, 6),
  });
  const events = [
    ...report.workouts.map((event) => ({
      id: event.id,
      kind: "workout" as const,
      name: event.name,
      at: event.scheduledAt,
      status: event.effectiveStatus,
      href: `/client/workouts/${event.id}`,
      action: null,
      movedByClient: event.movedByClient,
    })),
    ...report.meals.map((event) => ({
      id: event.id,
      kind: "meal" as const,
      name: event.name,
      at: event.scheduledAt,
      status: event.effectiveStatus,
      href: null,
      action: completeMealAction.bind(null, event.id),
      movedByClient: event.movedByClient,
    })),
    ...report.supplements.map((event) => ({
      id: event.id,
      kind: "supplement" as const,
      name: `${event.name} · ${event.dosageText}`,
      at: event.scheduledAt,
      status: event.effectiveStatus,
      href: null,
      action: completeSupplementAction.bind(null, event.id),
      movedByClient: event.movedByClient,
    })),
  ];
  const eventsByDay = new Map<string, typeof events>();
  for (const event of events) {
    const key = localDayKey(event.at, timezone);
    eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), event]);
  }
  const todayKey = localDayKey(now, timezone);
  const todayEvents = eventsByDay.get(todayKey) ?? [];
  const chartPoints = report.weightTrend.points.map((point) => ({
    date: formatInTimeZone(point.measuredAt, timezone, "MMM d"),
    value: point.value,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">
            {formatInTimeZone(new Date(), timezone, "EEEE, MMMM d")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Daily", report.streaks.daily, "Applicable days without a miss"],
          ["Workout", report.streaks.workout, "Completed workouts in a row"],
          [
            "Overall",
            report.streaks.overall,
            "Days each assigned category hit 80%",
          ],
        ].map(([label, value, help]) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-muted-foreground text-xs">{label} streak</p>
              <p className="text-2xl font-semibold">{value} days</p>
              <p className="text-muted-foreground mt-1 text-xs">{help}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Today&apos;s plan</h2>
          <p className="text-muted-foreground text-xs">{timezone}</p>
        </div>
        {todayEvents.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center text-sm">
              Nothing assigned today.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {todayEvents.map((event) => (
              <EventCard
                key={`today-${event.kind}-${event.id}`}
                event={event}
                timezone={timezone}
                prominent
              />
            ))}
          </div>
        )}
      </section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="col-span-full flex flex-wrap gap-2">
          {[
            ["day", "Today"],
            ["week", "This week"],
            ["30", "30 days"],
            ["90", "90 days"],
          ].map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={period === value ? "default" : "outline"}
              render={
                <Link href={`/client?period=${value}&weight=${weightDays}`} />
              }
            >
              {label}
            </Button>
          ))}
        </div>
        {[
          ["Overall", complianceReport.compliancePercent.overall],
          ["Workout", complianceReport.compliancePercent.workout],
          ["Meals", complianceReport.compliancePercent.meal],
          ["Supplements", complianceReport.compliancePercent.supplement],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-3">
              <p className="text-muted-foreground text-sm">{label}</p>
              <CardTitle className="text-3xl">
                {value === null ? "—" : `${value}%`}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <section id="calendar" className="scroll-mt-24">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Monday–Sunday</h2>
          <p className="text-muted-foreground text-xs">{timezone}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-7">
          {calendarDays.map((day) => {
            const key = localDayKey(day, timezone);
            const dayEvents = eventsByDay.get(key) ?? [];
            return (
              <div key={key} className="bg-card min-h-40 rounded-xl border p-3">
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  {formatInTimeZone(day, timezone, "EEE")}
                </p>
                <p className="mb-3 text-lg font-semibold">
                  {formatInTimeZone(day, timezone, "d")}
                </p>
                <div className="space-y-2">
                  {dayEvents.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      Rest / unassigned
                    </p>
                  ) : (
                    dayEvents.map((event) => (
                      <EventCard
                        key={`${event.kind}-${event.id}`}
                        event={event}
                        timezone={timezone}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <div
        id="progress"
        className="grid scroll-mt-24 gap-6 lg:grid-cols-[1fr_22rem]"
      >
        <Card id="bodyweight" className="scroll-mt-24">
          <CardHeader>
            <CardTitle>Bodyweight trend</CardTitle>
            <p className="text-muted-foreground text-sm">
              Morning entry wins; otherwise the earliest entry in your local day
              is charted. Latest:{" "}
              {report.weightTrend.latest
                ? `${report.weightTrend.latest.value} ${report.weightTrend.latest.unit}`
                : "—"}
              {report.weightTrend.change !== null
                ? ` · Change ${report.weightTrend.change > 0 ? "+" : ""}${report.weightTrend.change.toFixed(1)}`
                : ""}
              {report.weightTrend.ratePerWeek !== null
                ? ` · ${report.weightTrend.ratePerWeek > 0 ? "+" : ""}${report.weightTrend.ratePerWeek.toFixed(2)}/week`
                : ""}
            </p>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-2">
              {[7, 30, 90, 365].map((days) => (
                <Button
                  key={days}
                  size="xs"
                  variant={weightDays === days ? "default" : "outline"}
                  render={
                    <Link href={`/client?period=${period}&weight=${days}`} />
                  }
                >
                  {days === 365 ? "1 year" : `${days} days`}
                </Button>
              ))}
            </div>
            <WeightChart points={chartPoints} />
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Log bodyweight</CardTitle>
          </CardHeader>
          <CardContent>
            <MutationForm
              action={logBodyweightAction}
              submitLabel="Log weight"
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="value">Weight</Label>
                <Input
                  id="value"
                  name="value"
                  type="number"
                  step="0.1"
                  min="1"
                  max="2000"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit">Unit</Label>
                <select
                  id="unit"
                  name="unit"
                  className="bg-background h-9 w-full rounded-lg border px-2 text-sm"
                >
                  <option>LB</option>
                  <option>KG</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="measuredAt">Measured at</Label>
                <Input
                  id="measuredAt"
                  name="measuredAt"
                  type="datetime-local"
                  defaultValue={formatInTimeZone(
                    new Date(),
                    timezone,
                    "yyyy-MM-dd'T'HH:mm",
                  )}
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isMorning" value="true" />
                Morning weight
              </label>
            </MutationForm>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EventCard({
  event,
  timezone,
  prominent = false,
}: {
  event: {
    id: string;
    kind: "workout" | "meal" | "supplement";
    name: string;
    at: Date;
    status: string;
    href: string | null;
    action: (() => Promise<void>) | null;
    movedByClient: boolean;
  };
  timezone: string;
  prominent?: boolean;
}) {
  const colors = {
    workout: "border-blue-200 bg-blue-50",
    meal: "border-emerald-200 bg-emerald-50",
    supplement: "border-violet-200 bg-violet-50",
  };
  const content = (
    <>
      <p
        className={`line-clamp-2 font-medium ${prominent ? "text-base" : "text-xs"}`}
      >
        {event.name}
      </p>
      <p
        className={`text-muted-foreground mt-1 ${prominent ? "text-sm" : "text-[11px]"}`}
      >
        {formatInTimeZone(event.at, timezone, "p")}
      </p>
      <div className="mt-2">
        <StatusBadge status={event.status} />
      </div>
    </>
  );
  return (
    <div
      className={`rounded-lg border ${prominent ? "p-4" : "p-2"} ${colors[event.kind]}`}
    >
      {event.href ? <Link href={event.href}>{content}</Link> : content}
      {event.href && prominent && event.status !== "COMPLETED" ? (
        <Button className="mt-3 w-full" render={<Link href={event.href} />}>
          Start workout
        </Button>
      ) : null}
      {event.action && event.status !== "COMPLETED" ? (
        <form action={event.action} className="mt-2">
          <Button
            size={prominent ? "default" : "xs"}
            variant={prominent ? "default" : "outline"}
            className="w-full"
          >
            {event.kind === "meal"
              ? "Ate as planned"
              : event.kind === "supplement"
                ? "Complete"
                : "Start workout"}
          </Button>
        </form>
      ) : null}
      {event.kind === "meal" && event.status !== "COMPLETED" ? (
        <details className="mt-2">
          <summary className="text-muted-foreground cursor-pointer text-[11px]">
            Log something different
          </summary>
          <MutationForm
            action={completeMealWithActualsAction.bind(null, event.id)}
            submitLabel="Complete meal"
            className="mt-2 space-y-2"
          >
            {[
              ["actualCalories", "Calories"],
              ["actualProteinGrams", "Protein g"],
              ["actualCarbGrams", "Carbs g"],
              ["actualFatGrams", "Fat g"],
            ].map(([name, placeholder]) => (
              <Input
                key={name}
                name={name}
                type="number"
                min="0"
                placeholder={`${placeholder} (optional)`}
              />
            ))}
          </MutationForm>
        </details>
      ) : null}
      {!event.movedByClient &&
      event.status !== "COMPLETED" &&
      event.status !== "MISSED" ? (
        <details className="mt-2">
          <summary className="text-muted-foreground cursor-pointer text-[11px]">
            Move once
          </summary>
          <MutationForm
            action={rescheduleEventAction.bind(
              null,
              event.kind.toUpperCase() as "WORKOUT" | "MEAL" | "SUPPLEMENT",
              event.id,
            )}
            submitLabel="Move event"
            className="mt-2 space-y-2"
          >
            <Input
              name="scheduledAt"
              type="datetime-local"
              defaultValue={formatInTimeZone(
                event.at,
                timezone,
                "yyyy-MM-dd'T'HH:mm",
              )}
              required
            />
          </MutationForm>
        </details>
      ) : null}
    </div>
  );
}
