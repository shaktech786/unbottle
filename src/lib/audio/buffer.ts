// Shared in-memory audio buffer for local dev without Supabase.
// Both the upload and retrieval routes import from here so they share state.

export interface AudioBufferEntry {
  blob: Blob;
  sessionId: string;
  createdAt: string;
}

export const audioBuffer = new Map<string, AudioBufferEntry>();
