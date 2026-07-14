import { describe, it, expect } from "vitest";
import { buildProducerSystemPrompt } from "./producer";

function baseSession() {
  return {
    bpm: 120,
    keySignature: "C major",
    timeSignature: "4/4",
  };
}

describe("buildProducerSystemPrompt", () => {
  it("documents generate_notation as a tool the AI can use", () => {
    const prompt = buildProducerSystemPrompt(baseSession());
    expect(prompt).toContain("generate_notation");
  });

  it("instructs the AI that generate_arrangement alone does not produce playable notes", () => {
    const prompt = buildProducerSystemPrompt(baseSession());
    expect(prompt.toLowerCase()).toContain("does not put playable notes");
  });

  it("includes a critical rule requiring generate_notation after building sections/tracks", () => {
    const prompt = buildProducerSystemPrompt(baseSession());
    const criticalRulesSection = prompt.slice(prompt.indexOf("CRITICAL RULES"));
    expect(criticalRulesSection).toContain("generate_notation");
  });
});
