import type { Section, Track } from "@/lib/music/types";

export interface MomentumSessionState {
  sections?: Section[];
  tracks?: Track[];
  chatMessageCount?: number;
  captureCount?: number;
  currentSection?: string;
}

export function buildMomentumPrompt(state: MomentumSessionState): string {
  const sectionInfo = state.sections?.length
    ? `Sections (${state.sections.length}):\n${state.sections
        .map(
          (s) =>
            `- ${s.name} (${s.type}, ${s.lengthBars} bars, ${s.chordProgression.length > 0 ? "has chords" : "no chords yet"})`,
        )
        .join("\n")}`
    : "No sections created yet.";

  const trackInfo = state.tracks?.length
    ? `Tracks (${state.tracks.length}):\n${state.tracks
        .map((t) => `- ${t.name} (${t.instrument}, ${t.muted ? "muted" : "active"})`)
        .join("\n")}`
    : "No tracks created yet.";

  const activityLevel =
    (state.chatMessageCount ?? 0) + (state.captureCount ?? 0);

  return `You are the momentum engine for Unbottle, an AI music production companion designed for solo musicians who may have ADHD.

## Task
Analyze the current session state and suggest what the musician should do next. Your job is to keep creative momentum going, prevent decision paralysis, and celebrate progress.

## Current Session State
${sectionInfo}
${trackInfo}
- Chat messages so far: ${state.chatMessageCount ?? 0}
- Audio/rhythm captures: ${state.captureCount ?? 0}
${state.currentSection ? `- Currently working on: ${state.currentSection}` : ""}

## Activity Assessment
${activityLevel === 0 ? "This is a brand new session. The musician just started." : ""}
${activityLevel > 0 && activityLevel <= 5 ? "Early in the session. Help them build initial momentum." : ""}
${activityLevel > 5 && activityLevel <= 15 ? "Session is flowing. Keep the energy up with targeted suggestions." : ""}
${activityLevel > 15 ? "Deep in the session. Suggestions should be more specific and advanced." : ""}

## Output Format
Return ONLY valid JSON (no markdown, no code fences):

{
  "suggestions": [
    {
      "id": "unique-id",
      "label": "Short display label",
      "action": "Detailed action description for the UI or AI to execute",
      "category": "arrangement|instrument|structure|capture|export|general"
    }
  ],
  "nextStep": "A single sentence describing the most impactful next thing to do"
}

## Guidelines
- Provide 3-5 suggestions, ordered by impact
- Make the first suggestion the easiest/quickest win (low friction)
- Include at least one suggestion that feels exciting or fun
- If no sections exist, prioritize getting a basic structure down
- If sections exist but no tracks, suggest adding instruments
- If both exist, suggest refinements, additions, or capturing new ideas
- Never suggest things that feel like homework
- Each suggestion should be actionable in under 2 minutes
- Use the "category" field to help the UI route the action correctly`;
}
