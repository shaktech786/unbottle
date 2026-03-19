export function buildCaptureAnalysisPrompt(params: {
  type: "audio" | "tap" | "text";
  textDescription?: string;
  detectedPitches?: string[];
  detectedBpm?: number;
  sessionKey?: string;
  sessionGenre?: string;
}): string {
  if (params.type === "text") {
    return `You are an AI music producer analyzing a musician's description of their idea. Translate their description into concrete musical suggestions.

Their description: "${params.textDescription}"
${params.sessionKey ? `Current key: ${params.sessionKey}` : ""}
${params.sessionGenre ? `Genre: ${params.sessionGenre}` : ""}

Respond with ONLY valid JSON:
{
  "interpretation": "A brief summary of what you hear in their description",
  "suggestedKey": "Cm",
  "suggestedBpm": 128,
  "suggestedGenre": "dark electronic",
  "chordSuggestions": [
    { "chord": { "root": "C", "quality": "minor" }, "durationBars": 2 }
  ],
  "instrumentSuggestions": ["pad synth for atmosphere", "driving bass synth", "minimal hi-hats"],
  "structureSuggestion": "Start with a 4-bar atmospheric intro, build into an 8-bar verse with the driving bass",
  "references": "The dark minor key and driving bass suggest influences from Massive Attack, Portishead, or Thom Yorke's solo work"
}`;
  }

  if (params.type === "audio") {
    return `You are an AI music producer analyzing a captured audio recording (humming, singing, or playing).

Detected pitches: ${params.detectedPitches?.join(", ") || "none detected"}
${params.sessionKey ? `Current key: ${params.sessionKey}` : ""}
${params.sessionGenre ? `Genre: ${params.sessionGenre}` : ""}

Based on the detected pitches, analyze the musical content and suggest how to develop it.

Respond with ONLY valid JSON:
{
  "interpretation": "Description of the melodic/harmonic content",
  "suggestedKey": "C",
  "possibleChords": [
    { "chord": { "root": "C", "quality": "major" }, "durationBars": 1 }
  ],
  "melodySuggestion": "Description of how to develop the melody",
  "nextSteps": ["harmonize the melody", "add a counter-melody", "build a bass line from the root notes"]
}`;
  }

  // tap type
  return `You are an AI music producer analyzing a tapped rhythm pattern.

Detected BPM: ${params.detectedBpm || "unknown"}
${params.sessionGenre ? `Genre: ${params.sessionGenre}` : ""}

Based on the tempo, suggest musical directions.

Respond with ONLY valid JSON:
{
  "interpretation": "The tempo suggests a ${params.detectedBpm && params.detectedBpm > 140 ? "fast, energetic" : params.detectedBpm && params.detectedBpm > 100 ? "moderate, groovy" : "slow, atmospheric"} feel",
  "suggestedBpm": ${params.detectedBpm || 120},
  "genreSuggestions": ["genre1", "genre2"],
  "grooveSuggestion": "Description of a drum pattern that fits this tempo",
  "nextSteps": ["set the session BPM", "add a drum pattern", "start with a bass groove"]
}`;
}
