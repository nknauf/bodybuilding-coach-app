import type { ReactNode } from "react";
import { DemoProvider } from "@/demo/demo-provider";
import { DemoShell } from "@/components/demo/demo-shell";

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <DemoProvider>
      <DemoShell>{children}</DemoShell>
    </DemoProvider>
  );
}
