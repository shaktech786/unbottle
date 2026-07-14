/**
 * ExportJob domain type and Zod schema.
 *
 * Represents a queued or completed export operation for a session.
 * Stored in the `export_jobs` Supabase table.
 */

// Minimal Zod-compatible runtime validation without a runtime dep on zod.
// We export a parse function that validates and narrows the type.

export type ExportFormat = "wav" | "mp3" | "midi" | "stems" | "bundle";
export type ExportStatus = "pending" | "processing" | "done" | "error";
export type BitDepth = 16 | 24 | 32;

export interface ExportJob {
  id: string;
  sessionId: string;
  format: ExportFormat;
  /** Only relevant for WAV/stems formats */
  bitDepth?: BitDepth;
  /** Track IDs to export as stems (only for format === 'stems') */
  stemsConfig?: string[];
  status: ExportStatus;
  /** Signed download URL once status === 'done' */
  outputUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Zod-style parse (no runtime dep on zod — keep bundle lean)
// ---------------------------------------------------------------------------

const VALID_FORMATS = new Set<string>(["wav", "mp3", "midi", "stems", "bundle"]);
const VALID_STATUSES = new Set<string>(["pending", "processing", "done", "error"]);
const VALID_BIT_DEPTHS = new Set<number>([16, 24, 32]);

export class ExportJobValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExportJobValidationError";
  }
}

export function parseExportJob(raw: unknown): ExportJob {
  if (!raw || typeof raw !== "object") {
    throw new ExportJobValidationError("ExportJob must be an object");
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj.id !== "string" || !obj.id) {
    throw new ExportJobValidationError("ExportJob.id must be a non-empty string");
  }
  if (typeof obj.sessionId !== "string" || !obj.sessionId) {
    throw new ExportJobValidationError("ExportJob.sessionId must be a non-empty string");
  }
  if (typeof obj.format !== "string" || !VALID_FORMATS.has(obj.format)) {
    throw new ExportJobValidationError(
      `ExportJob.format must be one of: ${[...VALID_FORMATS].join(", ")}`,
    );
  }
  if (typeof obj.status !== "string" || !VALID_STATUSES.has(obj.status)) {
    throw new ExportJobValidationError(
      `ExportJob.status must be one of: ${[...VALID_STATUSES].join(", ")}`,
    );
  }
  if (obj.bitDepth !== undefined && !VALID_BIT_DEPTHS.has(obj.bitDepth as number)) {
    throw new ExportJobValidationError("ExportJob.bitDepth must be 16, 24, or 32");
  }
  if (obj.stemsConfig !== undefined && !Array.isArray(obj.stemsConfig)) {
    throw new ExportJobValidationError("ExportJob.stemsConfig must be an array");
  }

  return {
    id: obj.id as string,
    sessionId: obj.sessionId as string,
    format: obj.format as ExportFormat,
    bitDepth: obj.bitDepth as BitDepth | undefined,
    stemsConfig: obj.stemsConfig as string[] | undefined,
    status: obj.status as ExportStatus,
    outputUrl: typeof obj.outputUrl === "string" ? obj.outputUrl : undefined,
    errorMessage: typeof obj.errorMessage === "string" ? obj.errorMessage : undefined,
    createdAt: typeof obj.createdAt === "string" ? obj.createdAt : new Date().toISOString(),
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : new Date().toISOString(),
  };
}

/** Create a new ExportJob with status=pending, no id (DB assigns it). */
export function createExportJobInput(
  sessionId: string,
  format: ExportFormat,
  opts?: { bitDepth?: BitDepth; stemsConfig?: string[] },
): Omit<ExportJob, "id" | "createdAt" | "updatedAt"> {
  return {
    sessionId,
    format,
    bitDepth: opts?.bitDepth,
    stemsConfig: opts?.stemsConfig,
    status: "pending",
  };
}
