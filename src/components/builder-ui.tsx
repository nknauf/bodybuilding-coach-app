"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, GripVertical, MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { parseRepRange } from "@/lib/builder-values";

export const builderFormClass = "flex min-h-0 flex-1 flex-col";
export const builderBodyClass =
  "min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6";

export function BuilderFooter({
  children,
  onCancel,
}: {
  children: ReactNode;
  onCancel?: () => void;
}) {
  return (
    <div className="bg-background sticky bottom-0 z-10 flex shrink-0 flex-wrap items-center justify-end gap-3 border-t px-4 py-4 sm:px-6">
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      )}
      {children}
    </div>
  );
}

export function OptionalDetails({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <details
      className="group rounded-lg border p-3"
      onInvalidCapture={(event) => {
        event.currentTarget.open = true;
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
        {label}
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}

export function ScheduleControls({
  value,
  onChange,
  name,
}: {
  value: string;
  onChange?: (value: string) => void;
  name?: string;
}) {
  const id = useId();
  const [local, setLocal] = useState(value);
  const current = onChange ? value : local;
  const [date = "", time = ""] = current.split("T");
  const update = (next: string) => {
    setLocal(next);
    onChange?.(next);
  };
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Schedule</h3>
      <div className="grid max-w-sm grid-cols-2 gap-3">
        <label htmlFor={`${id}-date`} className="space-y-1.5 text-sm">
          Date
          <Input
            id={`${id}-date`}
            type="date"
            required
            value={date}
            onChange={(e) => update(`${e.target.value}T${time}`)}
          />
        </label>
        <label htmlFor={`${id}-time`} className="space-y-1.5 text-sm">
          Time
          <Input
            id={`${id}-time`}
            type="time"
            required
            value={time}
            onChange={(e) => update(`${date}T${e.target.value}`)}
          />
        </label>
      </div>
      {name && <input type="hidden" name={name} value={current} />}
    </div>
  );
}

export function ItemMenu({
  label,
  onUp,
  onDown,
  onRemove,
  onDuplicate,
  first,
  last,
  canRemove = true,
}: {
  label: string;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  onDuplicate?: () => void;
  first: boolean;
  last: boolean;
  canRemove?: boolean;
}) {
  const [announcement, setAnnouncement] = useState("");
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Actions for ${label}`}
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {onDuplicate && (
            <DropdownMenuItem onClick={onDuplicate}>Duplicate</DropdownMenuItem>
          )}
          <DropdownMenuItem
            disabled={first}
            onClick={() => {
              onUp();
              setAnnouncement(`${label} moved up`);
            }}
          >
            Move up
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={last}
            onClick={() => {
              onDown();
              setAnnouncement(`${label} moved down`);
            }}
          >
            Move down
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canRemove}
            onClick={onRemove}
            className="focus:text-destructive"
          >
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}

// Only the handle captures touch gestures; form controls and normal scrolling stay usable.
export function SortHandle({
  index,
  group,
  onMove,
  label,
  number,
}: {
  index: number;
  group: string;
  onMove: (from: number, to: number) => void;
  label: string;
  number?: number;
}) {
  const drag = useRef<{
    target: number;
    startY: number;
    active: boolean;
    x: number;
    y: number;
  } | null>(null);
  const frame = useRef<number | null>(null);
  const highlighted = useRef<HTMLElement | null>(null);
  const clear = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    highlighted.current?.classList.remove("ring-2", "ring-ring");
    highlighted.current = null;
    drag.current = null;
  };
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      highlighted.current?.classList.remove("ring-2", "ring-ring");
    },
    [],
  );
  const [announcement, setAnnouncement] = useState("");
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 cursor-grab touch-none"
        aria-label={`Drag ${label} to reorder; use its actions menu for keyboard movement`}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          drag.current = {
            target: index,
            startY: event.clientY,
            active: false,
            x: event.clientX,
            y: event.clientY,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          const handle = event.currentTarget;
          const tick = () => {
            const current = drag.current;
            if (!current) return;
            if (current.active) {
              let row = document
                .elementFromPoint(current.x, current.y)
                ?.closest<HTMLElement>("[data-sort-group]");
              while (row && row.dataset.sortGroup !== group)
                row =
                  row.parentElement?.closest<HTMLElement>(
                    "[data-sort-group]",
                  ) ?? null;
              if (row) {
                current.target = Number(row.dataset.sortIndex);
                if (highlighted.current !== row) {
                  highlighted.current?.classList.remove("ring-2", "ring-ring");
                  row.classList.add("ring-2", "ring-ring");
                  highlighted.current = row;
                }
              }
              const scroll = handle.closest<HTMLElement>(
                "[data-builder-scroll]",
              );
              if (scroll) {
                const bounds = scroll.getBoundingClientRect();
                if (current.y < bounds.top + 50) scroll.scrollBy(0, -8);
                else if (current.y > bounds.bottom - 50) scroll.scrollBy(0, 8);
              }
            }
            frame.current = requestAnimationFrame(tick);
          };
          frame.current = requestAnimationFrame(tick);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          if (Math.abs(event.clientY - drag.current.startY) > 5)
            drag.current.active = true;
          if (!drag.current.active) return;
          drag.current.x = event.clientX;
          drag.current.y = event.clientY;
        }}
        onPointerUp={(event) => {
          const finished = drag.current;
          clear();
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
          if (finished?.active && finished.target !== index) {
            onMove(index, finished.target);
            setAnnouncement(
              `${label} moved to position ${finished.target + 1}`,
            );
          }
        }}
        onPointerCancel={() => {
          clear();
        }}
        onLostPointerCapture={clear}
      >
        <GripVertical
          className={`text-muted-foreground ${number !== undefined ? "size-2.5" : "size-4"}`}
        />
        {number !== undefined && (
          <span className="text-muted-foreground text-xs">{number}</span>
        )}
      </Button>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}

export function RepRangeInput({
  min,
  max,
  onChange,
  label,
}: {
  min: string;
  max: string;
  onChange: (min: string, max: string) => void;
  label: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const formatted = min === max || !max ? min : `${min}–${max}`;
  const [draft, setDraft] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const invalid = touched && draft !== null && !parseRepRange(draft);
  return (
    <div className="min-w-0">
      <Input
        ref={input}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        required
        value={draft ?? formatted}
        placeholder="8–10"
        onChange={(event) => {
          const next = event.target.value;
          const parsed = parseRepRange(next);
          setDraft(next);
          event.target.setCustomValidity(
            parsed ? "" : "Enter reps like 8 or 8–10 (1–1000).",
          );
          if (parsed) onChange(String(parsed.min), String(parsed.max));
          else onChange("", "");
        }}
        onBlur={() => {
          setTouched(true);
          if (input.current?.validity.valid) setDraft(null);
        }}
      />
      {invalid && (
        <p id={errorId} role="alert" className="text-destructive mt-1 text-xs">
          Use 8 or 8–10.
        </p>
      )}
    </div>
  );
}

export function PresetMenu({
  onSelect,
}: {
  onSelect: (count: number, reps: number) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" size="sm" variant="ghost" />}
      >
        <Plus /> Set preset
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-36">
        {[
          [2, 8],
          [3, 8],
          [3, 10],
          [4, 8],
          [4, 10],
        ].map(([count, reps]) => (
          <DropdownMenuItem
            key={`${count}-${reps}`}
            onClick={() => onSelect(count, reps)}
          >
            {count} × {reps}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
