/**
 * MAIN-31 — Style profile schema
 *
 * TypeScript types and Zod-free validation for a user's musical style DNA.
 */

export interface StyleProfile {
  id: string;
  userId: string;
  keySignatures: string[];
  /** Tempo range as [min, max] BPM. */
  tempoRange: [number, number];
  genres: string[];
  vibes: string[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Validation (no runtime Zod dependency — manual guards)
// ---------------------------------------------------------------------------

export interface StyleProfileValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_NOTE_NAMES = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"];
const VALID_KEY_MODES = ["major", "minor", "dorian", "mixolydian", "phrygian", "lydian", "locrian"];

function isValidKeySignature(key: string): boolean {
  // Accepts patterns like "C major", "G# minor", "Bb dorian"
  const parts = key.trim().split(/\s+/);
  if (parts.length !== 2) return false;
  const [note, mode] = parts;
  return VALID_NOTE_NAMES.includes(note) && VALID_KEY_MODES.includes(mode.toLowerCase());
}

/**
 * Validate a StyleProfile object.
 * Returns { valid: true } when all fields pass, or an error list otherwise.
 */
export function validateStyleProfile(data: unknown): StyleProfileValidationResult {
  const errors: string[] = [];

  if (typeof data !== "object" || data === null) {
    return { valid: false, errors: ["StyleProfile must be an object"] };
  }

  const p = data as Record<string, unknown>;

  if (typeof p.id !== "string" || !p.id.trim()) {
    errors.push("id: must be a non-empty string");
  }

  if (typeof p.userId !== "string" || !p.userId.trim()) {
    errors.push("userId: must be a non-empty string");
  }

  if (!Array.isArray(p.keySignatures)) {
    errors.push("keySignatures: must be an array");
  } else {
    const invalid = (p.keySignatures as unknown[]).filter(
      (k) => typeof k !== "string" || !isValidKeySignature(k as string),
    );
    if (invalid.length > 0) {
      errors.push(`keySignatures: invalid entries: ${invalid.join(", ")}. Expected format: "C major", "G minor", etc.`);
    }
  }

  if (!Array.isArray(p.tempoRange) || p.tempoRange.length !== 2) {
    errors.push("tempoRange: must be an array of exactly 2 numbers [min, max]");
  } else {
    const [min, max] = p.tempoRange as unknown[];
    if (typeof min !== "number" || typeof max !== "number") {
      errors.push("tempoRange: both values must be numbers");
    } else if (min < 20 || max > 400) {
      errors.push("tempoRange: values must be between 20 and 400 BPM");
    } else if (min > max) {
      errors.push("tempoRange: min must be <= max");
    }
  }

  if (!Array.isArray(p.genres)) {
    errors.push("genres: must be an array of strings");
  } else if ((p.genres as unknown[]).some((g) => typeof g !== "string")) {
    errors.push("genres: all entries must be strings");
  }

  if (!Array.isArray(p.vibes)) {
    errors.push("vibes: must be an array of strings");
  } else if ((p.vibes as unknown[]).some((v) => typeof v !== "string")) {
    errors.push("vibes: all entries must be strings");
  }

  if (typeof p.updatedAt !== "string" || !p.updatedAt.trim()) {
    errors.push("updatedAt: must be a non-empty ISO date string");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Create a default empty StyleProfile for a user.
 */
export function createDefaultStyleProfile(userId: string): StyleProfile {
  return {
    id: `style-${userId}`,
    userId,
    keySignatures: [],
    tempoRange: [80, 140],
    genres: [],
    vibes: [],
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Row mapping (Supabase → StyleProfile)
// ---------------------------------------------------------------------------

export interface StyleProfileRow {
  id: string;
  user_id: string;
  key_signatures: string[];
  tempo_min: number;
  tempo_max: number;
  genres: string[];
  vibes: string[];
  updated_at: string;
}

export function mapStyleProfileRow(row: StyleProfileRow): StyleProfile {
  return {
    id: row.id,
    userId: row.user_id,
    keySignatures: row.key_signatures ?? [],
    tempoRange: [row.tempo_min ?? 80, row.tempo_max ?? 140],
    genres: row.genres ?? [],
    vibes: row.vibes ?? [],
    updatedAt: row.updated_at,
  };
}

export function styleProfileToRow(
  profile: Omit<StyleProfile, "id" | "updatedAt">,
): Omit<StyleProfileRow, "id" | "updated_at"> {
  return {
    user_id: profile.userId,
    key_signatures: profile.keySignatures,
    tempo_min: profile.tempoRange[0],
    tempo_max: profile.tempoRange[1],
    genres: profile.genres,
    vibes: profile.vibes,
  };
}
