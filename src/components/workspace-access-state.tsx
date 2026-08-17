"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function WorkspaceAccessState({
  kind,
}: {
  kind: "not_provisioned" | "email_unverified" | "unavailable";
}) {
  const content = {
    not_provisioned: {
      title: "No workspace invitation found",
      detail:
        "Sign in with the exact email address your administrator or coach invited.",
    },
    email_unverified: {
      title: "Verify your email address",
      detail:
        "Complete Clerk email verification, then try your workspace again.",
    },
    unavailable: {
      title: "Workspace unavailable",
      detail:
        "Your account is disabled or archived. Contact your workspace administrator.",
    },
  }[kind];

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 p-6 text-center">
      <div className="max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">{content.title}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">{content.detail}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" render={<Link href="/" />}>
            Home
          </Button>
          <SignOutButton redirectUrl="/sign-in">
            <Button>Sign out</Button>
          </SignOutButton>
        </div>
      </div>
    </main>
  );
}
