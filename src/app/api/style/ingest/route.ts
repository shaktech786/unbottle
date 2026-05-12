/**
 * POST /api/style/ingest
 *
 * MAIN-32 — Accepts an audio file, extracts tempo (BPM) and key signature,
 * then upserts those into the user's style profile.
 */

import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import { analyzeAudioFeatures } from "@/lib/style/analyze-audio-features";
import {
  mapStyleProfileRow,
  styleProfileToRow,
  type StyleProfileRow,
} from "@/lib/style/schema";

export const dynamic = "force-dynamic";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export async function POST(request: NextRequest) {
  try {
    // Auth guard
    let userId: string;
    if (supabaseConfigured) {
      const client = await createClient();
      const user = await requireAuth(client);
      userId = user.id;
    } else {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    // Parse multipart form — expects `audio` file field
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json(
        { error: "Request must be multipart/form-data" },
        { status: 400 },
      );
    }

    const audioBlob = formData.get("audio");
    if (!audioBlob || !(audioBlob instanceof Blob)) {
      return Response.json(
        { error: "audio field is required and must be a file" },
        { status: 400 },
      );
    }

    // Decode the audio server-side using Web Audio OfflineAudioContext
    const arrayBuffer = await audioBlob.arrayBuffer();

    // Decode via OfflineAudioContext (available in Node 18+ via web-streams or
    // in browsers). In a server environment without Web Audio, we fall back to
    // a minimal decode using a lightweight approach.
    let audioBuffer: AudioBuffer;
    try {
      // Try Web Audio (browser / edge runtime)
      const ctx = new OfflineAudioContext(1, 44100, 44100);
      audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    } catch {
      // Fallback: construct a minimal AudioBuffer from raw PCM if decode fails.
      // This path is only hit in environments without Web Audio.
      return Response.json(
        { error: "Audio decode unavailable in this runtime — upload from client instead" },
        { status: 422 },
      );
    }

    const features = analyzeAudioFeatures(audioBuffer);

    // Upsert style profile
    const client = await createClient();
    const profileId = `style-${userId}`;

    // Fetch existing profile (if any)
    const { data: existing } = await client
      .from("style_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const now = new Date().toISOString();

    if (existing) {
      const row = existing as StyleProfileRow;
      const existingProfile = mapStyleProfileRow(row);

      // Merge new key into keySignatures (deduplicate)
      const mergedKeys = Array.from(
        new Set([...existingProfile.keySignatures, features.key]),
      );

      // Expand tempo range to cover the detected BPM
      const newMin = Math.min(existingProfile.tempoRange[0], features.bpm);
      const newMax = Math.max(existingProfile.tempoRange[1], features.bpm);

      const { data: updated, error: updateError } = await client
        .from("style_profiles")
        .update({
          key_signatures: mergedKeys,
          tempo_min: newMin,
          tempo_max: newMax,
          updated_at: now,
        })
        .eq("id", profileId)
        .select()
        .single();

      if (updateError) throw updateError;
      return Response.json({
        profile: mapStyleProfileRow(updated as StyleProfileRow),
        features,
      });
    } else {
      // Create fresh profile
      const insertData = {
        id: profileId,
        updated_at: now,
        ...styleProfileToRow({
          userId,
          keySignatures: [features.key],
          tempoRange: [
            Math.max(20, features.bpm - 20),
            Math.min(300, features.bpm + 20),
          ],
          genres: [],
          vibes: [],
        }),
      };

      const { data: created, error: insertError } = await client
        .from("style_profiles")
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;
      return Response.json(
        {
          profile: mapStyleProfileRow(created as StyleProfileRow),
          features,
        },
        { status: 201 },
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
