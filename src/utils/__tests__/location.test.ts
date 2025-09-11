import { formatDistance } from "../location";

describe("formatDistance", () => {
  it("formats distances under 1 mile", () => {
    expect(formatDistance(0.4)).toBe("< 1 mi");
  });

  it("formats distances with one decimal under 10 miles", () => {
    expect(formatDistance(2.34)).toBe("2.3 mi");
  });

  it("rounds distances at or above 10 miles", () => {
    expect(formatDistance(10.49)).toBe("10 mi");
    expect(formatDistance(10.5)).toBe("11 mi");
  });
});
