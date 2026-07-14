/**
 * GET /api/style/profile — fetch the current user's style profile
 * PUT /api/style/profile — replace (upsert) the style profile
 */

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import {
  mapStyleProfileRow,
  styleProfileToRow,
  validateStyleProfile,
  createDefaultStyleProfile,
  type StyleProfileRow,
} from "@/lib/style/schema";

export const dynamic = "force-dynamic";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export async function GET() {
  if (!supabaseConfigured) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const client = await createClient();
    const user = await requireAuth(client);

    const { data, error } = await client
      .from("style_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return Response.json({ profile: null }, { status: 404 });
    }

    return Response.json({ profile: mapStyleProfileRow(data as StyleProfileRow) });
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

interface PutBody {
  keySignatures?: string[];
  tempoRange?: [number, number];
  genres?: string[];
  vibes?: string[];
}

export async function PUT(request: Request) {
  if (!supabaseConfigured) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const client = await createClient();
    const user = await requireAuth(client);

    const body = (await request.json()) as PutBody;

    const profileId = `style-${user.id}`;
    const now = new Date().toISOString();

    // Build the full profile for validation
    const incoming = createDefaultStyleProfile(user.id);
    if (body.keySignatures !== undefined) incoming.keySignatures = body.keySignatures;
    if (body.tempoRange !== undefined) incoming.tempoRange = body.tempoRange;
    if (body.genres !== undefined) incoming.genres = body.genres;
    if (body.vibes !== undefined) incoming.vibes = body.vibes;

    const validation = validateStyleProfile(incoming);
    if (!validation.valid) {
      return Response.json(
        { error: validation.errors.join("; ") },
        { status: 422 },
      );
    }

    const rowData = {
      id: profileId,
      updated_at: now,
      ...styleProfileToRow({
        userId: user.id,
        keySignatures: incoming.keySignatures,
        tempoRange: incoming.tempoRange,
        genres: incoming.genres,
        vibes: incoming.vibes,
      }),
    };

    const { data, error } = await client
      .from("style_profiles")
      .upsert(rowData, { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ profile: mapStyleProfileRow(data as StyleProfileRow) });
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
