import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import { parseExportJob } from "@/lib/export/schema";
import type { ExportFormat, BitDepth } from "@/lib/export/schema";

export const dynamic = "force-dynamic";

interface CreateJobBody {
  sessionId: string;
  format: ExportFormat;
  bitDepth?: BitDepth;
  stemsConfig?: string[];
}

// POST /api/export/jobs — create an export job record
export async function POST(request: Request): Promise<Response> {
  try {
    const client = await createClient();
    await requireAuth(client);

    const body = (await request.json()) as CreateJobBody;

    if (!body.sessionId || !body.format) {
      return Response.json(
        { error: "sessionId and format are required" },
        { status: 400 },
      );
    }

    const { data, error } = await client
      .from("export_jobs")
      .insert({
        session_id: body.sessionId,
        format: body.format,
        bit_depth: body.bitDepth ?? null,
        stems_config: body.stemsConfig ? JSON.stringify(body.stemsConfig) : null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    const job = parseExportJob({
      id: data.id,
      sessionId: data.session_id,
      format: data.format,
      bitDepth: data.bit_depth ?? undefined,
      stemsConfig: data.stems_config ? JSON.parse(data.stems_config) : undefined,
      status: data.status,
      outputUrl: data.output_url ?? undefined,
      errorMessage: data.error_message ?? undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });

    return Response.json({ job }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}

// GET /api/export/jobs?sessionId=xxx — list jobs for a session
export async function GET(request: Request): Promise<Response> {
  try {
    const client = await createClient();
    await requireAuth(client);

    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      return Response.json({ error: "sessionId query param required" }, { status: 400 });
    }

    const { data, error } = await client
      .from("export_jobs")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const jobs = (data ?? []).map((row) =>
      parseExportJob({
        id: row.id,
        sessionId: row.session_id,
        format: row.format,
        bitDepth: row.bit_depth ?? undefined,
        stemsConfig: row.stems_config ? JSON.parse(row.stems_config) : undefined,
        status: row.status,
        outputUrl: row.output_url ?? undefined,
        errorMessage: row.error_message ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }),
    );

    return Response.json({ jobs });
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
