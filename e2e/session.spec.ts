import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Fixture: mock SSE response for /api/chat
// Returns an action event with generate_arrangement tool use, followed by a
// text token and a done event. No real Claude API is called in CI.
// ---------------------------------------------------------------------------

const MOCK_SECTIONS = [
  {
    name: "Intro",
    type: "intro",
    lengthBars: 4,
    chordProgression: [
      { chord: { root: "C", quality: "major" }, durationBars: 2 },
      { chord: { root: "G", quality: "major" }, durationBars: 2 },
    ],
  },
  {
    name: "Verse",
    type: "verse",
    lengthBars: 8,
    chordProgression: [
      { chord: { root: "C", quality: "major" }, durationBars: 2 },
      { chord: { root: "Am", quality: "minor" }, durationBars: 2 },
      { chord: { root: "F", quality: "major" }, durationBars: 2 },
      { chord: { root: "G", quality: "major" }, durationBars: 2 },
    ],
  },
  {
    name: "Chorus",
    type: "chorus",
    lengthBars: 8,
    chordProgression: [
      { chord: { root: "F", quality: "major" }, durationBars: 2 },
      { chord: { root: "C", quality: "major" }, durationBars: 2 },
      { chord: { root: "G", quality: "major" }, durationBars: 2 },
      { chord: { root: "Am", quality: "minor" }, durationBars: 2 },
    ],
  },
];

function buildMockSseBody(): string {
  const events: string[] = [
    // AI uses the generate_arrangement tool
    `data: ${JSON.stringify({
      type: "action",
      toolName: "generate_arrangement",
      toolInput: {
        key: "C",
        bpm: 120,
        sections: MOCK_SECTIONS,
      },
    })}\n\n`,
    // Follow-up text token after tool use
    `data: ${JSON.stringify({
      type: "token",
      content: "Here's your arrangement! Hit play to hear it.",
    })}\n\n`,
    // Stream finished
    `data: ${JSON.stringify({ type: "done" })}\n\n`,
  ];
  return events.join("");
}

// ---------------------------------------------------------------------------
// Tests — inherit global storageState (pre-authenticated user from global-setup)
// ---------------------------------------------------------------------------

test.describe("session: create → AI chat → arrangement", () => {
  test("Just Start creates a session and AI chat produces arrangement sections", async ({
    page,
  }) => {
    // Intercept all /api/chat requests and return the mock SSE response.
    // This prevents real Claude API calls in CI and makes the test deterministic.
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: buildMockSseBody(),
      });
    });

    // ── 1. Navigate to dashboard ──────────────────────────────────────────
    await page.goto("/dashboard");

    // Wait for the "Just Start" quick-start card to appear (only shown after
    // sessions have finished loading, so this also implies auth succeeded).
    const justStartButton = page.getByText("Just Start", { exact: true });
    await expect(justStartButton).toBeVisible({ timeout: 15_000 });

    // ── 2. Click "Just Start" → session workspace loads ───────────────────
    await justStartButton.click();

    // The dashboard creates a session then navigates to /session/<id>.
    await expect(page).toHaveURL(/\/session\/[^/]+$/, { timeout: 15_000 });

    // ── 3. Session workspace is ready ─────────────────────────────────────
    // The breadcrumb always renders "Session: <title>" once the workspace
    // context has loaded. We use this as the readiness gate.
    await expect(page.getByText(/^Session:/)).toBeVisible({ timeout: 15_000 });

    // The chat panel header is also a reliable readiness signal.
    await expect(
      page.getByRole("heading", { name: "Producer" }),
    ).toBeVisible({ timeout: 10_000 });

    // ── 4. The workspace auto-kicks an AI message for fresh sessions ──────
    // The session page auto-sends a kickoff message when it detects an empty
    // session (no sections, no notes). Wait for either:
    //   a) the Thinking... indicator to appear, or
    //   b) the arrangement sections to already be populated (if the auto-kick
    //      resolved before this assertion runs).
    //
    // We wait for the "Arrangement" heading, which is always present in the
    // ArrangementPanel regardless of section count.
    await expect(
      page.getByRole("heading", { name: "Arrangement" }),
    ).toBeVisible({ timeout: 10_000 });

    // ── 5. Manually send a message to the AI ─────────────────────────────
    // Even if the auto-kick already triggered, we verify the manual message
    // path works end-to-end.
    const chatTextarea = page.getByPlaceholder(
      "Describe what you're hearing in your head...",
    );
    await expect(chatTextarea).toBeVisible({ timeout: 10_000 });

    await chatTextarea.fill("Build me a 3-section arrangement with chord progressions");

    const sendButton = page.getByRole("button", { name: "Send message" });
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    // ── 6. AI responds ────────────────────────────────────────────────────
    // Wait for the mock's follow-up text token to appear in the message list.
    await expect(
      page.getByText("Here's your arrangement! Hit play to hear it."),
    ).toBeVisible({ timeout: 15_000 });

    // ── 7. Arrangement sections appear ────────────────────────────────────
    // The mock returns Intro, Verse, and Chorus sections. After the action
    // event is processed the ArrangementPanel switches from empty state to
    // showing section cards. Each section's name appears as visible text.
    await expect(page.getByText("Intro")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Verse")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Chorus")).toBeVisible({ timeout: 10_000 });
  });
});
