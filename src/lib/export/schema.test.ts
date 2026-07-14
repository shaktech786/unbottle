import { describe, it, expect } from "vitest";
import {
  parseExportJob,
  createExportJobInput,
  ExportJobValidationError,
} from "./schema";

describe("parseExportJob", () => {
  const valid = {
    id: "abc123",
    sessionId: "sess-1",
    format: "midi",
    status: "pending",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  };

  it("parses a valid minimal export job", () => {
    const job = parseExportJob(valid);
    expect(job.id).toBe("abc123");
    expect(job.format).toBe("midi");
    expect(job.status).toBe("pending");
  });

  it("parses optional bitDepth and stemsConfig", () => {
    const job = parseExportJob({
      ...valid,
      format: "stems",
      bitDepth: 24,
      stemsConfig: ["t1", "t2"],
    });
    expect(job.bitDepth).toBe(24);
    expect(job.stemsConfig).toEqual(["t1", "t2"]);
  });

  it("rejects invalid format", () => {
    expect(() => parseExportJob({ ...valid, format: "flac" })).toThrow(
      ExportJobValidationError,
    );
  });

  it("rejects invalid status", () => {
    expect(() => parseExportJob({ ...valid, status: "queued" })).toThrow(
      ExportJobValidationError,
    );
  });

  it("rejects invalid bitDepth", () => {
    expect(() => parseExportJob({ ...valid, bitDepth: 8 })).toThrow(
      ExportJobValidationError,
    );
  });

  it("rejects non-object input", () => {
    expect(() => parseExportJob(null)).toThrow(ExportJobValidationError);
    expect(() => parseExportJob("string")).toThrow(ExportJobValidationError);
  });

  it("accepts all valid formats", () => {
    for (const format of ["wav", "mp3", "midi", "stems", "bundle"]) {
      expect(() => parseExportJob({ ...valid, format })).not.toThrow();
    }
  });

  it("accepts all valid bit depths", () => {
    for (const bitDepth of [16, 24, 32]) {
      expect(() => parseExportJob({ ...valid, bitDepth })).not.toThrow();
    }
  });
});

describe("createExportJobInput", () => {
  it("creates a pending job input", () => {
    const input = createExportJobInput("sess-1", "wav", { bitDepth: 16 });
    expect(input.status).toBe("pending");
    expect(input.format).toBe("wav");
    expect(input.bitDepth).toBe(16);
    expect(input.sessionId).toBe("sess-1");
  });

  it("creates stems job with track list", () => {
    const input = createExportJobInput("sess-2", "stems", {
      stemsConfig: ["t1", "t2", "t3"],
    });
    expect(input.stemsConfig).toEqual(["t1", "t2", "t3"]);
    expect(input.format).toBe("stems");
  });
});
