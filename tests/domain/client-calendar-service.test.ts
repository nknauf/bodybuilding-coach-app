import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/server/auth/authorization";

const mocks = vi.hoisted(() => ({
  accessible: vi.fn(),
  workouts: vi.fn(),
  meals: vi.fn(),
  supplements: vi.fn(),
  media: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/scopes", () => ({
  requireAccessibleClient: mocks.accessible,
}));
vi.mock("@/server/db/client", () => ({
  db: {
    workout: { findMany: mocks.workouts },
    mealEvent: { findMany: mocks.meals },
    supplementEvent: { findMany: mocks.supplements },
    media: { findMany: mocks.media },
  },
}));
import {
  getClientCalendarMonth,
  getClientDayDetails,
} from "@/server/services/client-calendar";

const actor = {
  id: "actor",
  role: "CLIENT",
  clientProfileId: "mine",
  timezone: "America/New_York",
} as Actor;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.accessible.mockResolvedValue({
    id: "mine",
    user: { timezone: "America/New_York" },
  });
  mocks.workouts.mockResolvedValue([
    {
      id: "workout",
      name: "Legs",
      scheduledAt: new Date("2026-10-01T02:00:00Z"),
      finalizedAt: null,
    },
  ]);
  mocks.meals.mockResolvedValue([
    {
      id: "meal-1",
      name: "Breakfast",
      scheduledAt: new Date("2026-09-30T12:00:00Z"),
      completedAt: null,
    },
    {
      id: "meal-2",
      name: "Dinner",
      scheduledAt: new Date("2026-10-01T01:00:00Z"),
      completedAt: null,
    },
  ]);
  mocks.supplements.mockResolvedValue([
    {
      id: "supplement",
      name: "Creatine",
      dosageText: "5 g",
      scheduledAt: new Date("2026-10-01T02:30:00Z"),
      completedAt: null,
    },
  ]);
  mocks.media.mockResolvedValue([
    {
      mediaDate: new Date("2026-09-30T00:00:00Z"),
      createdAt: new Date("2026-10-02T00:00:00Z"),
    },
  ]);
});

describe("client calendar service", () => {
  it("aggregates all scheduled items and media on the same local day", async () => {
    const result = await getClientCalendarMonth(actor, 2026, 9);
    expect(result.days["2026-09-30"]).toEqual({
      workouts: 1,
      meals: 2,
      supplements: 1,
      media: 1,
    });
    expect(mocks.workouts.mock.calls[0][0].where).toMatchObject({
      clientId: "mine",
      scheduledAt: {
        gte: new Date("2026-09-01T04:00:00Z"),
        lt: new Date("2026-10-01T04:00:00Z"),
      },
    });
    const details = await getClientDayDetails(actor, "2026-09-30");
    expect(details.workouts).toHaveLength(1);
    expect(details.meals).toHaveLength(2);
    expect(details.supplements).toHaveLength(1);
    expect(details.supplements[0]?.name).toBe("Creatine");
  });

  it("checks access before querying another client's calendar", async () => {
    mocks.accessible.mockRejectedValueOnce(new Error("Resource not found"));
    await expect(getClientCalendarMonth(actor, 2026, 9)).rejects.toThrow();
    expect(mocks.workouts).not.toHaveBeenCalled();
    expect(mocks.media).not.toHaveBeenCalled();
  });

  it("moves a supplement indicator when its scheduled day changes", async () => {
    mocks.supplements.mockResolvedValueOnce([
      {
        scheduledAt: new Date("2026-10-01T12:30:00Z"),
      },
    ]);
    const result = await getClientCalendarMonth(actor, 2026, 10);
    expect(result.days["2026-10-01"]?.supplements).toBe(1);
    expect(result.days["2026-09-30"]?.supplements ?? 0).toBe(0);
  });
});
