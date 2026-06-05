import { describe, it, expect } from "vitest";
import { formatDate } from "./format-date";

describe("formatDate", () => {
  it('formats YYYY-MM as "Mon YYYY"', () => {
    expect(formatDate("2021-06")).toBe("Jun 2021");
    expect(formatDate("2019-01")).toBe("Jan 2019");
    expect(formatDate("2010-12")).toBe("Dec 2010");
  });

  it('formats "present" (case-insensitive) as "Present"', () => {
    expect(formatDate("present")).toBe("Present");
    expect(formatDate("Present")).toBe("Present");
  });
});
