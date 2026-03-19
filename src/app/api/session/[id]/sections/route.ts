import { type NextRequest } from "next/server";
import {
  getSections as getSectionsMemory,
  addSection as addSectionMemory,
} from "@/lib/session/store";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import {
  getSections as getSectionsDB,
  addSection as addSectionDB,
} from "@/lib/supabase/db";
import type { Section } from "@/lib/music/types";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export const dynamic = "force-dynamic";

// GET /api/session/[id]/sections -- list sections
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      await requireAuth(client);
      const sections = await getSectionsDB(client, id);
      return Response.json({ sections });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Not authenticated")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      return Response.json({ sections: [] });
    }
  }

  const sections = getSectionsMemory(id);
  return Response.json({ sections });
}

// POST /api/session/[id]/sections -- add one or more sections
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    sections?: Omit<Section, "id" | "sessionId">[];
  };

  if (!body.sections?.length) {
    return Response.json(
      { error: "sections array is required" },
      { status: 400 },
    );
  }

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      await requireAuth(client);

      const created: Section[] = [];
      for (const s of body.sections) {
        const section = await addSectionDB(client, id, s);
        created.push(section);
      }
      return Response.json({ sections: created }, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Not authenticated")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      return Response.json(
        { error: "Failed to save sections" },
        { status: 500 },
      );
    }
  }

  // In-memory fallback
  const created: Section[] = [];
  for (const s of body.sections) {
    const section = addSectionMemory(id, s);
    created.push(section);
  }
  return Response.json({ sections: created }, { status: 201 });
}
