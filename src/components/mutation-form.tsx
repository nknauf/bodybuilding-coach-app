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
  confirmMessage,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  children: ReactNode;
  className?: string;
  confirmMessage?: string;
}) {
  const [state, dispatch] = useActionState(action, initialActionState);
  return (
    <form
      action={dispatch}
      className={className}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage))
          event.preventDefault();
      }}
    >
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
      {state.inviteUrl ? (
        <div className="bg-muted/40 rounded-lg border p-3">
          <label className="text-sm font-medium" htmlFor="invitation-link">
            Invitation link
          </label>
          <input
            id="invitation-link"
            className="bg-background mt-1 h-10 w-full rounded-lg border px-3 text-sm"
            value={state.inviteUrl}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Select and copy this link. Manual links are shown only when created
            or regenerated.
          </p>
        </div>
      ) : null}
    </form>
  );
}
