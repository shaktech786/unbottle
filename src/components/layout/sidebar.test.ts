import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * NAV3 — Mobile navigation audit.
 * These tests verify the sidebar source contains the correct responsive
 * Tailwind classes for mobile behaviour without running in a browser.
 */

const sidebarSrc = readFileSync(
  resolve(__dirname, "sidebar.tsx"),
  "utf-8",
);

describe("Sidebar — mobile responsive classes (NAV3)", () => {
  it("hides sidebar on mobile by default (hidden class present)", () => {
    expect(sidebarSrc).toContain("hidden");
  });

  it("shows sidebar on md breakpoint (md:flex class present)", () => {
    expect(sidebarSrc).toContain("md:flex");
  });

  it("mobile overlay opens as fixed drawer (fixed inset-y-0)", () => {
    expect(sidebarSrc).toContain("fixed inset-y-0");
  });

  it("mobile overlay has a z-index for layering (z-50)", () => {
    expect(sidebarSrc).toContain("z-50");
  });

  it("mobile overlay backdrop has z-40", () => {
    expect(sidebarSrc).toContain("z-40");
  });

  it("mobile close handler is wired (onMobileClose)", () => {
    expect(sidebarSrc).toContain("onMobileClose");
  });

  it("collapsed state narrows sidebar on desktop (md:w-16)", () => {
    expect(sidebarSrc).toContain("md:w-16");
  });

  it("expanded state is wide on desktop (md:w-64)", () => {
    expect(sidebarSrc).toContain("md:w-64");
  });

  it("My Sessions link navigates to /sessions", () => {
    expect(sidebarSrc).toContain('"/sessions"');
  });
});
