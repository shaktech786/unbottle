// Distribution stub — DistroKid does not provide a public API.
// This logs intent and returns a pending response directing the user to submit manually.

import type { ReleaseChecklist } from "./types";

export interface DistributeResult {
  status: "pending";
  message: string;
  distrokidUrl: string;
  prefillParams: Record<string, string>;
}

/**
 * Stub: "distribute" a release via DistroKid.
 *
 * DistroKid does not have a public API. This function logs the intent,
 * pre-fills what metadata is available, and returns instructions for
 * manual submission. The caller should surface the distrokidUrl to the user.
 */
export function distributeRelease(checklist: ReleaseChecklist): DistributeResult {
  console.info(
    "[unbottle] distributeRelease called for checklist",
    checklist.id,
    "— manual DistroKid submission required",
  );

  // Build a best-effort pre-fill param map from completed metadata steps
  const metadataSteps = checklist.steps.filter((s) => s.category === "metadata");
  const prefillParams: Record<string, string> = {};
  for (const step of metadataSteps) {
    if (step.notes) {
      prefillParams[step.id] = step.notes;
    }
  }

  return {
    status: "pending",
    message:
      "Manual submission required — DistroKid does not have a public API. " +
      "Use the link below to submit your release directly on DistroKid.",
    distrokidUrl: "https://distrokid.com/new",
    prefillParams,
  };
}
