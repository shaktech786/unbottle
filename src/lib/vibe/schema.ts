/**
 * VibeInput — the user's feeling/vibe description that drives AI generation.
 * MAIN-51: Vibe input schema
 */

export interface VibeInput {
  mood: string;
  energy: 1 | 2 | 3 | 4 | 5;
  genre?: string;
  reference?: string;
  description?: string;
}

const VALID_ENERGY = new Set([1, 2, 3, 4, 5]);

export class VibeInputValidationError extends Error {
  constructor(public readonly field: string, message: string) {
    super(message);
    this.name = "VibeInputValidationError";
  }
}

export function validateVibeInput(raw: unknown): VibeInput {
  if (!raw || typeof raw !== "object") {
    throw new VibeInputValidationError("root", "VibeInput must be an object");
  }

  const input = raw as Record<string, unknown>;

  if (!input.mood || typeof input.mood !== "string" || !input.mood.trim()) {
    throw new VibeInputValidationError("mood", "mood is required and must be a non-empty string");
  }

  if (!VALID_ENERGY.has(input.energy as number)) {
    throw new VibeInputValidationError(
      "energy",
      "energy must be 1, 2, 3, 4, or 5",
    );
  }

  const vibe: VibeInput = {
    mood: input.mood.trim(),
    energy: input.energy as 1 | 2 | 3 | 4 | 5,
  };

  if (input.genre !== undefined) {
    if (typeof input.genre !== "string") {
      throw new VibeInputValidationError("genre", "genre must be a string");
    }
    vibe.genre = input.genre.trim() || undefined;
  }

  if (input.reference !== undefined) {
    if (typeof input.reference !== "string") {
      throw new VibeInputValidationError("reference", "reference must be a string");
    }
    vibe.reference = input.reference.trim() || undefined;
  }

  if (input.description !== undefined) {
    if (typeof input.description !== "string") {
      throw new VibeInputValidationError("description", "description must be a string");
    }
    vibe.description = input.description.trim() || undefined;
  }

  return vibe;
}
