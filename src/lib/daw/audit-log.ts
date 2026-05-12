/**
 * Tool-call audit log.
 * Records every executeDAWTool invocation with timestamp, name, params,
 * and the result. The log is module-scoped; the React panel reads it
 * via the exported hook/helpers.
 */

import type { DAWToolResult } from "./executor";

export interface AuditEntry {
  id: string;
  timestamp: string; // ISO 8601
  toolName: string;
  params: Record<string, unknown>;
  result: DAWToolResult;
}

// ---------------------------------------------------------------------------
// In-memory log (one per Node.js module lifetime / browser session)
// ---------------------------------------------------------------------------

const _entries: AuditEntry[] = [];
let _idCounter = 0;

function nextId(): string {
  _idCounter += 1;
  return `audit-${Date.now()}-${_idCounter}`;
}

/** Append an entry to the log. Called by the wrapped executor. */
export function recordAuditEntry(
  toolName: string,
  params: Record<string, unknown>,
  result: DAWToolResult,
): AuditEntry {
  const entry: AuditEntry = {
    id: nextId(),
    timestamp: new Date().toISOString(),
    toolName,
    params,
    result,
  };
  _entries.push(entry);
  return entry;
}

/** Read all entries in insertion order. */
export function getAuditLog(): readonly AuditEntry[] {
  return _entries;
}

/** Clear the log (for tests). */
export function clearAuditLog(): void {
  _entries.length = 0;
}
