"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="en">
      <body className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <h1 className="text-3xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground mt-2">
            No changes were reported as complete. Try the request again.
          </p>
          <Button className="mt-6" onClick={() => unstable_retry()}>
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
