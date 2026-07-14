import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReaperBackend, ReaperBridgeError } from "./reaper-backend";

describe("ReaperBackend", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("ping()", () => {
    it("returns false when fetch throws (bridge not running)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
      const backend = new ReaperBackend("localhost", 9000);
      expect(await backend.ping()).toBe(false);
    });

    it("returns false when response is not ok", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 503 }),
      );
      const backend = new ReaperBackend("localhost", 9000);
      expect(await backend.ping()).toBe(false);
    });

    it("returns true when /ping responds 200", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true }),
      );
      const backend = new ReaperBackend("localhost", 9000);
      expect(await backend.ping()).toBe(true);
    });
  });

  describe("rpc methods", () => {
    it("throws ReaperBridgeError on non-ok HTTP response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
        }),
      );
      const backend = new ReaperBackend("localhost", 9000);
      await expect(backend.setTempo({ bpm: 120 })).rejects.toThrow(ReaperBridgeError);
    });

    it("throws ReaperBridgeError when fetch fails (network error)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
      const backend = new ReaperBackend("localhost", 9000);
      await expect(backend.createTrack({ name: "Bass" })).rejects.toThrow(ReaperBridgeError);
    });

    it("throws ReaperBridgeError when JSON-RPC returns error field", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ error: { code: -32601, message: "Method not found" } }),
        }),
      );
      const backend = new ReaperBackend("localhost", 9000);
      const err = await backend.createTrack({ name: "Synth" }).catch((e) => e);
      expect(err).toBeInstanceOf(ReaperBridgeError);
      expect((err as ReaperBridgeError).code).toBe(-32601);
    });

    it("returns DAWToolResult with state_delta on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ result: { bpm: 140 } }),
        }),
      );
      const backend = new ReaperBackend("localhost", 9000);
      const result = await backend.setTempo({ bpm: 140 });
      expect(result.success).toBe(true);
      expect(result.state_delta).toEqual({ bpm: 140 });
    });
  });
});
