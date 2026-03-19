/**
 * Builds a rich music generation prompt from session context parameters.
 *
 * Example output:
 *   "Lo-fi hip hop instrumental, chill and dreamy mood, 85 BPM, key of C minor,
 *    soft piano, vinyl crackle, muted drums"
 */

export interface MusicPromptParams {
  description?: string;
  genre?: string;
  mood?: string;
  bpm?: number;
  keySignature?: string;
  instruments?: string[];
  sectionType?: string; // "verse", "chorus", etc.
}

export function buildMusicPrompt(params: MusicPromptParams): string {
  const parts: string[] = [];

  // Genre first (most important for style)
  if (params.genre) {
    parts.push(params.genre);
  }

  // Section type context
  if (params.sectionType) {
    const sectionLabel = formatSectionType(params.sectionType);
    parts.push(`${sectionLabel} section`);
  }

  // Free-form description
  if (params.description) {
    parts.push(params.description);
  }

  // Mood
  if (params.mood) {
    parts.push(`${params.mood} mood`);
  }

  // BPM
  if (params.bpm) {
    parts.push(`${params.bpm} BPM`);
  }

  // Key signature
  if (params.keySignature) {
    parts.push(`key of ${params.keySignature}`);
  }

  // Instruments
  if (params.instruments && params.instruments.length > 0) {
    parts.push(params.instruments.join(", "));
  }

  // Fallback if nothing was provided
  if (parts.length === 0) {
    return "ambient instrumental music, atmospheric and cinematic";
  }

  return parts.join(", ");
}

function formatSectionType(type: string): string {
  const map: Record<string, string> = {
    intro: "intro",
    verse: "verse",
    pre_chorus: "pre-chorus",
    chorus: "chorus",
    bridge: "bridge",
    outro: "outro",
    breakdown: "breakdown",
    custom: "custom",
  };
  return map[type] ?? type;
}
