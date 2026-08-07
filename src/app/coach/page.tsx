import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireActor } from "@/server/auth/current-user";
import { getCoachOverview } from "@/server/services/reports";
import { provisionClientAction } from "@/app/actions/coach";
import { MutationForm } from "@/components/mutation-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";

export default async function CoachPage() {
  const actor = await requireActor(["COACH"]);
  const overview = await getCoachOverview(actor);
  return (
    <div className="space-y-8">
      <div>
        <p className="text-muted-foreground text-sm">Coaching workspace</p>
        <h1 className="text-3xl font-semibold tracking-tight">Clients</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-3">
          {overview.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground py-12 text-center">
                Provision your first client to begin scheduling.
              </CardContent>
            </Card>
          ) : (
            overview.map(({ client, report }) => (
              <Link
                key={client.id}
                href={`/coach/clients/${client.id}`}
                className="bg-card hover:border-foreground/30 grid gap-4 rounded-xl border p-5 transition sm:grid-cols-[1fr_auto_auto]"
              >
                <div>
                  <p className="font-semibold">
                    {client.user.firstName} {client.user.lastName}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {client.user.timezone}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-2xl font-semibold">
                    {report.compliancePercent.overall === null
                      ? "—"
                      : `${report.compliancePercent.overall}%`}
                  </p>
                  <p className="text-muted-foreground text-xs">this week</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={client.status} />
                  <ArrowRight className="size-4" />
                </div>
              </Link>
            ))
          )}
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Provision client</CardTitle>
            <p className="text-muted-foreground text-sm">
              No email is sent locally. The client signs up with this exact
              email.
            </p>
          </CardHeader>
          <CardContent>
            <MutationForm
              action={provisionClientAction}
              submitLabel="Create invitation"
              className="space-y-4"
            >
              <Field label="First name" name="firstName" />
              <Field label="Last name" name="lastName" />
              <Field label="Email" name="email" type="email" />
              <Field
                label="Client timezone"
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
