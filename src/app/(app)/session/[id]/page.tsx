"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useSequencer } from "@/lib/hooks/use-sequencer";
import { useHyperfocusGuard } from "@/lib/hooks/use-hyperfocus-guard";
import { useApiKey } from "@/lib/hooks/use-api-key";
import { useElevenLabsKey } from "@/lib/hooks/use-elevenlabs-key";
import { useToast } from "@/components/ui/toast-provider";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { ChatContext } from "@/lib/hooks/use-chat";
import type { Bookmark, InstrumentType, Note, Section } from "@/lib/music/types";

type MobileTab = "arrange" | "chat" | "capture";

interface CaptureEntry {
  type: "record" | "tap" | "describe";
  textDescription?: string;
  bpm?: number;
  audioUrl?: string;
}

const NOTES_SAVE_DEBOUNCE_MS = 2000;

export default function SessionWorkspacePage() {
  const {
    session,
    sections,
    tracks,
    notes: contextNotes,
    setNotes: setContextNotes,
    addSections,
    deleteSection,
    updateSection,
    updateTrack,
    updateSession,
  } = useSessionContext();

  const { addToast } = useToast();

  // ------- Sequencer (note management with undo/redo) -------
  const sequencer = useSequencer(contextNotes);

  // Sync context notes into sequencer when they load from API
  // (only on initial load / refresh, not on every sequencer change)
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (contextNotes.length > 0 && !hasInitialized.current) {
      sequencer.setNotes(contextNotes);
      hasInitialized.current = true;
    }
  }, [contextNotes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync sequencer notes back to context whenever they change
  useEffect(() => {
    setContextNotes(sequencer.notes);
  }, [sequencer.notes, setContextNotes]);

  // Debounced save to API
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingNotesRef = useRef<Note[]>(sequencer.notes);
  const lastSaveToastRef = useRef<number>(0);

  // Keep ref in sync with latest notes (must be in effect, not render)
  useEffect(() => {
    pendingNotesRef.current = sequencer.notes;
  }, [sequencer.notes]);

  useEffect(() => {
    if (!session?.id) return;
    if (!hasInitialized.current && contextNotes.length === 0 && sequencer.notes.length === 0) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      const notesToSave = pendingNotesRef.current;
      fetch(`/api/session/${session.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesToSave }),
      })
        .then((res) => {
          if (res.ok) {
            // Throttle save toasts to at most once every 30s
            const now = Date.now();
            if (now - lastSaveToastRef.current > 30_000) {
              lastSaveToastRef.current = now;
              addToast({ message: "Session saved", variant: "default", duration: 2000 });
            }
          }
        })
        .catch(() => {
          addToast({ message: "Failed to save changes", variant: "error" });
        });
    }, NOTES_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [sequencer.notes, session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (session?.id && pendingNotesRef.current.length > 0) {
        fetch(`/api/session/${session.id}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: pendingNotesRef.current }),
        }).catch(() => {
          // Best effort on unmount
        });
      }
    };
  }, [session?.id]);

  // ------- State -------
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [bookmarks] = useState<Bookmark[]>([]);
  const [mobileTab, setMobileTab] = useState<MobileTab>("arrange");

  // ------- API keys -------
  const { apiKey } = useApiKey();
  const { apiKey: elevenLabsKey } = useElevenLabsKey();

  // ------- Chat sendMessage ref (so captures can send to chat) -------
  const chatSendRef = useRef<((msg: string) => void) | null>(null);

  // ------- Tone.js player (uses sequencer notes, not empty context) -------
  const {
    isPlaying,
    play,
    stop,
    setBpm,
    currentTick,
  } = useTonePlayer(sequencer.notes, session?.bpm ?? 120);

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

  // ------- Capture -> Session handler -------
  const handleCaptureAddToSession = useCallback(
    (entry: CaptureEntry) => {
      if (!session) return;

      // Persist the capture to the API
      const captureType = entry.type === "describe" ? "text" : entry.type === "tap" ? "tap" : "audio";
      fetch(`/api/session/${session.id}/captures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: captureType,
          textDescription: entry.textDescription,
          audioUrl: entry.audioUrl,
        }),
      })
        .then((res) => {
          if (res.ok) {
            addToast({ message: "Capture saved", variant: "success", duration: 2500 });
          } else {
            addToast({ message: "Failed to save capture", variant: "error" });
          }
        })
        .catch(() => {
          addToast({ message: "Failed to save capture", variant: "error" });
        });

      // If it's a text description, also send it to the AI producer chat
      if (entry.textDescription && chatSendRef.current) {
        chatSendRef.current(`[Capture] ${entry.textDescription}`);
      }

      // If it's a tap with BPM, update the session BPM
      if (entry.type === "tap" && entry.bpm) {
        updateSession({ bpm: entry.bpm });
        setBpm(entry.bpm);
      }
    },
    [session, updateSession, setBpm, addToast],
  );

  // ------- Arrangement generation handler -------
  const handleGenerateArrangement = useCallback(
    (newSections: Omit<Section, "id" | "sessionId">[]) => {
      void addSections(newSections).then(() => {
        addToast({
          message: `Arrangement generated -- ${newSections.length} section${newSections.length === 1 ? "" : "s"} added`,
          variant: "success",
          duration: 3000,
        });
      });
    },
    [addSections, addToast],
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

  const handleAddSection = useCallback(
    (section: Omit<Section, "id" | "sessionId">) => {
      void addSections([section]).then(() => {
        addToast({
          message: `${section.name} added`,
          variant: "success",
          duration: 2000,
        });
      });
    },
    [addSections, addToast],
  );

  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      const sectionName = sections.find((s) => s.id === sectionId)?.name ?? "Section";
      void deleteSection(sectionId).then(() => {
        addToast({
          message: `${sectionName} removed`,
          variant: "default",
          duration: 2000,
        });
      });
    },
    [deleteSection, sections, addToast],
  );

  const handleUpdateSection = useCallback(
    (sectionId: string, updates: Partial<Section>) => {
      void updateSection(sectionId, updates);
    },
    [updateSection],
  );

  // Trigger "Ask AI to Generate" by sending a prompt to chat
  const handleRequestAIGenerate = useCallback(() => {
    if (chatSendRef.current) {
      chatSendRef.current("Generate an arrangement for this track");
    }
  }, []);

  const handleTrackInstrumentChange = useCallback(
    (trackId: string, instrument: InstrumentType) => {
      updateTrack(trackId, { instrument });
    },
    [updateTrack],
  );

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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0a0a0a]">
      {/* Chat/AI key errors are handled by ChatPanel's error banners,
          which only show when requests actually fail — no preemptive banner
          needed since the server may have its own key configured */}

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
              <Tooltip
                content={
                  !elevenLabsKey
                    ? "Add an ElevenLabs key in Settings to enable"
                    : "Generate audio with AI"
                }
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setGenerateOpen(true)}
                  disabled={!elevenLabsKey}
                  className={cn(!elevenLabsKey && "opacity-50")}
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
              </Tooltip>
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
      <div className="flex shrink-0 border-b border-neutral-800 md:hidden">
        {mobileTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMobileTab(tab.key)}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium transition-colors",
              mobileTab === tab.key
                ? "border-b-2 border-amber-500 text-amber-400"
                : "text-neutral-400 hover:text-neutral-200",
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
              onDeleteSection={handleDeleteSection}
              onUpdateSection={handleUpdateSection}
              onRequestAIGenerate={handleRequestAIGenerate}
            />
            <SequencerPanel
              tracks={tracks}
              notes={sequencer.notes}
              bpm={session.bpm}
              playheadTick={currentTick}
              isPlaying={isPlaying}
              onAddNote={sequencer.addNote}
              onSelectNote={sequencer.selectNote}
              onClearSelection={sequencer.clearSelection}
              onMoveNote={sequencer.moveNote}
              onResizeNote={sequencer.resizeNote}
              selectedNotes={sequencer.selectedNotes}
              onTrackInstrumentChange={handleTrackInstrumentChange}
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
              sendMessageRef={chatSendRef}
              onGenerateArrangement={handleGenerateArrangement}
              className="flex-1"
            />
            <div className="border-t border-neutral-800 p-3">
              <BookmarkList bookmarks={bookmarks} />
            </div>
          </div>
        )}

        {mobileTab === "capture" && (
          <CapturePanel
            collapsed={false}
            onAddToSession={handleCaptureAddToSession}
            className="flex-1 w-full border-l-0"
          />
        )}
      </div>

      {/* Desktop workspace (3-column layout) */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Left Panel: Chat */}
        <div className="flex w-[380px] shrink-0 flex-col overflow-hidden border-r border-neutral-800">
          <ChatPanel
            sessionId={session.id}
            context={chatContext}
            apiKey={apiKey}
            sendMessageRef={chatSendRef}
            onGenerateArrangement={handleGenerateArrangement}
            className="min-h-0 flex-1"
          />

          {/* Bookmarks section below chat */}
          <div className="shrink-0 border-t border-neutral-800 p-3">
            <BookmarkList bookmarks={bookmarks} />
          </div>
        </div>

        {/* Center: Arrangement + Sequencer */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
          {/* Arrangement panel */}
          <ArrangementPanel
            sections={sections}
            onAddSection={handleAddSection}
          />

          {/* Sequencer */}
          <SequencerPanel
            tracks={tracks}
            notes={sequencer.notes}
            bpm={session.bpm}
            playheadTick={currentTick}
            isPlaying={isPlaying}
            onAddNote={sequencer.addNote}
            onSelectNote={sequencer.selectNote}
            onClearSelection={sequencer.clearSelection}
            onMoveNote={sequencer.moveNote}
            onResizeNote={sequencer.resizeNote}
            selectedNotes={sequencer.selectedNotes}
            onTrackInstrumentChange={handleTrackInstrumentChange}
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
          onAddToSession={handleCaptureAddToSession}
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
