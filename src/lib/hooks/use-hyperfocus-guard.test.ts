import { describe, it, expect } from "vitest";
import {
  calcElapsedMinutes,
  hasReachedThreshold,
} from "./use-hyperfocus-guard";

describe("hyperfocus guard — pure time logic", () => {
  describe("calcElapsedMinutes", () => {
    it("returns 0 when start equals now", () => {
      const now = Date.now();
      expect(calcElapsedMinutes(now, now)).toBe(0);
    });

    it("returns correct minutes for exact elapsed time", () => {
      const start = 1_000_000;
      const now = start + 90 * 60 * 1000; // 90 minutes later
      expect(calcElapsedMinutes(start, now)).toBe(90);
    });

    it("floors partial minutes", () => {
      const start = 1_000_000;
      const now = start + 59 * 1000; // 59 seconds
      expect(calcElapsedMinutes(start, now)).toBe(0);
    });

    it("handles 45 minutes exactly", () => {
      const start = 0;
      const now = 45 * 60 * 1000;
      expect(calcElapsedMinutes(start, now)).toBe(45);
    });
  });

  describe("hasReachedThreshold", () => {
    it("returns false when elapsed < threshold", () => {
      expect(hasReachedThreshold(44, 45)).toBe(false);
    });

    it("returns true when elapsed equals threshold", () => {
      expect(hasReachedThreshold(45, 45)).toBe(true);
    });

    it("returns true when elapsed > threshold", () => {
      expect(hasReachedThreshold(60, 45)).toBe(true);
    });

    it("uses default threshold of 45 when not provided", () => {
      expect(hasReachedThreshold(45)).toBe(true);
      expect(hasReachedThreshold(44)).toBe(false);
    });
  });
});
