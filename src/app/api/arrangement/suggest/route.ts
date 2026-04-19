import { generateCompletion, getUserApiKey } from "@/lib/ai/claude";
import {
  buildMomentumPrompt,
  type MomentumSessionState,
} from "@/lib/ai/prompts/momentum";
import type { Suggestion } from "@/lib/music/types";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

interface SuggestRequestBody {
  sessionState: MomentumSessionState;
}

interface RawSuggestion {
  id?: string;
  label?: string;
  action?: string;
  category?: string;
}

const VALID_CATEGORIES: Suggestion["category"][] = [
  "arrangement",
  "instrument",
  "structure",
  "capture",
  "export",
  "general",
];

export async function POST(request: Request) {
  try {
    if (supabaseConfigured) {
      const client = await createClient();
      await requireAuth(client);
    }

    const body = (await request.json()) as SuggestRequestBody;
    const { sessionState } = body;

    if (!sessionState) {
      return Response.json(
        { error: "sessionState is required" },
        { status: 400 },
      );
    }

    const systemPrompt = buildMomentumPrompt(sessionState);

    const userApiKey = getUserApiKey(request);

    const rawResponse = await generateCompletion(
      systemPrompt,
      "Analyze my current session and suggest what I should do next.",
      2048,
      userApiKey,
    );

    const cleaned = rawResponse
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    let parsed: { suggestions?: RawSuggestion[]; nextStep?: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return Response.json(
        { error: "Failed to parse AI response as JSON" },
        { status: 502 },
      );
    }

    const suggestions: Suggestion[] = (parsed.suggestions ?? [])
      .filter(
        (raw): raw is Required<Pick<RawSuggestion, "label" | "action">> & RawSuggestion =>
          typeof raw.label === "string" && typeof raw.action === "string",
      )
      .map((raw, index) => ({
        id: raw.id ?? `suggestion-${index}`,
        label: raw.label,
        action: raw.action,
        category: VALID_CATEGORIES.includes(
          raw.category as Suggestion["category"],
        )
          ? (raw.category as Suggestion["category"])
          : "general",
      }));

    const nextStep =
      typeof parsed.nextStep === "string" && parsed.nextStep.trim().length > 0
        ? parsed.nextStep
        : suggestions[0]?.action ?? "Start by describing the vibe of your song.";

    return Response.json({ suggestions, nextStep });
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
