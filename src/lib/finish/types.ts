// Finishing system domain types

import type { Session, Track } from "@/lib/music/types";
import type { DAWClip } from "@/lib/daw/state";

export type SessionType = "beat" | "song" | "sketch";

export interface FinishCriterion {
  id: string;
  label: string;
  /** Check function — returns true if the criterion is met */
  check: (ctx: FinishContext) => boolean;
}

export interface FinishCriteria {
  sessionType: SessionType;
  criteria: FinishCriterion[];
}

// ---------------------------------------------------------------------------
// Context passed to criterion checks
// ---------------------------------------------------------------------------

export interface FinishContext {
  session: Pick<Session, "bpm" | "keySignature" | "timeSignature">;
  tracks: Track[];
  clips: DAWClip[];
  /** Master peak level — 0.0 to 1.0+. Values > 1 indicate clipping. */
  masterPeakLevel?: number;
}

// ---------------------------------------------------------------------------
// Default finish criteria per session type
// ---------------------------------------------------------------------------

export const DEFAULT_FINISH_CRITERIA: Record<SessionType, FinishCriteria> = {
  beat: {
    sessionType: "beat",
    criteria: [
      {
        id: "beat-has-drums",
        label: "Has a drums track",
        check: ({ tracks }) => tracks.some((t) => t.instrument === "drums"),
      },
      {
        id: "beat-has-bass",
        label: "Has a bass track",
        check: ({ tracks }) =>
          tracks.some((t) => t.instrument === "bass_electric" || t.instrument === "bass_synth"),
      },
      {
        id: "beat-has-melody",
        label: "Has a melody/pad track",
        check: ({ tracks }) =>
          tracks.some(
            (t) =>
              !["drums", "bass_electric", "bass_synth"].includes(t.instrument),
          ),
      },
      {
        id: "beat-mix-level",
        label: "Mix level OK (master not clipping)",
        check: ({ masterPeakLevel }) =>
          masterPeakLevel !== undefined ? masterPeakLevel <= 1.0 : true,
      },
      {
        id: "beat-bpm-set",
        label: "BPM is set (not default 120)",
        check: ({ session }) => session.bpm !== 120,
      },
    ],
  },
  song: {
    sessionType: "song",
    criteria: [
      {
        id: "song-has-tracks",
        label: "Has at least 3 tracks",
        check: ({ tracks }) => tracks.length >= 3,
      },
      {
        id: "song-clips-named",
        label: "All clips are named",
        check: ({ clips }) =>
          clips.length > 0 && clips.every((c) => c.name !== "Clip" && c.name.trim() !== ""),
      },
      {
        id: "song-bpm-set",
        label: "BPM is set",
        check: ({ session }) => session.bpm > 0,
      },
      {
        id: "song-key-set",
        label: "Key signature is set",
        check: ({ session }) =>
          Boolean(session.keySignature) && session.keySignature !== "C",
      },
      {
        id: "song-mix-level",
        label: "Mix level OK (master not clipping)",
        check: ({ masterPeakLevel }) =>
          masterPeakLevel !== undefined ? masterPeakLevel <= 1.0 : true,
      },
    ],
  },
  sketch: {
    sessionType: "sketch",
    criteria: [
      {
        id: "sketch-has-tracks",
        label: "Has at least 1 track",
        check: ({ tracks }) => tracks.length >= 1,
      },
      {
        id: "sketch-has-clips",
        label: "Has at least 1 clip",
        check: ({ clips }) => clips.length >= 1,
      },
      {
        id: "sketch-bpm-set",
        label: "BPM is noted",
        check: ({ session }) => session.bpm > 0,
      },
    ],
  },
};
