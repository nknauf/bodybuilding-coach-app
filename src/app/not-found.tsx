import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-[60vh] place-items-center p-6 text-center">
      <div>
        <p className="text-muted-foreground text-sm font-medium">404</p>
        <h1 className="mt-2 text-3xl font-semibold">Resource not found</h1>
        <p className="text-muted-foreground mt-2">
          It may not exist, or you may not have access to it.
        </p>
        <Button className="mt-6" render={<Link href="/app" />}>
          Return to workspace
        </Button>
      </div>
    </main>
  );
}
