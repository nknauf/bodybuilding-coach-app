"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/app/actions/state";
import { initialActionState } from "@/app/actions/state";
import { Button } from "@/components/ui/button";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function MutationForm({
  action,
  submitLabel,
  children,
  className,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  children: ReactNode;
  className?: string;
}) {
  const [state, dispatch] = useActionState(action, initialActionState);
  return (
    <form action={dispatch} className={className}>
      {children}
      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
        {state.message ? (
          <p
            className={
              state.ok ? "text-sm text-emerald-700" : "text-destructive text-sm"
            }
            role={state.ok ? "status" : "alert"}
            aria-live="polite"
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
