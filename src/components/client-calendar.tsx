import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import type { Actor } from "@/server/auth/authorization";
import { requireAccessibleClient } from "@/server/auth/scopes";
import { db } from "@/server/db/client";
import {
  getClientCalendarMonth,
  getClientDayDetails,
} from "@/server/services/client-calendar";
import { localDayKey, localDateUtcRange } from "@/server/domain/time";
import { ClientMedia } from "@/components/client-media";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { completeMealAction } from "@/app/actions/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function ClientCalendar({
  actor,
  month,
  date,
}: {
  actor: Actor;
  month?: string;
  date?: string;
}) {
  const requestedMonthInput = /^\d{4}-\d{2}$/.test(month ?? "")
    ? month!
    : undefined;
  const client = await requireAccessibleClient(db, actor);
  const clientToday = localDayKey(new Date(), client.user.timezone);
  const requestedMonth = requestedMonthInput ?? clientToday.slice(0, 7);
  const [year, monthNumber] = requestedMonth.split("-").map(Number);
  const { days } = await getClientCalendarMonth(actor, year, monthNumber);
  const today = localDayKey(new Date(), client.user.timezone);
  let selected =
    requestedMonth === today.slice(0, 7) ? today : `${requestedMonth}-01`;
  if (date?.startsWith(`${requestedMonth}-`)) {
    try {
      localDateUtcRange(date, client.user.timezone);
      selected = date;
    } catch {
      /* Ignore invalid URL dates. */
    }
  }
  const details = await getClientDayDetails(actor, selected);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const previous = new Date(Date.UTC(year, monthNumber - 2, 1))
    .toISOString()
    .slice(0, 7);
  const next = new Date(Date.UTC(year, monthNumber, 1))
    .toISOString()
    .slice(0, 7);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Calendar</h1>
          <p className="text-muted-foreground text-sm">
            Choose a day to review your plan and media · {client.user.timezone}
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href="/client?view=calendar" />}
        >
          Current month
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.85fr)]">
        <Card className="h-fit">
          <CardHeader className="flex-row items-center justify-between gap-2">
            <Button
              size="sm"
              variant="outline"
              aria-label="Previous month"
              render={<Link href={`/client?view=calendar&month=${previous}`} />}
            >
              ←
            </Button>
            <CardTitle>
              {new Intl.DateTimeFormat("en-US", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(first)}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              aria-label="Next month"
              render={<Link href={`/client?view=calendar&month=${next}`} />}
            >
              →
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground grid grid-cols-7 text-center text-xs font-medium">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                (label) => (
                  <span key={label}>{label}</span>
                ),
              )}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {Array.from({ length: offset }, (_, index) => (
                <span key={`blank-${index}`} />
              ))}
              {Array.from({ length: count }, (_, index) => {
                const day = `${requestedMonth}-${String(index + 1).padStart(2, "0")}`;
                const activity = days[day];
                return (
                  <Link
                    key={day}
                    href={`/client?view=calendar&month=${requestedMonth}&date=${day}`}
                    aria-label={`${day}${activity ? `, ${activity.workouts} workouts, ${activity.meals} meals, ${activity.supplements} supplements, ${activity.media} media` : ""}`}
                    aria-current={day === selected ? "date" : undefined}
                    className={`hover:bg-accent min-h-14 rounded-lg border p-1 text-center text-sm transition-colors sm:min-h-16 ${day === selected ? "border-primary bg-primary/10 font-semibold" : day === today ? "border-primary/60" : "border-transparent"}`}
                  >
                    <span>{index + 1}</span>
                    {day === today ? (
                      <span className="text-primary block text-[9px]">
                        Today
                      </span>
                    ) : null}
                    {activity ? (
                      <span
                        className="mt-1 flex justify-center gap-1"
                        aria-hidden="true"
                      >
                        {activity.workouts ? (
                          <span className="size-1.5 rounded-full bg-blue-500" />
                        ) : null}
                        {activity.meals ? (
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                        ) : null}
                        {activity.supplements ? (
                          <span className="size-1.5 rounded-full bg-amber-500" />
                        ) : null}
                        {activity.media ? (
                          <span className="size-1.5 rounded-full bg-violet-500" />
                        ) : null}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
            <p className="text-muted-foreground mt-3 text-xs">
              Blue: workout · Green: meal · Amber: supplement · Purple: media
            </p>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">
              {new Intl.DateTimeFormat("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(`${selected}T12:00:00Z`))}
            </h2>
            <p className="text-muted-foreground text-sm">Selected day</p>
          </div>
          {!details.workouts.length &&
          !details.meals.length &&
          !details.supplements.length &&
          !days[selected]?.media ? (
            <p className="text-muted-foreground text-sm">
              Nothing logged for this day yet.
            </p>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>Workouts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {details.workouts.length ? (
                details.workouts.map((item) => (
                  <Link
                    key={item.id}
                    href={`/client/workouts/${item.id}`}
                    className="hover:bg-accent block rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.name}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {formatInTimeZone(
                        item.scheduledAt,
                        client.user.timezone,
                        "p",
                      )}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">
                  No workouts scheduled.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Meals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {details.meals.length ? (
                details.meals.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.name}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {formatInTimeZone(
                        item.scheduledAt,
                        client.user.timezone,
                        "p",
                      )}
                    </p>
                    {item.description ? (
                      <p className="mt-1 text-sm">{item.description}</p>
                    ) : null}
                    {item.status !== "COMPLETED" ? (
                      <form
                        action={completeMealAction.bind(null, item.id)}
                        className="mt-2"
                      >
                        <Button size="sm" variant="outline">
                          Ate as planned
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">
                  No meals scheduled.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Supplements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {details.supplements.length ? (
                details.supplements.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.name}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {formatInTimeZone(
                        item.scheduledAt,
                        client.user.timezone,
                        "p",
                      )}{" "}
                      · {item.dosageText}
                    </p>
                    {item.coachNotes ? (
                      <p className="mt-1 text-sm">{item.coachNotes}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">
                  No supplements scheduled.
                </p>
              )}
            </CardContent>
          </Card>
          <ClientMedia
            key={selected}
            clientId={client.id}
            date={selected}
            timezone={client.user.timezone}
            title="Photos and videos"
          />
        </div>
      </div>
    </div>
  );
}
