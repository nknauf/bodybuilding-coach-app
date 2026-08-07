import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { Dumbbell } from "lucide-react";

export function AppShell({
  role,
  navigation,
  children,
}: {
  role: string;
  navigation: readonly { href: string; label: string }[];
  children: ReactNode;
}) {
  return (
    <div className="bg-muted/30 min-h-screen">
      <header className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link href="/app" className="flex items-center gap-2 font-semibold">
            <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-lg">
              <Dumbbell className="size-5" />
            </span>
            <span>Forge Coach</span>
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-3 py-2 text-sm"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="bg-muted ml-auto rounded-full px-2 py-1 text-xs font-medium">
            {role}
          </span>
          <UserButton />
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t px-3 py-2 md:hidden">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:bg-muted rounded-md px-3 py-1.5 text-sm whitespace-nowrap"
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
