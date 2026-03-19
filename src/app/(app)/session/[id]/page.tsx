"use client";

import { useCallback, useState } from "react";
import { useSessionContext } from "@/lib/session/context";
import { TransportControls } from "@/components/sequencer/transport-controls";
import { ArrangementPanel } from "@/components/arrangement/arrangement-panel";
import { cn } from "@/lib/utils/cn";

export default function SessionWorkspacePage() {
  const { session, sections, updateSession } = useSessionContext();
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const handleBpmChange = useCallback(
    (bpm: number) => updateSession({ bpm }),
    [updateSession],
  );

  const handleKeyChange = useCallback(
    (keySignature: string) => updateSession({ keySignature }),
    [updateSession],
  );

  const handleTimeSignatureChange = useCallback(
    (timeSignature: string) => updateSession({ timeSignature }),
    [updateSession],
  );

  const handleAddSection = useCallback(() => {
    // Will be wired to API/store later
    // For now this is a placeholder that sections can be added via chat
  }, []);

  if (!session) return null;

  return (
    <div className="flex h-full flex-col bg-slate-950">
      {/* Transport Controls */}
      <TransportControls
        bpm={session.bpm}
        keySignature={session.keySignature}
        timeSignature={session.timeSignature}
        onBpmChange={handleBpmChange}
        onKeyChange={handleKeyChange}
        onTimeSignatureChange={handleTimeSignatureChange}
      />

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Chat */}
        <div className="flex w-[380px] shrink-0 flex-col border-r border-slate-800">
          <div className="flex h-10 items-center border-b border-slate-800 px-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              AI Producer
            </h2>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-slate-600"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="mt-3 text-sm text-slate-500">
              Chat panel loading...
            </p>
            <p className="mt-1 text-xs text-slate-600">
              The AI producer will help you build your track.
            </p>
          </div>
        </div>

        {/* Center: Arrangement + Sequencer */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {/* Arrangement panel */}
          <ArrangementPanel
            sections={sections}
            onAddSection={handleAddSection}
          />

          {/* Sequencer placeholder */}
          <div className="flex flex-1 flex-col rounded-xl border border-slate-800 bg-slate-900/30 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">
              Sequencer
            </h2>
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto text-slate-700"
                >
                  <rect x="2" y="2" width="20" height="20" rx="2" />
                  <line x1="2" y1="8" x2="22" y2="8" />
                  <line x1="2" y1="14" x2="22" y2="14" />
                  <line x1="8" y1="2" x2="8" y2="22" />
                  <line x1="14" y1="2" x2="14" y2="22" />
                </svg>
                <p className="mt-3 text-sm text-slate-500">
                  Sequencer will appear here
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Piano roll and drum grid coming soon.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Capture */}
        <div
          className={cn(
            "flex shrink-0 flex-col border-l border-slate-800 transition-all duration-200",
            rightPanelOpen ? "w-[320px]" : "w-10",
          )}
        >
          {/* Toggle button */}
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="flex h-10 items-center justify-center border-b border-slate-800 text-slate-500 hover:text-slate-300"
            aria-label={rightPanelOpen ? "Collapse panel" : "Expand panel"}
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
              className={cn(
                "transition-transform",
                rightPanelOpen ? "rotate-0" : "rotate-180",
              )}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {rightPanelOpen && (
            <div className="flex flex-1 flex-col p-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Capture
              </h2>
              <div className="flex flex-1 items-center justify-center text-center">
                <div>
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mx-auto text-slate-600"
                  >
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                  <p className="mt-3 text-sm text-slate-500">
                    Capture panel
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Hum, tap, or describe your ideas.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
