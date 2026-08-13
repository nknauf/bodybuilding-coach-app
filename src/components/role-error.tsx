"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RoleError() {
  return (
    <div className="grid min-h-[50vh] place-items-center p-6 text-center">
      <div>
        <h2 className="text-2xl font-semibold">Workspace unavailable</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Your account is disabled, not mapped to this role, or the requested
          resource is outside your workspace.
        </p>
        <Button className="mt-5" render={<Link href="/app" />}>
          Return to your workspace
        </Button>
      </div>
    </div>
  );
}
