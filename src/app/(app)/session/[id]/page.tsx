"use client";

import { useCallback, useMemo, useState } from "react";
import { useSessionContext } from "@/lib/session/context";
import { TransportControls } from "@/components/sequencer/transport-controls";
import { ArrangementPanel } from "@/components/arrangement/arrangement-panel";
import { ChatPanel } from "@/components/chat/chat-panel";
import { CapturePanel } from "@/components/capture/capture-panel";
import { SequencerPanel } from "@/components/sequencer/sequencer-panel";
import { ExportDialog } from "@/components/export/export-dialog";
import { GeneratePanel } from "@/components/audio/generate-panel";
import { HyperfocusNudge } from "@/components/session/hyperfocus-nudge";
import { BookmarkList } from "@/components/session/bookmark-list";
import { useTonePlayer } from "@/lib/hooks/use-tone-player";
import { useHyperfocusGuard } from "@/lib/hooks/use-hyperfocus-guard";
import { useApiKey } from "@/lib/hooks/use-api-key";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { ChatContext } from "@/lib/hooks/use-chat";
import type { Bookmark } from "@/lib/music/types";

type MobileTab = "arrange" | "chat" | "capture";

export default function SessionWorkspacePage() {
  const { session, sections, tracks, notes, updateSession } =
    useSessionContext();

  // ------- State -------
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [bookmarks] = useState<Bookmark[]>([]);
  const [mobileTab, setMobileTab] = useState<MobileTab>("arrange");

  // ------- API key -------
  const { apiKey } = useApiKey();

  // ------- Tone.js player -------
  const {
    isPlaying,
    play,
    stop,
    setBpm,
    currentTick,
  } = useTonePlayer(notes, session?.bpm ?? 120);

  // ------- Hyperfocus guard -------
  const { shouldNudge, elapsedMinutes, dismiss: dismissNudge } =
    useHyperfocusGuard({ thresholdMinutes: 45 });

  // ------- Chat context -------
  const chatContext = useMemo<ChatContext>(
    () => ({
      bpm: session?.bpm,
      keySignature: session?.keySignature,
      timeSignature: session?.timeSignature,
      genre: session?.genre,
      mood: session?.mood,
      sections,
      tracks,
    }),
    [session?.bpm, session?.keySignature, session?.timeSignature, session?.genre, session?.mood, sections, tracks],
  );

  // ------- Callbacks -------
  const handleBpmChange = useCallback(
    (bpm: number) => {
      updateSession({ bpm });
      setBpm(bpm);
    },
    [updateSession, setBpm],
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
    // Sections are added via chat or arrangement panel actions
  }, []);

  const handlePlay = useCallback(() => {
    void play();
  }, [play]);

  const handleStepBack = useCallback(() => {
    stop();
    void play();
  }, [stop, play]);

  if (!session) return null;

  const mobileTabs: { key: MobileTab; label: string }[] = [
    { key: "arrange", label: "Arrange" },
    { key: "chat", label: "Chat" },
    { key: "capture", label: "Capture" },
  ];

  return (
    <div className="flex h-full flex-col bg-slate-950">
      {/* Hyperfocus nudge (overlay at top) */}
      {shouldNudge && (
        <HyperfocusNudge
          elapsedMinutes={elapsedMinutes}
          onDismiss={dismissNudge}
          onStepBack={handleStepBack}
          className="mx-4 mt-2"
        />
      )}

      {/* Transport Controls */}
      <div className="shrink-0 overflow-x-auto">
        <TransportControls
          bpm={session.bpm}
          keySignature={session.keySignature}
          timeSignature={session.timeSignature}
          onBpmChange={handleBpmChange}
          onKeyChange={handleKeyChange}
          onTimeSignatureChange={handleTimeSignatureChange}
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onStop={stop}
          trailing={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGenerateOpen(true)}
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
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
                <span className="hidden sm:inline">AI Generate</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExportOpen(true)}
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          }
        />
      </div>

      {/* Mobile tab bar */}
      <div className="flex shrink-0 border-b border-slate-800 md:hidden">
        {mobileTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMobileTab(tab.key)}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium transition-colors",
              mobileTab === tab.key
                ? "border-b-2 border-indigo-500 text-indigo-400"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile content area */}
      <div className="flex flex-1 flex-col overflow-hidden md:hidden">
        {mobileTab === "arrange" && (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
            <ArrangementPanel
              sections={sections}
              onAddSection={handleAddSection}
            />
            <SequencerPanel
              tracks={tracks}
              notes={notes}
              bpm={session.bpm}
              playheadTick={currentTick}
              isPlaying={isPlaying}
              onPlay={handlePlay}
              onStop={stop}
              onSetBpm={handleBpmChange}
              className="flex-1 min-h-[300px]"
            />
          </div>
        )}

        {mobileTab === "chat" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <ChatPanel
              sessionId={session.id}
              context={chatContext}
              apiKey={apiKey}
              className="flex-1"
            />
            <div className="border-t border-slate-800 p-3">
              <BookmarkList bookmarks={bookmarks} />
            </div>
          </div>
        )}

        {mobileTab === "capture" && (
          <CapturePanel
            collapsed={false}
            className="flex-1 w-full border-l-0"
          />
        )}
      </div>

      {/* Desktop workspace (unchanged 3-column layout) */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Left Panel: Chat */}
        <div className="flex w-[380px] shrink-0 flex-col border-r border-slate-800">
          <ChatPanel
            sessionId={session.id}
            context={chatContext}
            apiKey={apiKey}
            className="flex-1"
          />

          {/* Bookmarks section below chat */}
          <div className="border-t border-slate-800 p-3">
            <BookmarkList bookmarks={bookmarks} />
          </div>
        </div>

        {/* Center: Arrangement + Sequencer */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {/* Arrangement panel */}
          <ArrangementPanel
            sections={sections}
            onAddSection={handleAddSection}
          />

          {/* Sequencer */}
          <SequencerPanel
            tracks={tracks}
            notes={notes}
            bpm={session.bpm}
            playheadTick={currentTick}
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onStop={stop}
            onSetBpm={handleBpmChange}
            className="flex-1 min-h-[400px]"
          />
        </div>

        {/* Right Panel: Capture */}
        <CapturePanel
          collapsed={rightPanelCollapsed}
          onToggleCollapse={() => setRightPanelCollapsed((prev) => !prev)}
        />
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        sessionId={session.id}
      />

      {/* AI Audio Generation Panel */}
      <GeneratePanel
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        genre={session.genre}
        mood={session.mood}
        bpm={session.bpm}
        keySignature={session.keySignature}
      />
    </div>
  );
}
