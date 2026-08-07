import { createHash } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (token.length < 24 || token.length > 200) notFound();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invite = await db.clientInvite.findFirst({
    where: {
      tokenHash,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    select: { email: true, firstName: true },
  });
  if (!invite) notFound();
  const [local, domain = ""] = invite.email.split("@");
  const maskedEmail = `${local?.slice(0, 1) ?? ""}***@${domain}`;

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join Forge Coach</CardTitle>
          <p className="text-muted-foreground text-sm">
            Hi {invite.firstName}. Your coach invited {maskedEmail}.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Create your Clerk account using the exact invited email. The link
            does not grant access by itself.
          </p>
          <Button render={<Link href="/sign-up" />} className="w-full">
            Continue to secure sign-up
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
