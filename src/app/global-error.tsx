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
            We couldn&apos;t load your workspace. Try the request again.
          </p>
          {error.digest ? (
            <p className="mt-2 font-mono text-xs text-zinc-500">
              Support code: {error.digest}
            </p>
          ) : null}
          <Button className="mt-6" onClick={() => unstable_retry()}>
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
