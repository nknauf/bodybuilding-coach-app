import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireActor } from "@/server/auth/current-user";
import { requireCoachProfileId } from "@/server/auth/authorization";
import { getCoachOverview } from "@/server/services/reports";
import { db } from "@/server/db/client";
import {
  provisionClientAction,
  retryClientInvitationAction,
  setClientStatusAction,
} from "@/app/actions/coach";
import { MutationForm } from "@/components/mutation-form";
import { ConfirmForm } from "@/components/confirm-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";

export default async function CoachPage() {
  const actor = await requireActor(["COACH"]);
  const coachId = requireCoachProfileId(actor);
  const [overview, archivedClients, invites] = await Promise.all([
    getCoachOverview(actor),
    db.clientProfile.findMany({
      where: {
        coachId,
        status: "ARCHIVED",
        user: { deletedAt: null },
      },
      include: { user: true },
      orderBy: { user: { lastName: "asc" } },
    }),
    db.clientInvite.findMany({
      where: { coachId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  return (
    <div className="space-y-8">
      <header>
        <p className="text-muted-foreground text-sm">Coaching workspace</p>
        <h1 className="text-3xl font-semibold tracking-tight">Clients</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Open a client to build their plan, review progress, or update access.
        </p>
      </header>
      <div
        id="clients"
        className="grid scroll-mt-24 gap-6 xl:grid-cols-[1fr_23rem]"
      >
        <div id="compliance" className="scroll-mt-24 space-y-3">
          {overview.length === 0 && archivedClients.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground py-12 text-center">
                Provision your first client to begin scheduling.
              </CardContent>
            </Card>
          ) : null}
          {overview.map(({ client, report }) => (
            <Card key={client.id}>
              <CardContent className="flex flex-wrap items-center gap-4 p-5">
                <Link
                  href={`/coach/clients/${client.id}`}
                  className="min-w-48 flex-1"
                >
                  <p className="font-semibold">
                    {client.user.firstName} {client.user.lastName}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {client.user.timezone}
                  </p>
                </Link>
                <div className="text-right">
                  <p className="text-2xl font-semibold">
                    {report.compliancePercent.overall === null
                      ? "—"
                      : `${report.compliancePercent.overall}%`}
                  </p>
                  <p className="text-muted-foreground text-xs">this week</p>
                </div>
                <StatusBadge status={client.status} />
                <ClientStatusControls
                  id={client.id}
                  name={`${client.user.firstName} ${client.user.lastName}`}
                  status={client.status}
                />
                <Button
                  render={<Link href={`/coach/clients/${client.id}`} />}
                  variant="ghost"
                  size="icon"
                  aria-label={`Open ${client.user.firstName}`}
                >
                  <ArrowRight />
                </Button>
              </CardContent>
            </Card>
          ))}
          {archivedClients.map((client) => (
            <Card key={client.id} className="opacity-80">
              <CardContent className="flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-48 flex-1">
                  <p className="font-semibold">
                    {client.user.firstName} {client.user.lastName}
                  </p>
                  <p className="text-muted-foreground text-sm">Archived</p>
                </div>
                <StatusBadge status={client.status} />
                <ClientStatusControls
                  id={client.id}
                  name={`${client.user.firstName} ${client.user.lastName}`}
                  status={client.status}
                />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card id="schedule" className="h-fit scroll-mt-24">
          <CardHeader>
            <CardTitle>Invite client</CardTitle>
            <p className="text-muted-foreground text-sm">
              Clerk email is attempted when configured. A copyable manual link
              is always available as fallback.
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

      <Card>
        <CardHeader>
          <CardTitle>Invitation status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {invites.length === 0 ? (
            <p className="text-muted-foreground text-sm">No invitations yet.</p>
          ) : (
            invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
              >
                <div className="min-w-52 flex-1">
                  <p className="font-medium">
                    {invite.firstName} {invite.lastName}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {invite.email} ·{" "}
                    {invite.deliveryMethod === "CLERK_EMAIL"
                      ? "Clerk email"
                      : invite.deliveryMethod === "MANUAL_LINK"
                        ? "Manual delivery"
                        : "Not delivered"}
                  </p>
                </div>
                <StatusBadge status={invite.status} />
                {invite.status === "PENDING" ? (
                  <MutationForm
                    action={retryClientInvitationAction.bind(null, invite.id)}
                    submitLabel="Retry / regenerate"
                    className="max-w-md"
                    confirmMessage="Invalidate the previous invitation and generate a new one?"
                  >
                    <span className="sr-only">Regenerate invitation</span>
                  </MutationForm>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClientStatusControls({
  id,
  name,
  status,
}: {
  id: string;
  name: string;
  status: string;
}) {
  if (status === "ARCHIVED" || status === "INACTIVE") {
    return (
      <ConfirmForm
        action={setClientStatusAction.bind(null, id, "ACTIVE")}
        message={`Reactivate ${name}?`}
      >
        <Button type="submit" size="sm" variant="outline">
          Reactivate
        </Button>
      </ConfirmForm>
    );
  }
  return (
    <div className="flex gap-2">
      <ConfirmForm
        action={setClientStatusAction.bind(null, id, "INACTIVE")}
        message={`Deactivate ${name}? They will be unable to use the application.`}
      >
        <Button type="submit" size="sm" variant="outline">
          Deactivate
        </Button>
      </ConfirmForm>
      <ConfirmForm
        action={setClientStatusAction.bind(null, id, "ARCHIVED")}
        message={`Archive ${name}? Historical data will be retained.`}
      >
        <Button type="submit" size="sm" variant="destructive">
          Archive
        </Button>
      </ConfirmForm>
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
