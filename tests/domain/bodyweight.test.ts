import { describe, expect, it } from "vitest";
import { selectDailyWeights } from "@/server/domain/bodyweight";

describe("selectDailyWeights", () => {
  it("uses an explicitly marked morning value over an earlier entry", () => {
    const selected = selectDailyWeights(
      [
        {
          id: "earliest",
          value: 190,
          unit: "LB",
          measuredAt: new Date("2026-06-01T10:00:00Z"),
          isMorning: false,
        },
        {
          id: "morning",
          value: 189,
          unit: "LB",
          measuredAt: new Date("2026-06-01T12:00:00Z"),
          isMorning: true,
        },
      ],
      "America/New_York",
    );
    expect(selected.map(({ id }) => id)).toEqual(["morning"]);
  });

  it("separates entries by the client's local date", () => {
    const selected = selectDailyWeights(
      [
        {
          id: "late",
          value: 190,
          unit: "LB",
          measuredAt: new Date("2026-06-02T03:30:00Z"),
          isMorning: false,
        },
        {
          id: "next",
          value: 189,
          unit: "LB",
          measuredAt: new Date("2026-06-02T04:30:00Z"),
          isMorning: false,
        },
      ],
      "America/New_York",
    );
    expect(selected).toHaveLength(2);
  });
});
