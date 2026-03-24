import { describe, it, expect } from "vitest";
import { clampVelocity, velocityToHeight, heightToVelocity } from "./velocity";

describe("clampVelocity", () => {
  it("returns value unchanged when within range", () => {
    expect(clampVelocity(64)).toBe(64);
    expect(clampVelocity(0)).toBe(0);
    expect(clampVelocity(127)).toBe(127);
  });

  it("clamps values below 0 to 0", () => {
    expect(clampVelocity(-1)).toBe(0);
    expect(clampVelocity(-100)).toBe(0);
  });

  it("clamps values above 127 to 127", () => {
    expect(clampVelocity(128)).toBe(127);
    expect(clampVelocity(255)).toBe(127);
    expect(clampVelocity(1000)).toBe(127);
  });

  it("rounds floating point values", () => {
    expect(clampVelocity(64.7)).toBe(65);
    expect(clampVelocity(64.2)).toBe(64);
  });
});

describe("velocityToHeight", () => {
  it("maps velocity 127 to maxHeight", () => {
    expect(velocityToHeight(127, 100)).toBe(100);
  });

  it("maps velocity 0 to 0", () => {
    expect(velocityToHeight(0, 100)).toBe(0);
  });

  it("maps mid velocity proportionally", () => {
    // ~50% velocity should give ~50% height
    const height = velocityToHeight(64, 200);
    expect(height).toBeCloseTo(100.79, 1); // 64/127 * 200
  });

  it("handles different maxHeight values", () => {
    expect(velocityToHeight(127, 50)).toBe(50);
    expect(velocityToHeight(127, 300)).toBe(300);
  });

  it("clamps out-of-range velocities before converting", () => {
    expect(velocityToHeight(200, 100)).toBe(100);
    expect(velocityToHeight(-10, 100)).toBe(0);
  });
});

describe("heightToVelocity", () => {
  it("maps maxHeight to 127", () => {
    expect(heightToVelocity(100, 100)).toBe(127);
  });

  it("maps 0 to 0", () => {
    expect(heightToVelocity(0, 100)).toBe(0);
  });

  it("maps mid height to mid velocity", () => {
    const velocity = heightToVelocity(50, 100);
    expect(velocity).toBeCloseTo(64, 0); // 50/100 * 127 = 63.5, rounded to 64
  });

  it("clamps result to 0-127 range", () => {
    expect(heightToVelocity(200, 100)).toBe(127);
    expect(heightToVelocity(-10, 100)).toBe(0);
  });

  it("round-trips with velocityToHeight", () => {
    for (const v of [0, 32, 64, 96, 127]) {
      const h = velocityToHeight(v, 100);
      const result = heightToVelocity(h, 100);
      expect(result).toBe(v);
    }
  });
});
