import { test, expect } from "@playwright/test";

// Minimal Track matching the Track interface (sessionId is required by the type
// but the API only uses id, name, and instrument at export time).
const TRACK = {
  id: "e2e-track-1",
  sessionId: "e2e-session",
  name: "Piano",
  instrument: "piano",
  volume: 1,
  pan: 0,
  muted: false,
  solo: false,
  color: "#6366f1",
  sortOrder: 0,
};

// Three notes spanning two bars (PPQ=480, so 1 quarter = 480 ticks).
const NOTES = [
  {
    id: "n1",
    trackId: "e2e-track-1",
    pitch: "C4",
    startTick: 0,
    durationTicks: 480,
    velocity: 80,
  },
  {
    id: "n2",
    trackId: "e2e-track-1",
    pitch: "E4",
    startTick: 480,
    durationTicks: 480,
    velocity: 75,
  },
  {
    id: "n3",
    trackId: "e2e-track-1",
    pitch: "G4",
    startTick: 960,
    durationTicks: 960,
    velocity: 90,
  },
];

// MIDI magic bytes: "MThd" = 0x4d 0x54 0x68 0x64
const MIDI_MAGIC = Buffer.from([0x4d, 0x54, 0x68, 0x64]);

test.describe("MIDI export API", () => {
  test("produces a non-empty .mid file with correct header when given inline tracks and notes", async ({
    request,
  }) => {
    const response = await request.post("/api/midi/export", {
      data: {
        tracks: [TRACK],
        notes: NOTES,
        bpm: 120,
      },
    });

    expect(response.status()).toBe(200);

    // Content-Type must be audio/midi
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("audio/midi");

    // Content-Disposition must suggest a .mid filename
    const disposition = response.headers()["content-disposition"];
    expect(disposition).toMatch(/\.mid"/);

    const body = await response.body();

    // File must be non-empty
    expect(body.byteLength).toBeGreaterThan(0);

    // First 4 bytes must be the MIDI magic "MThd"
    const header = body.subarray(0, 4);
    expect(header).toEqual(MIDI_MAGIC);
  });

  test("returns 400 when no tracks are provided", async ({ request }) => {
    const response = await request.post("/api/midi/export", {
      data: { tracks: [], notes: [], bpm: 120 },
    });
    expect(response.status()).toBe(400);
  });

  test("exports only notes belonging to the requested trackIds", async ({
    request,
  }) => {
    const track2 = {
      ...TRACK,
      id: "e2e-track-2",
      name: "Bass",
      instrument: "bass_electric",
    };

    // Request only track1 even though track2 is present in the payload
    const response = await request.post("/api/midi/export", {
      data: {
        tracks: [TRACK, track2],
        notes: [
          ...NOTES,
          {
            id: "n4",
            trackId: "e2e-track-2",
            pitch: "C2",
            startTick: 0,
            durationTicks: 960,
            velocity: 100,
          },
        ],
        trackIds: ["e2e-track-1"],
        bpm: 120,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.body();
    expect(body.byteLength).toBeGreaterThan(0);
    expect(body.subarray(0, 4)).toEqual(MIDI_MAGIC);
  });
});

/**
 * UI-based export test.
 *
 * Skipped until auth can be seeded in the test environment. The structure
 * is correct and ready to enable once a test user + session fixture exists.
 *
 * To enable: provide TEST_SESSION_URL env var pointing to an authenticated
 * session page (e.g. http://localhost:3000/session/<id> with a valid cookie
 * injected via storageState).
 */
test.describe("MIDI export UI flow", () => {
  test.skip(
    !process.env.TEST_SESSION_URL,
    "Set TEST_SESSION_URL to run UI export tests",
  );

  test("clicking Export button downloads a .mid file", async ({ page }) => {
    const sessionUrl = process.env.TEST_SESSION_URL!;
    await page.goto(sessionUrl);

    // Wait for the workspace to be ready
    await page.waitForSelector("text=Export", { timeout: 15_000 });

    // Start waiting for the download before clicking (race-safe)
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /export/i }).click(),
    ]);

    // Wait for the Export Dialog to appear and click "Export MIDI"
    await page.waitForSelector("text=Export MIDI");
    const [midiDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /export midi/i }).click(),
    ]);

    const filename = midiDownload.suggestedFilename();
    expect(filename).toMatch(/\.mid$/);

    const path = await midiDownload.path();
    expect(path).toBeTruthy();

    // Read the downloaded file and check magic bytes
    const { readFileSync } = await import("fs");
    const bytes = readFileSync(path!);
    expect(bytes.length).toBeGreaterThan(0);
    expect(bytes.subarray(0, 4)).toEqual(MIDI_MAGIC);

    void download; // suppress unused warning (first download event was the dialog open, not a file)
  });
});
