/**
 * Audio file import utilities (MAIN-160).
 *
 * Decodes WAV, MP3, and FLAC files via Web Audio decodeAudioData and
 * registers the resulting AudioBuffer in audioBufferStore.
 */

import { audioBufferStore } from "./audio-buffer-store";

export const SUPPORTED_AUDIO_TYPES = [
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",        // MP3
  "audio/mp3",
  "audio/flac",
  "audio/x-flac",
] as const;

export const SUPPORTED_AUDIO_EXTENSIONS = [".wav", ".mp3", ".flac"] as const;

/** Returns true when the MIME type or file extension is one we can decode. */
export function isSupportedAudioFile(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (SUPPORTED_AUDIO_TYPES.some((t) => type.startsWith(t))) return true;
  return SUPPORTED_AUDIO_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export interface ImportResult {
  /** Key registered in audioBufferStore — use as clip.contentRef. */
  key: string;
  buffer: AudioBuffer;
  /** Sanitised file name (no extension). */
  name: string;
}

/**
 * Decode a File to an AudioBuffer and register it in the buffer store.
 *
 * @throws if the file type is unsupported or decoding fails.
 */
export async function importAudioFile(file: File): Promise<ImportResult> {
  if (!isSupportedAudioFile(file)) {
    throw new Error(
      `Unsupported file type: ${file.type || file.name}. Only WAV, MP3, and FLAC are supported.`,
    );
  }

  const arrayBuffer = await file.arrayBuffer();

  const ctx = new AudioContext();
  let buffer: AudioBuffer;
  try {
    buffer = await ctx.decodeAudioData(arrayBuffer);
  } finally {
    await ctx.close().catch(() => {});
  }

  // Build a stable key from the file name + timestamp
  const safeName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
  const key = `import-${safeName}-${Date.now()}`;

  audioBufferStore.set(key, buffer);

  return { key, buffer, name: safeName };
}

/**
 * Validate a list of dropped or selected files and return only the audio ones.
 */
export function filterAudioFiles(files: FileList | File[]): File[] {
  const arr = Array.from(files);
  return arr.filter(isSupportedAudioFile);
}
