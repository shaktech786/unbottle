// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UpgradeButton } from "./upgrade-button";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("UpgradeButton", () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, href: "" },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("redirects to the checkout URL on success", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ url: "https://checkout.stripe.com/session123" }),
      }),
    );

    render(<UpgradeButton />);
    await user.click(screen.getByRole("button", { name: "Upgrade to Pro" }));

    expect(fetch).toHaveBeenCalledWith("/api/billing/checkout", {
      method: "POST",
    });
    await waitFor(() => {
      expect(window.location.href).toBe(
        "https://checkout.stripe.com/session123",
      );
    });
  });

  it("shows an inline error when Stripe is not configured (503)", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error:
            "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRO_PRICE_ID to enable billing.",
        }),
      }),
    );

    render(<UpgradeButton />);
    await user.click(screen.getByRole("button", { name: "Upgrade to Pro" }));

    expect(
      await screen.findByText(
        "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRO_PRICE_ID to enable billing.",
      ),
    ).toBeInTheDocument();
    expect(window.location.href).toBe("");
  });

  it("shows a loading state while the request is pending", async () => {
    const user = userEvent.setup();
    let resolveFetch: (value: unknown) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      ),
    );

    render(<UpgradeButton />);
    const button = screen.getByRole("button", { name: "Upgrade to Pro" });
    await user.click(button);

    expect(
      screen.getByRole("button", { name: "Redirecting…" }),
    ).toBeDisabled();

    resolveFetch({
      ok: true,
      json: async () => ({ url: "https://checkout.stripe.com/session123" }),
    });

    await waitFor(() => {
      expect(window.location.href).toBe(
        "https://checkout.stripe.com/session123",
      );
    });
  });
});
