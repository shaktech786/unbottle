"use client";

import { cn } from "@/lib/utils/cn";

export interface ExportProgressProps {
  /** Whether the export is complete. */
  complete?: boolean;
  /** Download URL when complete. */
  downloadUrl?: string;
  /** Suggested filename. */
  filename?: string;
  className?: string;
}

/**
 * Progress indicator during export, or download link when complete.
 */
export function ExportProgress({
  complete = false,
  downloadUrl,
  filename = "export.mid",
  className,
}: ExportProgressProps) {
  if (complete && downloadUrl) {
    return (
      <div className={cn("flex flex-col items-center gap-2", className)}>
        <div className="flex items-center gap-2 text-emerald-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-sm font-medium">Export complete</span>
        </div>

        <a
          href={downloadUrl}
          download={filename}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2",
            "bg-emerald-600 text-white text-sm font-medium",
            "hover:bg-emerald-500 transition-colors",
          )}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download {filename}
        </a>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-2 py-2", className)}>
      {/* Spinner */}
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-500 border-t-amber-500" />
      <span className="text-xs text-neutral-400">Generating file...</span>

      {/* Indeterminate progress bar */}
      <div className="w-full h-1 rounded-full bg-neutral-800 overflow-hidden">
        <div className="h-full w-1/3 rounded-full bg-amber-500 animate-pulse" />
      </div>
    </div>
  );
}
