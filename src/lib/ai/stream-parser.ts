/**
 * SSE stream parsing utilities.
 *
 * Used by the client-side hook to parse incoming SSE events from the
 * chat API, and testable independently of any network code.
 */

export interface SSEEvent {
  type: "token" | "action" | "done" | "error";
  content?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
}

/**
 * Parse an array of SSE lines into typed event objects.
 *
 * Each line that starts with `data: ` is treated as a JSON payload.
 * Lines that fail to parse or don't start with the prefix are silently
 * skipped — matching standard SSE behavior where comments and unknown
 * fields are ignored.
 */
export function parseSSELines(lines: string[]): SSEEvent[] {
  const events: SSEEvent[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data: ")) continue;

    const jsonStr = trimmed.slice(6);
    try {
      const parsed = JSON.parse(jsonStr) as SSEEvent;
      events.push(parsed);
    } catch {
      // Invalid JSON — skip
    }
  }

  return events;
}

/**
 * Split a raw SSE buffer into complete lines and a remainder.
 *
 * SSE events are delimited by `\n`. This function splits on newlines
 * and returns:
 * - `lines`: all complete lines (ready to parse)
 * - `remainder`: the trailing incomplete chunk to prepend to the next read
 */
export function splitSSEBuffer(buffer: string): {
  lines: string[];
  remainder: string;
} {
  const parts = buffer.split("\n");
  const remainder = parts.pop() ?? "";
  return { lines: parts, remainder };
}
