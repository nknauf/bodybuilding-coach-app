"use client";

import Link from "next/link";
import { ArrowRight, Plus, Users } from "lucide-react";
import { useDemo } from "@/demo/demo-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function CoachDemo() {
  const { state } = useDemo();
  return (
    <div className="space-y-7">
      <header>
        <p className="text-muted-foreground text-sm">Coaching workspace</p>
        <h1 className="text-3xl font-semibold tracking-tight">Clients</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Explore a fictional roster, then open Maya to adjust her plan.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-3">
          {state.clients.map((client, index) => {
            const completed = state.workouts.filter(
              (x) => x.clientId === client.id && x.status === "COMPLETED",
            ).length;
            const total = state.workouts.filter(
              (x) => x.clientId === client.id,
            ).length;
            return (
              <Card key={client.id}>
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="bg-muted grid size-11 place-items-center rounded-full text-sm font-semibold">
                    {client.initials}
                  </span>
                  <Link
                    href={`/demo/coach/clients/${client.id}`}
                    className="min-w-0 flex-1"
                  >
                    <strong className="block">{client.name}</strong>
                    <span className="text-muted-foreground text-sm">
                      {client.timezone}
                    </span>
                  </Link>
                  <div className="text-right">
                    <strong className="block text-xl">
                      {total
                        ? Math.round((completed / total) * 100)
                        : index
                          ? 82 - index * 4
                          : 0}
                      %
                    </strong>
                    <span className="text-muted-foreground text-xs">
                      this week
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    render={<Link href={`/demo/coach/clients/${client.id}`} />}
                    aria-label={`Open ${client.name}`}
                  >
                    <ArrowRight />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" /> Demo roster
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              The live product securely provisions real clients. Invitations are
              disabled in this anonymous demo.
            </p>
            <Button className="mt-4 w-full" variant="outline" disabled>
              <Plus /> Invite client
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ExercisesDemo() {
  const { state, dispatch } = useDemo();
  function submit(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    dispatch({
      type: "ADD_EXERCISE",
      exercise: { id: crypto.randomUUID(), name, scope: "COACH" },
    });
  }
  return (
    <div className="space-y-6">
      <header>
        <p className="text-muted-foreground text-sm">Coach library</p>
        <h1 className="text-3xl font-semibold">Exercises</h1>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardContent className="divide-y p-0">
            {state.exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="flex items-center justify-between p-4"
              >
                <span className="font-medium">{exercise.name}</span>
                <span className="text-muted-foreground text-xs">
                  {exercise.scope === "COACH" ? "Custom" : "Catalog"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Create custom exercise</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={submit} className="space-y-3">
              <input
                name="name"
                required
                maxLength={120}
                placeholder="Exercise name"
                className="h-10 w-full rounded-lg border px-3 text-sm"
              />
              <Button className="w-full">
                <Plus /> Add exercise
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
