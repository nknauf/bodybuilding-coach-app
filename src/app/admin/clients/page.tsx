import { requireActor } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { reassignClientAction } from "@/app/actions/admin";
import { MutationForm } from "@/components/mutation-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";

export default async function AdminClientsPage() {
  await requireActor(["ADMIN"]);
  const [clients, coaches] = await Promise.all([
    db.clientProfile.findMany({
      where: { user: { deletedAt: null } },
      include: {
        user: true,
        coach: { include: { user: true } },
      },
      orderBy: { user: { lastName: "asc" } },
    }),
    db.coachProfile.findMany({
      where: { user: { status: "ACTIVE", deletedAt: null } },
      include: { user: true },
      orderBy: { user: { lastName: "asc" } },
    }),
  ]);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-muted-foreground text-sm">Platform operations</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Client ownership
        </h1>
      </header>
      <div className="space-y-4">
        {clients.map((client) => (
          <Card key={client.id}>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>
                  {client.user.firstName} {client.user.lastName}
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Current coach:{" "}
                  {client.coach
                    ? `${client.coach.user.firstName} ${client.coach.user.lastName}`
                    : "Unassigned"}
                </p>
              </div>
              <StatusBadge status={client.status} />
            </CardHeader>
            <CardContent>
              <MutationForm
                action={reassignClientAction}
                submitLabel="Reassign client"
                className="flex flex-wrap items-end gap-3"
                confirmMessage={`Reassign ${client.user.firstName} and transfer all active records to the selected coach?`}
              >
                <input type="hidden" name="clientId" value={client.id} />
                <div className="min-w-64 flex-1 space-y-1.5">
                  <Label htmlFor={`coach-${client.id}`}>
                    Destination active coach
                  </Label>
                  <select
                    id={`coach-${client.id}`}
                    name="coachId"
                    className="bg-background h-10 w-full rounded-lg border px-3 text-sm"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Choose coach
                    </option>
                    {coaches
                      .filter((coach) => coach.id !== client.coachId)
                      .map((coach) => (
                        <option key={coach.id} value={coach.id}>
                          {coach.user.firstName} {coach.user.lastName}
                        </option>
                      ))}
                  </select>
                </div>
              </MutationForm>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
