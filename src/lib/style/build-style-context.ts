/**
 * MAIN-33 — Style-aware AI prompting.
 *
 * `buildStyleContext` converts a StyleProfile into a system prompt suffix
 * that is injected into existing AI arrangement/chat calls when a profile
 * exists for the user.
 */

import type { StyleProfile } from "./schema";

/**
 * Generate a system prompt suffix from a user's style profile.
 * Returns null when the profile is essentially empty (no useful data).
 */
export function buildStyleContext(profile: StyleProfile): string | null {
  const parts: string[] = [];

  if (profile.keySignatures.length > 0) {
    parts.push(`- Preferred keys: ${profile.keySignatures.join(", ")}`);
  }

  const [min, max] = profile.tempoRange;
  if (min !== 80 || max !== 140) {
    // Only include tempo when it's been customised from default
    parts.push(`- Comfortable tempo range: ${min}–${max} BPM`);
  }

  if (profile.genres.length > 0) {
    parts.push(`- Musical genres: ${profile.genres.join(", ")}`);
  }

  if (profile.vibes.length > 0) {
    parts.push(`- Creative vibes: ${profile.vibes.join(", ")}`);
  }

  if (parts.length === 0) return null;

  return `## User's Musical Style DNA\n${parts.join("\n")}\n\nWhen making suggestions, align with these preferences unless the user explicitly asks for something different.`;
}
