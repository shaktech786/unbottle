// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { cleanup } from "@testing-library/react";
import { ShareButton } from "./share-button";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
});

describe("ShareButton", () => {
  it("POSTs to the plural /api/sessions/[id]/share route and shows the returned url", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://unbottle-rouge.vercel.app/share/abc123" }),
    } as Response);

    const user = userEvent.setup();
    render(<ShareButton sessionId="sess-1" initialIsShared={false} />);

    await user.click(screen.getByRole("button", { name: "Share" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/sessions/sess-1/share", {
        method: "POST",
      });
    });

    expect(await screen.findByRole("button", { name: "Shared" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
  });

  it("DELETEs the plural route to disable sharing and clears the share url", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const user = userEvent.setup();
    render(
      <ShareButton
        sessionId="sess-1"
        initialIsShared
        initialShareUrl="https://unbottle-rouge.vercel.app/share/abc123"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Shared" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/sessions/sess-1/share", {
        method: "DELETE",
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Copy link" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
  });

  it("does not update state when the enable request fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Forbidden" }),
    } as Response);

    const user = userEvent.setup();
    render(<ShareButton sessionId="sess-1" initialIsShared={false} />);

    await user.click(screen.getByRole("button", { name: "Share" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Shared" })).not.toBeInTheDocument();
  });
});
