import { NextResponse } from "next/server";
import type { Note, Track } from "@/lib/music/types";
import { exportToMidi } from "@/lib/midi/writer";

/**
 * In-memory session store.
 *
 * In production this would be replaced by a database query.
 * For MVP, the client can POST the track and note data directly
 * rather than referencing a session ID.
 */

interface ExportRequest {
  /** Session ID (for future DB lookups). */
  sessionId?: string;
  /** Track IDs to include (optional -- exports all if omitted). */
  trackIds?: string[];
  /** Tracks to export (inline data for MVP). */
  tracks?: Track[];
  /** Notes to export (inline data for MVP). */
  notes?: Note[];
  /** Tempo. */
  bpm?: number;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as ExportRequest;

    const tracks = body.tracks ?? [];
    let notes = body.notes ?? [];
    const bpm = body.bpm ?? 120;

    if (tracks.length === 0) {
      return NextResponse.json(
        { error: "No tracks provided" },
        { status: 400 },
      );
    }

    // Filter to requested trackIds if provided
    const trackIdsSet = body.trackIds
      ? new Set(body.trackIds)
      : null;

    const filteredTracks = trackIdsSet
      ? tracks.filter((t) => trackIdsSet.has(t.id))
      : tracks;

    if (filteredTracks.length === 0) {
      return NextResponse.json(
        { error: "No matching tracks found" },
        { status: 400 },
      );
    }

    // Filter notes to only include those belonging to the selected tracks
    const selectedTrackIds = new Set(filteredTracks.map((t) => t.id));
    notes = notes.filter((n) => selectedTrackIds.has(n.trackId));

    const midiBytes = exportToMidi(filteredTracks, notes, bpm);

    const filename = body.sessionId
      ? `unbottle-${body.sessionId}.mid`
      : "unbottle-export.mid";

    return new Response(midiBytes.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/midi",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(midiBytes.byteLength),
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
