import { describe, it, expect } from "vitest";
import { parseSSELines, splitSSEBuffer, type SSEEvent } from "./stream-parser";

describe("parseSSELines", () => {
  it("parses a single token event", () => {
    const lines = ['data: {"type":"token","content":"Hello"}', ""];
    const events = parseSSELines(lines);
    expect(events).toEqual([{ type: "token", content: "Hello" }]);
  });

  it("parses a done event", () => {
    const lines = ['data: {"type":"done"}', ""];
    const events = parseSSELines(lines);
    expect(events).toEqual([{ type: "done" }]);
  });

  it("parses an error event with content", () => {
    const lines = ['data: {"type":"error","content":"Something broke"}', ""];
    const events = parseSSELines(lines);
    expect(events).toEqual([{ type: "error", content: "Something broke" }]);
  });

  it("parses an action event with tool name and input", () => {
    const lines = [
      'data: {"type":"action","toolName":"update_session","toolInput":{"bpm":140}}',
      "",
    ];
    const events = parseSSELines(lines);
    expect(events).toEqual([
      {
        type: "action",
        toolName: "update_session",
        toolInput: { bpm: 140 },
      },
    ]);
  });

  it("parses multiple events from multiple lines", () => {
    const lines = [
      'data: {"type":"token","content":"Hi"}',
      "",
      'data: {"type":"token","content":" there"}',
      "",
      'data: {"type":"done"}',
      "",
    ];
    const events = parseSSELines(lines);
    expect(events).toHaveLength(3);
    expect(events[0]).toEqual({ type: "token", content: "Hi" });
    expect(events[1]).toEqual({ type: "token", content: " there" });
    expect(events[2]).toEqual({ type: "done" });
  });

  it("skips lines that don't start with 'data: '", () => {
    const lines = [
      "event: message",
      'data: {"type":"token","content":"ok"}',
      "",
      ": this is a comment",
      "",
    ];
    const events = parseSSELines(lines);
    expect(events).toEqual([{ type: "token", content: "ok" }]);
  });

  it("skips lines with invalid JSON", () => {
    const lines = [
      "data: {not valid json}",
      "",
      'data: {"type":"token","content":"valid"}',
      "",
    ];
    const events = parseSSELines(lines);
    expect(events).toEqual([{ type: "token", content: "valid" }]);
  });

  it("handles empty input", () => {
    const events = parseSSELines([]);
    expect(events).toEqual([]);
  });

  it("handles lines with only whitespace", () => {
    const lines = ["  ", "   ", ""];
    const events = parseSSELines(lines);
    expect(events).toEqual([]);
  });
});

describe("SSEEvent type discrimination", () => {
  it("token events have content", () => {
    const events = parseSSELines([
      'data: {"type":"token","content":"word"}',
      "",
    ]);
    const event = events[0] as SSEEvent;
    expect(event.type).toBe("token");
    expect(event.content).toBe("word");
  });

  it("action events have toolName and toolInput", () => {
    const events = parseSSELines([
      'data: {"type":"action","toolName":"add_track","toolInput":{"name":"Bass","instrument":"bass_synth"}}',
      "",
    ]);
    const event = events[0] as SSEEvent;
    expect(event.type).toBe("action");
    expect(event.toolName).toBe("add_track");
    expect(event.toolInput).toEqual({
      name: "Bass",
      instrument: "bass_synth",
    });
  });
});

describe("buffer handling with splitSSEBuffer", () => {
  it("splits a complete buffer into lines and empty remainder", () => {
    const input = 'data: {"type":"token","content":"hi"}\n\n';
    const { lines, remainder } = splitSSEBuffer(input);
    expect(lines).toEqual(['data: {"type":"token","content":"hi"}', ""]);
    expect(remainder).toBe("");
  });

  it("returns incomplete data as remainder", () => {
    const input = 'data: {"type":"tok';
    const { lines, remainder } = splitSSEBuffer(input);
    expect(lines).toEqual([]);
    expect(remainder).toBe('data: {"type":"tok');
  });

  it("handles multi-chunk streaming correctly", () => {
    // Simulate two chunks arriving
    const chunk1 = 'data: {"type":"token","content":"Hel';
    const chunk2 = 'lo"}\n\ndata: {"type":"done"}\n\n';

    const result1 = splitSSEBuffer(chunk1);
    expect(result1.lines).toEqual([]);
    expect(result1.remainder).toBe(chunk1);

    // Feed remainder + next chunk
    const result2 = splitSSEBuffer(result1.remainder + chunk2);
    expect(result2.lines).toEqual([
      'data: {"type":"token","content":"Hello"}',
      "",
      'data: {"type":"done"}',
      "",
    ]);
    expect(result2.remainder).toBe("");
  });

  it("preserves data across multiple incomplete chunks", () => {
    const chunk1 = 'data: {"type":"toke';
    const chunk2 = 'n","content":"a';
    const chunk3 = 'bc"}\n\n';

    let { remainder } = splitSSEBuffer(chunk1);
    expect(remainder).toBe(chunk1);

    ({ remainder } = splitSSEBuffer(remainder + chunk2));
    expect(remainder).toBe(chunk1 + chunk2);

    const result = splitSSEBuffer(remainder + chunk3);
    expect(result.lines).toEqual([
      'data: {"type":"token","content":"abc"}',
      "",
    ]);
    expect(result.remainder).toBe("");
  });
});
