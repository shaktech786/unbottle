// Export-readiness scoring for the Finishing System

import type { Session, Track } from "@/lib/music/types";
import type { DAWClip } from "@/lib/daw/state";

export interface ExportReadinessContext {
  session: Pick<Session, "bpm" | "keySignature" | "timeSignature">;
  tracks: Track[];
  clips: DAWClip[];
  /** Master peak level 0.0–1.0+. Values > 1 = clipping. Omit if unknown. */
  masterPeakLevel?: number;
}

export interface ExportReadinessResult {
  /** 0–100 */
  score: number;
  issues: string[];
}

interface Check {
  weight: number;
  issue: string;
  passes: (ctx: ExportReadinessContext) => boolean;
}

const CHECKS: Check[] = [
  {
    weight: 30,
    issue: "Master level is clipping — lower the master volume",
    passes: ({ masterPeakLevel }) =>
      masterPeakLevel === undefined || masterPeakLevel <= 1.0,
  },
  {
    weight: 20,
    issue: "Not all clips are named — rename default 'Clip' placeholders",
    passes: ({ clips }) =>
      clips.length === 0 ||
      clips.every((c) => c.name !== "Clip" && c.name.trim() !== ""),
  },
  {
    weight: 20,
    issue: "BPM is not set (still at default 120)",
    passes: ({ session }) => session.bpm !== 120,
  },
  {
    weight: 15,
    issue: "Key signature is not set",
    passes: ({ session }) =>
      Boolean(session.keySignature) && session.keySignature.trim() !== "",
  },
  {
    weight: 15,
    issue: "No tracks in session",
    passes: ({ tracks }) => tracks.length > 0,
  },
];

/**
 * Score a session's export readiness.
 *
 * Each check is weighted. A passing check contributes its weight to the total.
 * Final score = sum of passed weights, normalised to 0–100.
 */
export function scoreExportReadiness(
  ctx: ExportReadinessContext,
): ExportReadinessResult {
  const totalWeight = CHECKS.reduce((s, c) => s + c.weight, 0);
  const issues: string[] = [];
  let earnedWeight = 0;

  for (const check of CHECKS) {
    if (check.passes(ctx)) {
      earnedWeight += check.weight;
    } else {
      issues.push(check.issue);
    }
  }

  const score = Math.round((earnedWeight / totalWeight) * 100);
  return { score, issues };
}
