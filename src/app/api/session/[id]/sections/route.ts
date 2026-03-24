import { type NextRequest } from "next/server";
import {
  getSections as getSectionsMemory,
  addSection as addSectionMemory,
  deleteSection as deleteSectionMemory,
  updateSection as updateSectionMemory,
  clearAllSections as clearAllSectionsMemory,
} from "@/lib/session/store";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import {
  getSections as getSectionsDB,
  addSection as addSectionDB,
  deleteSection as deleteSectionDB,
  updateSection as updateSectionDB,
  clearAllSections as clearAllSectionsDB,
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

// DELETE /api/session/[id]/sections -- delete a section by sectionId in body,
// or delete ALL sections when { clearAll: true }
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { sectionId?: string; clearAll?: boolean };

  // --- Clear all sections ---
  if (body.clearAll) {
    if (supabaseConfigured) {
      try {
        const client = await createClient();
        await requireAuth(client);
        const count = await clearAllSectionsDB(client, id);
        return Response.json({ success: true, deleted: count });
      } catch (err) {
        if (err instanceof Error && err.message.includes("Not authenticated")) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        return Response.json(
          { error: "Failed to clear sections" },
          { status: 500 },
        );
      }
    }

    // In-memory fallback
    const count = clearAllSectionsMemory(id);
    return Response.json({ success: true, deleted: count });
  }

  // --- Delete a single section ---
  if (!body.sectionId) {
    return Response.json(
      { error: "sectionId or clearAll is required" },
      { status: 400 },
    );
  }

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      await requireAuth(client);
      const deleted = await deleteSectionDB(client, body.sectionId);
      if (!deleted) {
        return Response.json({ error: "Section not found" }, { status: 404 });
      }
      return Response.json({ success: true });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Not authenticated")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      return Response.json(
        { error: "Failed to delete section" },
        { status: 500 },
      );
    }
  }

  // In-memory fallback
  const deleted = deleteSectionMemory(id, body.sectionId);
  if (!deleted) {
    return Response.json({ error: "Section not found" }, { status: 404 });
  }
  return Response.json({ success: true });
}

// PATCH /api/session/[id]/sections -- update a section
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    sectionId?: string;
    updates?: Partial<Omit<Section, "id" | "sessionId">>;
  };

  if (!body.sectionId || !body.updates) {
    return Response.json(
      { error: "sectionId and updates are required" },
      { status: 400 },
    );
  }

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      await requireAuth(client);
      const updated = await updateSectionDB(client, body.sectionId, body.updates);
      if (!updated) {
        return Response.json({ error: "Section not found" }, { status: 404 });
      }
      return Response.json({ section: updated });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Not authenticated")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      return Response.json(
        { error: "Failed to update section" },
        { status: 500 },
      );
    }
  }

  // In-memory fallback
  const updated = updateSectionMemory(id, body.sectionId, body.updates);
  if (!updated) {
    return Response.json({ error: "Section not found" }, { status: 404 });
  }
  return Response.json({ section: updated });
}
