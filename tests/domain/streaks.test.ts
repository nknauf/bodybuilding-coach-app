import { describe, expect, it } from "vitest";
import {
  consecutiveCompletedEventStreak,
  dailyNoMissedStreak,
  overallDailyStreak,
  weeklyComplianceStreak,
} from "@/server/domain/streaks";
import { calculateCompliance } from "@/server/domain/compliance";

describe("streaks", () => {
  it("counts consecutive completed workout or meal events", () => {
    expect(
      consecutiveCompletedEventStreak(["COMPLETED", "COMPLETED", "MISSED"]),
    ).toBe(2);
  });

  it("counts consecutive 90% weeks", () => {
    expect(weeklyComplianceStreak([0.94, 0.9, 0.89, 1])).toBe(2);
  });

  it("skips unassigned days and stops on a missed event", () => {
    expect(
      dailyNoMissedStreak([[], ["COMPLETED"], ["SCHEDULED"], ["MISSED"]]),
    ).toBe(2);
  });

  it("requires 80% in every assigned category for overall daily streak", () => {
    expect(
      overallDailyStreak([
        calculateCompliance({ meals: [{ status: "COMPLETED" }] }),
        calculateCompliance({
          meals: [
            { status: "COMPLETED" },
            { status: "COMPLETED" },
            { status: "COMPLETED" },
            { status: "COMPLETED" },
            { status: "MISSED" },
          ],
        }),
        calculateCompliance({ supplements: [{ status: "MISSED" }] }),
      ]),
    ).toBe(2);
  });
});
