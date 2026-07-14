import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Fixture: mock SSE response for /api/chat (suppress auto-kick AI call)
// ---------------------------------------------------------------------------
function buildDoneSseBody(): string {
  return `data: ${JSON.stringify({ type: "done" })}\n\n`;
}

// ---------------------------------------------------------------------------
// Browser-side init script injected before page load
//
// Mocks getUserMedia with an oscillator-backed MediaStream so MediaRecorder
// can capture real audio without a physical microphone.
// Mocks AudioContext.decodeAudioData to return a 1s C4 (261.63 Hz) sine
// wave, making pitch detection deterministic.
// ---------------------------------------------------------------------------
function buildAudioMockScript(): string {
  return `
    (function() {
      // Mock getUserMedia — returns a MediaStream from an AudioContext oscillator
      // so MediaRecorder gets real samples without a physical mic.
      const _origGetUM = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = async (constraints) => {
          const ctx = new AudioContext({ sampleRate: 44100 });
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = 261.63; // C4
          const dest = ctx.createMediaStreamDestination();
          osc.connect(dest);
          osc.start();
          return dest.stream;
        };
      }

      // Mock AudioContext.prototype.decodeAudioData so decodeBlobToMono
      // always returns a clean C4 sine wave regardless of blob content.
      const OrigAC = window.AudioContext || window.webkitAudioContext;
      if (OrigAC) {
        const origDecode = OrigAC.prototype.decodeAudioData;
        OrigAC.prototype.decodeAudioData = function(arrayBuffer, successCb, errorCb) {
          const sampleRate = 44100;
          const duration = 1; // 1 second of C4
          const buf = this.createBuffer(1, sampleRate * duration, sampleRate);
          const ch = buf.getChannelData(0);
          const freq = 261.63; // C4
          for (let i = 0; i < ch.length; i++) {
            ch[i] = Math.sin(2 * Math.PI * freq * i / sampleRate) * 0.9;
          }
          if (typeof successCb === 'function') successCb(buf);
          return Promise.resolve(buf);
        };
      }
    })();
  `;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("capture: record → pitch detect → piano roll", () => {
  test("hum transcription adds notes to the piano roll", async ({
    page,
    context,
  }) => {
    // Grant microphone permission so getUserMedia doesn't prompt/block
    await context.grantPermissions(["microphone"]);

    // Inject audio mocks before any page JS runs
    await page.addInitScript(buildAudioMockScript());

    // Suppress real AI calls from the session auto-kick
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: buildDoneSseBody(),
      });
    });

    // Avoid writing fake capture data to the test database
    await page.route(
      (url) => url.pathname.match(/\/api\/session\/[^/]+\/captures/) !== null,
      async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ captures: [] }),
          });
        } else {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ capture: { id: "e2e-cap-1" } }),
          });
        }
      },
    );

    // Provide a Vocal track so transcription doesn't fail even if the
    // fresh session has no tracks yet.
    await page.route(
      (url) => url.pathname.match(/\/api\/session\/[^/]+\/tracks/) !== null,
      async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({
              track: {
                id: "e2e-vocal-track",
                name: "Vocal",
                instrument: "piano",
              },
            }),
          });
        } else {
          await route.continue();
        }
      },
    );

    // ── 1. Navigate to dashboard ─────────────────────────────────────────────
    await page.goto("/dashboard");

    const justStartButton = page.getByText("Just Start", { exact: true });
    await expect(justStartButton).toBeVisible({ timeout: 15_000 });

    // ── 2. Open a new session ────────────────────────────────────────────────
    await justStartButton.click();
    await expect(page).toHaveURL(/\/session\/[^/]+$/, { timeout: 15_000 });
    await expect(page.getByText(/^Session:/)).toBeVisible({ timeout: 15_000 });

    // ── 3. Open the floating capture panel (desktop layout) ──────────────────
    const captureButton = page.getByLabel("Capture idea");
    await expect(captureButton).toBeVisible({ timeout: 10_000 });
    await captureButton.click();

    await expect(page.getByRole("heading", { name: "Capture" })).toBeVisible({
      timeout: 5_000,
    });

    // ── 4. Start recording ───────────────────────────────────────────────────
    const startBtn = page.getByLabel("Start recording");
    await expect(startBtn).toBeVisible({ timeout: 5_000 });
    await startBtn.click();

    // Recording indicator must appear
    await expect(page.getByLabel("Stop recording")).toBeVisible({
      timeout: 5_000,
    });

    // Let MediaRecorder collect at least one 100ms timeslice
    await page.waitForTimeout(250);

    // ── 5. Stop recording ────────────────────────────────────────────────────
    await page.getByLabel("Stop recording").click();

    // CapturePreview with "Transcribe to MIDI" button must appear
    await expect(page.getByText("Transcribe to MIDI")).toBeVisible({
      timeout: 5_000,
    });

    // ── 6. Transcribe to MIDI ────────────────────────────────────────────────
    await page.getByText("Transcribe to MIDI").click();

    // ── 7. Verify: notes added to the piano roll ─────────────────────────────
    // Success toast confirms pitch detection found at least one note
    await expect(page.getByText(/Transcribed \d+ notes/)).toBeVisible({
      timeout: 15_000,
    });

    // Sequencer is now visible — button label flips to "Hide Piano Roll"
    await expect(page.getByText("Hide Piano Roll")).toBeVisible({
      timeout: 10_000,
    });

    // The note count badge next to the toggle shows a non-zero number
    await expect(page.getByText(/\d+ notes/)).toBeVisible({ timeout: 5_000 });
  });
});
