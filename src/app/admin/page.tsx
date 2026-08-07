import { requireActor } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { createCoachAction, setCoachEnabledAction } from "@/app/actions/admin";
import { MutationForm } from "@/components/mutation-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";

export default async function AdminPage() {
  await requireActor(["ADMIN"]);
  const [coaches, clientCount, activeUserCount] = await Promise.all([
    db.user.findMany({
      where: { role: "COACH", deletedAt: null },
      include: {
        coachProfile: { include: { _count: { select: { clients: true } } } },
      },
      orderBy: { lastName: "asc" },
    }),
    db.clientProfile.count(),
    db.user.count({ where: { status: "ACTIVE", deletedAt: null } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-muted-foreground text-sm">Platform operations</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Administration
        </h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Coaches", coaches.length],
          ["Clients", clientCount],
          ["Active users", activeUserCount],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <p className="text-muted-foreground text-sm">{label}</p>
              <CardTitle className="text-3xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Coaches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {coaches.length === 0 ? (
              <p className="text-muted-foreground text-sm">No coaches yet.</p>
            ) : (
              coaches.map((coach) => (
                <div
                  key={coach.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-48 flex-1">
                    <p className="font-medium">
                      {coach.firstName} {coach.lastName}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {coach.email}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {coach.coachProfile?._count.clients ?? 0} clients
                  </span>
                  <StatusBadge status={coach.status} />
                  <form
                    action={setCoachEnabledAction.bind(
                      null,
                      coach.id,
                      coach.status !== "ACTIVE",
                    )}
                  >
                    <Button size="sm" variant="outline">
                      {coach.status === "ACTIVE" ? "Disable" : "Enable"}
                    </Button>
                  </form>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Provision coach</CardTitle>
          </CardHeader>
          <CardContent>
            <MutationForm
              action={createCoachAction}
              submitLabel="Create coach"
              className="space-y-4"
            >
              <Field label="First name" name="firstName" />
              <Field label="Last name" name="lastName" />
              <Field label="Email" name="email" type="email" />
              <Field
                label="IANA timezone"
                name="timezone"
                defaultValue="America/New_York"
              />
            </MutationForm>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required
      />
    </div>
  );
}
