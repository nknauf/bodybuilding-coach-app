import { describe, expect, it } from "vitest";
import { effectiveEventStatus } from "@/server/domain/event-status";
import { mondayWeekUtcRange } from "@/server/domain/time";

describe("effectiveEventStatus", () => {
  const scheduledAt = new Date("2026-03-08T06:30:00.000Z");

  it.each([
    ["SCHEDULED", "workout", "2026-03-08T06:30:00.000Z"],
    ["OVERDUE", "workout", "2026-03-09T06:30:00.000Z"],
    ["MISSED", "workout", "2026-03-09T06:30:00.001Z"],
    ["OVERDUE", "meal", "2026-03-08T18:30:00.000Z"],
    ["MISSED", "supplement", "2026-03-08T18:30:00.001Z"],
  ] as const)("returns %s at a fixed boundary", (expected, kind, now) => {
    expect(
      effectiveEventStatus({
        kind,
        scheduledAt,
        now: new Date(now),
      }),
    ).toBe(expected);
  });

  it("completion wins even after the missed boundary", () => {
    expect(
      effectiveEventStatus({
        kind: "meal",
        scheduledAt,
        now: new Date("2026-03-10T00:00:00.000Z"),
        completedAt: new Date("2026-03-08T08:00:00.000Z"),
      }),
    ).toBe("COMPLETED");
  });
});

describe("Monday-Sunday timezone ranges", () => {
  it("handles the US daylight-saving spring transition", () => {
    const range = mondayWeekUtcRange(
      new Date("2026-03-08T16:00:00.000Z"),
      "America/New_York",
    );
    expect(range.start.toISOString()).toBe("2026-03-02T05:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-03-09T03:59:59.999Z");
  });
});
