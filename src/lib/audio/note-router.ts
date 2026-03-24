import type { Note, Track, InstrumentType } from "@/lib/music/types";

export interface RoutedTrack {
  instrument: InstrumentType;
  notes: Note[];
  volume: number;
  pan: number;
}

/**
 * Groups notes by their trackId and associates each group with the correct
 * instrument type, volume, and pan from the tracks array.
 *
 * Respects mute/solo semantics:
 * - If ANY track has `solo: true`, only soloed tracks are included (solo overrides mute).
 * - Otherwise, muted tracks are excluded.
 * - Notes whose trackId doesn't match any track are dropped.
 */
export function routeNotesToTracks(
  notes: Note[],
  tracks: Track[],
): Map<string, RoutedTrack> {
  const result = new Map<string, RoutedTrack>();

  if (notes.length === 0 || tracks.length === 0) {
    return result;
  }

  // Build a lookup map of tracks by id
  const trackById = new Map<string, Track>();
  for (const track of tracks) {
    trackById.set(track.id, track);
  }

  // Determine whether solo mode is active (any track has solo: true)
  const hasSolo = tracks.some((t) => t.solo);

  // Determine which tracks are audible
  const audibleTrackIds = new Set<string>();
  for (const track of tracks) {
    if (hasSolo) {
      // Solo mode: only soloed tracks play, regardless of mute
      if (track.solo) {
        audibleTrackIds.add(track.id);
      }
    } else {
      // Normal mode: exclude muted tracks
      if (!track.muted) {
        audibleTrackIds.add(track.id);
      }
    }
  }

  // Group notes by trackId, filtering to audible tracks only
  for (const note of notes) {
    if (!audibleTrackIds.has(note.trackId)) continue;

    const track = trackById.get(note.trackId);
    if (!track) continue;

    let entry = result.get(note.trackId);
    if (!entry) {
      entry = {
        instrument: track.instrument,
        notes: [],
        volume: track.volume,
        pan: track.pan,
      };
      result.set(note.trackId, entry);
    }
    entry.notes.push(note);
  }

  return result;
}
