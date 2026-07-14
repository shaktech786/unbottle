/**
 * SessionHealthScore — computed health gauge for the current session.
 * MAIN-59
 *
 * Score 0-100:
 *   - Increases with flow minutes and meaningful edits
 *   - Decreases with interruption count
 */

export interface SessionHealthScore {
  flowMinutes: number;
  interruptionCount: number;
  meaningfulEdits: number;
  score: number; // 0-100
}

/**
 * Weights:
 *   - Each minute of uninterrupted flow: +1.5 (cap at 60 pts from flow alone)
 *   - Each meaningful edit (note add/remove/move): +2 (cap at 30 pts)
 *   - Each interruption: -8 (floor at 0)
 */
export function computeHealthScore(params: {
  flowMinutes: number;
  interruptionCount: number;
  meaningfulEdits: number;
}): number {
  const flowScore = Math.min(60, params.flowMinutes * 1.5);
  const editScore = Math.min(30, params.meaningfulEdits * 2);
  const interruptionPenalty = params.interruptionCount * 8;

  const raw = flowScore + editScore - interruptionPenalty;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function buildHealthScore(params: {
  flowMinutes: number;
  interruptionCount: number;
  meaningfulEdits: number;
}): SessionHealthScore {
  return {
    ...params,
    score: computeHealthScore(params),
  };
}

/** Classify a score into a label for display. */
export function healthScoreLabel(score: number): string {
  if (score >= 80) return "In the Zone";
  if (score >= 55) return "Good Flow";
  if (score >= 35) return "Getting There";
  if (score >= 15) return "Distracted";
  return "Off Track";
}

/** Color class for the gauge. */
export function healthScoreColor(score: number): string {
  if (score >= 80) return "#10b981"; // emerald
  if (score >= 55) return "#6366f1"; // violet
  if (score >= 35) return "#f59e0b"; // amber
  return "#ef4444"; // red
}
