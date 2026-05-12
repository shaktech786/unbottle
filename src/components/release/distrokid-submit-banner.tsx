"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ReleaseChecklist } from "@/lib/release/types";
import { distributeRelease } from "@/lib/release/distribution";

interface DistrokidSubmitBannerProps {
  checklist: ReleaseChecklist;
  onDistributionTriggered?: () => void;
}

export function DistrokidSubmitBanner({
  checklist,
  onDistributionTriggered,
}: DistrokidSubmitBannerProps) {
  const [result, setResult] = useState<ReturnType<typeof distributeRelease> | null>(null);

  function handleSubmit() {
    const res = distributeRelease(checklist);
    setResult(res);
    onDistributionTriggered?.();
  }

  if (result) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col gap-3">
        <p className="text-sm text-amber-200">{result.message}</p>
        <a
          href={result.distrokidUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-400 hover:text-amber-300 underline underline-offset-2"
        >
          Open DistroKid
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 10L10 2M10 2H4M10 2v6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
        {Object.keys(result.prefillParams).length > 0 && (
          <div className="text-xs text-neutral-400">
            <p className="font-medium text-neutral-300 mb-1">Pre-fill notes:</p>
            <ul className="space-y-0.5">
              {Object.entries(result.prefillParams).map(([key, value]) => (
                <li key={key}>
                  <span className="text-neutral-500">{key}:</span> {value}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-700 bg-neutral-900/50 p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-neutral-200">Ready to distribute?</p>
        <p className="text-xs text-neutral-500 mt-0.5">
          DistroKid requires manual submission — no public API.
        </p>
      </div>
      <Button size="sm" onClick={handleSubmit}>
        Submit via DistroKid
      </Button>
    </div>
  );
}
