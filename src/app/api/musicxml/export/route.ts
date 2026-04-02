import { NextResponse } from "next/server";
import type { Note, Track } from "@/lib/music/types";
import { exportToMusicXML } from "@/lib/musicxml/writer";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import {
  getSession as getSessionDB,
  getTracks as getTracksDB,
  getSessionNotes,
} from "@/lib/supabase/db";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

interface ExportRequest {
  sessionId?: string;
  trackIds?: string[];
  tracks?: Track[];
  notes?: Note[];
  bpm?: number;
  keySignature?: string;
  timeSignature?: string;
  title?: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as ExportRequest;

    let tracks = body.tracks ?? [];
    let notes = body.notes ?? [];
    let bpm = body.bpm ?? 120;
    let keySignature = body.keySignature ?? "C major";
    let timeSignature = body.timeSignature ?? "4/4";
    let title = body.title ?? "Unbottle Export";

    // Load from Supabase if no inline data
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
      keySignature = body.keySignature ?? session.keySignature ?? "C major";
      timeSignature = body.timeSignature ?? session.timeSignature ?? "4/4";
      title = body.title ?? session.title ?? "Unbottle Export";
      tracks = await getTracksDB(client, body.sessionId);
      notes = await getSessionNotes(client, body.sessionId);
    }

    if (tracks.length === 0) {
      return NextResponse.json(
        { error: "No tracks provided" },
        { status: 400 },
      );
    }

    // Filter to requested trackIds
    const trackIdsSet = body.trackIds ? new Set(body.trackIds) : null;
    const filteredTracks = trackIdsSet
      ? tracks.filter((t) => trackIdsSet.has(t.id))
      : tracks;

    if (filteredTracks.length === 0) {
      return NextResponse.json(
        { error: "No matching tracks found" },
        { status: 400 },
      );
    }

    const selectedTrackIds = new Set(filteredTracks.map((t) => t.id));
    notes = notes.filter((n) => selectedTrackIds.has(n.trackId));

    const musicxml = exportToMusicXML(filteredTracks, notes, bpm, {
      title,
      keySignature,
      timeSignature,
    });

    const encoded = new TextEncoder().encode(musicxml);
    const filename = body.sessionId
      ? `unbottle-${body.sessionId}.musicxml`
      : "unbottle-export.musicxml";

    return new Response(encoded, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.recordare.musicxml+xml",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(encoded.byteLength),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
