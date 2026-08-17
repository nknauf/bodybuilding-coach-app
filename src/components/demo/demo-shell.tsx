"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dumbbell, RotateCcw, X } from "lucide-react";
import type { ReactNode } from "react";
import { useDemo } from "@/demo/demo-provider";
import { Button } from "@/components/ui/button";

export function DemoShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { reset } = useDemo();
  const coach = pathname.startsWith("/demo/coach");
  const navigation = coach
    ? [
        { href: "/demo/coach", label: "Clients" },
        { href: "/demo/coach/clients/demo-client-maya", label: "Calendar" },
        { href: "/demo/coach/exercises", label: "Exercises" },
        {
          href: "/demo/coach/clients/demo-client-maya#progress",
          label: "Analytics",
        },
      ]
    : [
        { href: "/demo/client", label: "Today" },
        { href: "/demo/client#calendar", label: "Calendar" },
        { href: "/demo/client#progress", label: "Progress" },
      ];
  const resetDemo = () => {
    if (
      window.confirm("Reset every demo change and restore the sample data?")
    ) {
      reset();
      router.push(coach ? "/demo/coach" : "/demo/client");
    }
  };
  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2 text-xs text-amber-950 sm:px-6">
          <strong>Live demo</strong>
          <span>
            Changes stay in this browser tab and never touch real client data.
          </span>
          <span className="ml-auto hidden sm:inline">
            Try scheduling a workout, then switch to Client.
          </span>
        </div>
      </div>
      <header className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link
            href="/demo/coach"
            className="flex items-center gap-2 font-semibold"
          >
            <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-lg">
              <Dumbbell className="size-5" />
            </span>
            <span>More Sore</span>
          </Link>
          <nav className="hidden flex-1 items-center gap-1 lg:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`hover:bg-muted rounded-md px-3 py-2 text-sm ${pathname === item.href.split("#")[0] ? "bg-muted" : "text-muted-foreground"}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="bg-muted ml-auto flex rounded-lg p-1 text-xs">
            <Link
              href="/demo/coach"
              className={`rounded-md px-3 py-1.5 ${coach ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              Coach
            </Link>
            <Link
              href="/demo/client"
              className={`rounded-md px-3 py-1.5 ${!coach ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              Client
            </Link>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={resetDemo}
            aria-label="Reset demo"
          >
            <RotateCcw />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            render={<Link href="/" />}
            aria-label="Exit demo"
          >
            <X />
          </Button>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t px-3 py-2 lg:hidden">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:bg-muted text-muted-foreground rounded-md px-3 py-1.5 text-sm whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
