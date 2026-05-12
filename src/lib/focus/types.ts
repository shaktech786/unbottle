/**
 * Focus mode type definitions and default configs.
 * MAIN-56: Neurodivergent UX — focus mode profiles
 */

export type FocusModeId = "deep_work" | "quick_capture" | "review" | "off";

export interface FocusMode {
  id: FocusModeId;
  label: string;
  /** Panel IDs that should be hidden when this mode is active. */
  hiddenPanels: string[];
  /** Keyboard shortcut overrides for this mode. */
  shortcuts: Record<string, string>;
}

/**
 * Default focus mode configurations.
 *
 * Panel IDs correspond to the `data-panel` attributes in the session layout:
 *   "chat" | "arrangement" | "sequencer" | "capture" | "sheet-music" | "bookmarks"
 */
export const FOCUS_MODES: Record<FocusModeId, FocusMode> = {
  deep_work: {
    id: "deep_work",
    label: "Deep Work",
    // Hide chat and capture so the user stays in the arrangement
    hiddenPanels: ["chat", "capture", "bookmarks"],
    shortcuts: {
      "Space": "play-pause",
      "Escape": "clear-selection",
      "Ctrl+Z": "undo",
      "Ctrl+Shift+Z": "redo",
    },
  },
  quick_capture: {
    id: "quick_capture",
    label: "Quick Capture",
    // Show only capture + chat — hide arrangement complexity
    hiddenPanels: ["arrangement", "sequencer", "sheet-music"],
    shortcuts: {
      "Space": "record",
      "Escape": "stop-record",
      "Enter": "add-to-session",
    },
  },
  review: {
    id: "review",
    label: "Review",
    // Show everything — minimal hiding, read-only feel
    hiddenPanels: ["capture"],
    shortcuts: {
      "Space": "play-pause",
      "ArrowLeft": "step-back",
      "ArrowRight": "step-forward",
    },
  },
  off: {
    id: "off",
    label: "Off",
    hiddenPanels: [],
    shortcuts: {},
  },
};

export const DEFAULT_FOCUS_MODE: FocusModeId = "off";
