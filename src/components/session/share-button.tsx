"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

interface ShareButtonProps {
  sessionId: string;
  initialIsShared: boolean;
  initialShareUrl?: string;
}

export function ShareButton({ sessionId, initialIsShared, initialShareUrl }: ShareButtonProps) {
  const [isShared, setIsShared] = useState(initialIsShared);
  const [shareUrl, setShareUrl] = useState<string | null>(
    initialIsShared && initialShareUrl ? initialShareUrl : null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleToggleShare = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/session/${sessionId}/share`, {
        method: "POST",
      });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as { shareUrl: string | null; isShared: boolean };
      setIsShared(data.isShared);
      setShareUrl(data.shareUrl);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, isLoading]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access denied — no-op
    }
  }, [shareUrl]);

  return (
    <div className="flex items-center gap-1">
      <Tooltip content={isShared ? "Turn off sharing" : "Share this session"}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleShare}
          disabled={isLoading}
          loading={isLoading}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span className="hidden md:inline">
            {isShared ? "Shared" : "Share"}
          </span>
          {isShared && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-green-400"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </Button>
      </Tooltip>

      {isShared && shareUrl && (
        <Tooltip content={copied ? "Copied!" : "Copy share link"}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className={copied ? "text-green-400" : undefined}
          >
            {copied ? (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="hidden md:inline">Copied!</span>
              </>
            ) : (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span className="hidden md:inline">Copy link</span>
              </>
            )}
          </Button>
        </Tooltip>
      )}
    </div>
  );
}
