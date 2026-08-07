import { db } from "@/server/db/client";
import { requireActor } from "@/server/auth/current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AuditPage() {
  await requireActor(["ADMIN"]);
  const logs = await db.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { firstName: true, lastName: true } } },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit log</CardTitle>
        <p className="text-muted-foreground text-sm">
          Latest 100 important mutations. Admin reads are explicit but not user
          impersonation.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {logs.map((log) => (
          <div
            key={log.id}
            className="grid gap-1 rounded-lg border p-3 sm:grid-cols-[12rem_1fr_auto]"
          >
            <time className="text-muted-foreground text-sm">
              {log.createdAt.toLocaleString()}
            </time>
            <div>
              <p className="font-medium">{log.action.replaceAll("_", " ")}</p>
              <p className="text-muted-foreground text-xs">
                {log.entityType} · {log.entityId}
              </p>
            </div>
            <span className="text-muted-foreground text-sm">
              {log.actor
                ? `${log.actor.firstName} ${log.actor.lastName}`
                : "System"}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
