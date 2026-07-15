import { describe, it, expect } from "vitest";
import { isPublicRoute } from "./middleware";

/**
 * These routes were all redirecting signed-out visitors to /login in production
 * because the whitelist matched with exact equality, so no nested path could
 * ever be public. Nothing tested it, so nothing caught it.
 */
describe("isPublicRoute", () => {
  describe("routes that must be reachable without a session", () => {
    it.each([
      ["/", "landing"],
      ["/login", "login"],
      ["/signup", "signup"],
      ["/forgot-password", "forgot password"],
      ["/reset-password", "reset password"],
    ])("%s (%s)", (path) => {
      expect(isPublicRoute(path)).toBe(true);
    });

    // /signup links to these. Gating them behind auth means a user cannot read
    // the terms they are agreeing to.
    it.each([["/terms"], ["/privacy"], ["/cookies"]])(
      "%s is readable without an account",
      (path) => {
        expect(isPublicRoute(path)).toBe(true);
      },
    );

    // A share link is worthless if only its author can open it.
    it.each([
      ["/share/CU8Dy86RKa"],
      ["/share/abc123"],
      ["/share/some-slug/anything"],
    ])("%s is readable by a stranger", (path) => {
      expect(isPublicRoute(path)).toBe(true);
    });

    // The OAuth code arrives before any session cookie exists. Requiring a
    // session here means the code exchange never runs.
    it("/auth/callback runs before a session exists", () => {
      expect(isPublicRoute("/auth/callback")).toBe(true);
      expect(isPublicRoute("/auth/callback?code=abc123")).toBe(true);
    });

    // API routes authenticate individually; middleware-level auth on them is a
    // known Next.js footgun.
    it.each([["/api/chat"], ["/api/share/abc"], ["/api/webhooks/stripe"]])(
      "%s is left to the route's own auth",
      (path) => {
        expect(isPublicRoute(path)).toBe(true);
      },
    );
  });

  describe("routes that must still require a session", () => {
    it.each([
      ["/dashboard"],
      ["/sessions"],
      ["/settings"],
      ["/settings/billing"],
      ["/session/abc-123"],
      ["/session/new"],
    ])("%s stays private", (path) => {
      expect(isPublicRoute(path)).toBe(false);
    });

    // Prefix matching must not be loose enough to leak the private app. If "/"
    // were ever matched as a prefix every one of these would open up.
    it("does not treat a private path as public just because it starts with /", () => {
      expect(isPublicRoute("/dashboard")).toBe(false);
    });

    it("does not let a lookalike prefix through", () => {
      expect(isPublicRoute("/shared-secrets")).toBe(false);
      expect(isPublicRoute("/api-keys")).toBe(false);
      expect(isPublicRoute("/termsandconditions")).toBe(false);
    });
  });
});
