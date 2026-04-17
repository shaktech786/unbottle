import type { ChatMessage } from "@/lib/music/types";

/**
 * Returns a new array with the last assistant message removed.
 * Does not mutate the input array.
 * If no assistant message exists, returns a copy of the input.
 */
export function removeLastAssistantMessage(messages: ChatMessage[]): ChatMessage[] {
  const copy = messages.slice();
  // Find last assistant message index
  for (let i = copy.length - 1; i >= 0; i--) {
    if (copy[i].role === "assistant") {
      copy.splice(i, 1);
      return copy;
    }
  }
  return copy;
}
