import { NextResponse } from "next/server";
import type { Note, Track } from "@/lib/music/types";
import { exportToMidi } from "@/lib/midi/writer";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import {
  getSession as getSessionDB,
  getTracks as getTracksDB,
  getSessionNotes,
} from "@/lib/supabase/db";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

interface ExportRequest {
  /** Session ID (for DB lookups when no inline data is provided). */
  sessionId?: string;
  /** Track IDs to include (optional -- exports all if omitted). */
  trackIds?: string[];
  /** Tracks to export (inline data -- takes precedence over DB). */
  tracks?: Track[];
  /** Notes to export (inline data -- takes precedence over DB). */
  notes?: Note[];
  /** Tempo. */
  bpm?: number;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as ExportRequest;

    let tracks = body.tracks ?? [];
    let notes = body.notes ?? [];
    let bpm = body.bpm ?? 120;

    // If no inline data but sessionId is provided, load from Supabase
    if (tracks.length === 0 && body.sessionId && supabaseConfigured) {
      const client = await createClient();
      await requireAuth(client);

      const session = await getSessionDB(client, body.sessionId);
      if (!session) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 },
        );
      }

      bpm = body.bpm ?? session.bpm;
      tracks = await getTracksDB(client, body.sessionId);
      notes = await getSessionNotes(client, body.sessionId);
    }

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
    if (err instanceof Error && err.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
