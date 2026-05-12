import { describe, it, expect } from "vitest";
import {
  clampCC,
  upsertCCPoint,
  moveCCPoint,
  removeCCPoint,
  interpolateCCValue,
  type CCPoint,
} from "./cc-lane";
import { PPQ } from "./types";

describe("clampCC", () => {
  it("clamps below 0 to 0", () => expect(clampCC(-5)).toBe(0));
  it("clamps above 127 to 127", () => expect(clampCC(200)).toBe(127));
  it("rounds fractional values", () => expect(clampCC(64.7)).toBe(65));
  it("passes through valid range unchanged", () => {
    expect(clampCC(0)).toBe(0);
    expect(clampCC(64)).toBe(64);
    expect(clampCC(127)).toBe(127);
  });
});

describe("upsertCCPoint", () => {
  const base: CCPoint[] = [
    { tick: 0, value: 0 },
    { tick: PPQ * 4, value: 64 },
  ];

  it("appends a new point and sorts by tick", () => {
    const result = upsertCCPoint(base, PPQ * 2, 100);
    expect(result).toHaveLength(3);
    expect(result[1].tick).toBe(PPQ * 2);
    expect(result[1].value).toBe(100);
  });

  it("updates existing point within snap tolerance", () => {
    const result = upsertCCPoint(base, 5, 42, 10);
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(42);
    expect(result[0].tick).toBe(0); // tick unchanged
  });

  it("clamps inserted value to 0–127", () => {
    const result = upsertCCPoint(base, PPQ, 200);
    const newPt = result.find((p) => p.tick === PPQ);
    expect(newPt?.value).toBe(127);
  });

  it("result is always sorted by tick", () => {
    const pts: CCPoint[] = [{ tick: PPQ * 3, value: 50 }];
    const result = upsertCCPoint(pts, PPQ, 80);
    expect(result[0].tick).toBeLessThan(result[1].tick);
  });
});

describe("moveCCPoint", () => {
  const base: CCPoint[] = [
    { tick: 0, value: 10 },
    { tick: PPQ * 2, value: 80 },
    { tick: PPQ * 4, value: 40 },
  ];

  it("moves a point to a new tick and value", () => {
    const result = moveCCPoint(base, 1, PPQ * 3, 90);
    const moved = result.find((p) => p.value === 90);
    expect(moved?.tick).toBe(PPQ * 3);
  });

  it("result remains sorted after move", () => {
    const result = moveCCPoint(base, 2, PPQ, 30);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].tick).toBeGreaterThanOrEqual(result[i - 1].tick);
    }
  });

  it("clamps negative tick to 0", () => {
    const result = moveCCPoint(base, 0, -100, 64);
    expect(result[0].tick).toBe(0);
  });
});

describe("removeCCPoint", () => {
  const base: CCPoint[] = [
    { tick: 0, value: 0 },
    { tick: PPQ, value: 64 },
    { tick: PPQ * 2, value: 127 },
  ];

  it("removes the point at the given index", () => {
    const result = removeCCPoint(base, 1);
    expect(result).toHaveLength(2);
    expect(result.find((p) => p.tick === PPQ)).toBeUndefined();
  });

  it("handles removing the last remaining point", () => {
    const result = removeCCPoint([base[0]], 0);
    expect(result).toHaveLength(0);
  });
});

describe("interpolateCCValue", () => {
  const points: CCPoint[] = [
    { tick: 0, value: 0 },
    { tick: PPQ * 4, value: 127 },
  ];

  it("returns 0 for empty points list", () => {
    expect(interpolateCCValue([], PPQ)).toBe(0);
  });

  it("returns first value before first point", () => {
    expect(interpolateCCValue(points, -100)).toBe(0);
  });

  it("returns last value after last point", () => {
    expect(interpolateCCValue(points, PPQ * 10)).toBe(127);
  });

  it("interpolates midpoint to approximately half of 127", () => {
    const mid = interpolateCCValue(points, PPQ * 2);
    // 127 * 0.5 = 63.5, rounds to 64
    expect(mid).toBeGreaterThanOrEqual(63);
    expect(mid).toBeLessThanOrEqual(64);
  });

  it("returns exact value at a known point", () => {
    expect(interpolateCCValue(points, 0)).toBe(0);
    expect(interpolateCCValue(points, PPQ * 4)).toBe(127);
  });

  it("handles three-point curve with non-linear segments", () => {
    const threePoints: CCPoint[] = [
      { tick: 0, value: 0 },
      { tick: PPQ * 2, value: 100 },
      { tick: PPQ * 4, value: 50 },
    ];
    expect(interpolateCCValue(threePoints, PPQ * 1)).toBeCloseTo(50, 0);
    expect(interpolateCCValue(threePoints, PPQ * 3)).toBeCloseTo(75, 0);
  });
});
