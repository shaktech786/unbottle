/**
 * Client-side registry mapping contentRef keys to decoded AudioBuffers.
 *
 * Audio clips in the timeline store a contentRef string (e.g. "rec-123" or
 * the file name). The actual AudioBuffer lives here. This avoids serialising
 * large typed arrays into React state.
 */

const store = new Map<string, AudioBuffer>();

export const audioBufferStore = {
  set(key: string, buffer: AudioBuffer): void {
    store.set(key, buffer);
  },

  get(key: string): AudioBuffer | null {
    return store.get(key) ?? null;
  },

  has(key: string): boolean {
    return store.has(key);
  },

  delete(key: string): void {
    store.delete(key);
  },

  clear(): void {
    store.clear();
  },
};
