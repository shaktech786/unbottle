"use client";

// Usage: show when rate limit is hit
// {showUpgradePrompt && <UpgradePrompt onDismiss={() => setShowUpgradePrompt(false)} />}

import { useState } from "react";

interface UpgradePromptProps {
  onDismiss: () => void;
}

export function UpgradePrompt({ onDismiss }: UpgradePromptProps) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      <span className="flex-1">
        You&apos;ve reached your AI limit for this month.
      </span>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="shrink-0 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60 dark:bg-amber-600 dark:hover:bg-amber-500"
      >
        {loading ? "Redirecting…" : "Upgrade to Pro — no API keys needed"}
      </button>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
      >
        ✕
      </button>
    </div>
  );
}
