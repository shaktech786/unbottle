import { describe, it, expect } from "vitest";
import { removeLastAssistantMessage } from "./chat-utils";
import type { ChatMessage } from "@/lib/music/types";

function makeMsg(id: string, role: ChatMessage["role"], content = "text"): ChatMessage {
  return { id, sessionId: "s1", role, content, createdAt: "2024-01-01T00:00:00Z" };
}

describe("removeLastAssistantMessage", () => {
  it("removes the last assistant message", () => {
    const messages: ChatMessage[] = [
      makeMsg("1", "user", "hello"),
      makeMsg("2", "assistant", "hi there"),
    ];
    const result = removeLastAssistantMessage(messages);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("returns same array contents when no assistant message exists", () => {
    const messages: ChatMessage[] = [
      makeMsg("1", "user", "hello"),
      makeMsg("2", "user", "world"),
    ];
    const result = removeLastAssistantMessage(messages);
    expect(result).toHaveLength(2);
  });

  it("removes only the LAST assistant message when there are consecutive assistant messages", () => {
    const messages: ChatMessage[] = [
      makeMsg("1", "user", "hello"),
      makeMsg("2", "assistant", "first response"),
      makeMsg("3", "assistant", "second response"),
    ];
    const result = removeLastAssistantMessage(messages);
    expect(result).toHaveLength(2);
    expect(result.find((m) => m.id === "3")).toBeUndefined();
    expect(result.find((m) => m.id === "2")).toBeDefined();
  });

  it("returns a new array without mutating the original", () => {
    const messages: ChatMessage[] = [
      makeMsg("1", "user", "hello"),
      makeMsg("2", "assistant", "hi"),
    ];
    const original = [...messages];
    const result = removeLastAssistantMessage(messages);
    expect(result).not.toBe(messages);
    expect(messages).toEqual(original);
  });

  it("handles empty array", () => {
    const result = removeLastAssistantMessage([]);
    expect(result).toEqual([]);
  });

  it("handles array with only a system message", () => {
    const messages: ChatMessage[] = [makeMsg("1", "system", "You are helpful.")];
    const result = removeLastAssistantMessage(messages);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("removes last assistant even when user message follows it", () => {
    const messages: ChatMessage[] = [
      makeMsg("1", "user", "hello"),
      makeMsg("2", "assistant", "hi"),
      makeMsg("3", "user", "follow up"),
    ];
    // The last assistant is msg 2; msg 3 is a user message, not assistant
    const result = removeLastAssistantMessage(messages);
    // No assistant message is last in sequence here — msg 3 is user
    // The last assistant in the array is msg 2
    expect(result).toHaveLength(2);
    expect(result.find((m) => m.id === "2")).toBeUndefined();
    expect(result.find((m) => m.id === "3")).toBeDefined();
  });
});
