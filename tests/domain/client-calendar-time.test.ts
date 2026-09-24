import { describe, expect, it } from "vitest";
import {
  dateOnlyValue,
  localDateUtcRange,
  localDayKey,
} from "@/server/domain/time";

describe("client calendar dates", () => {
  it("uses the client's local day around UTC midnight", () => {
    const instant = new Date("2026-10-01T02:00:00.000Z");
    expect(localDayKey(instant, "America/New_York")).toBe("2026-09-30");
    const range = localDateUtcRange("2026-09-30", "America/New_York");
    expect(range.start.toISOString()).toBe("2026-09-30T04:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-10-01T04:00:00.000Z");
  });

  it("represents media dates as date-only values", () => {
    expect(dateOnlyValue("2026-09-20").toISOString()).toBe(
      "2026-09-20T00:00:00.000Z",
    );
    expect(() => dateOnlyValue("2026-09-31")).toThrow("Invalid date");
  });
});
