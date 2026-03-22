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
import { useToast } from "@/components/ui/toast-provider";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { chordProgressionToNotes } from "@/lib/music/chord-to-notes";
import type { ChatAction, ChatContext } from "@/lib/hooks/use-chat";
import type { Bookmark, InstrumentType, Note, Section, SectionType, ChordEvent } from "@/lib/music/types";

type MobileTab = "arrange" | "chat" | "capture";

interface CaptureEntry {
  type: "record" | "tap" | "describe";
  textDescription?: string;
  bpm?: number;
  audioUrl?: string;
}

const NOTES_SAVE_DEBOUNCE_MS = 2000;

const SECTION_COLORS: Record<string, string> = {
  intro: "#6366f1",
  verse: "#8b5cf6",
  pre_chorus: "#a855f7",
  chorus: "#ec4899",
  bridge: "#f97316",
  outro: "#64748b",
  breakdown: "#14b8a6",
  custom: "#94a3b8",
};

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
      if (session?.id) {
        // Always flush on unmount — including empty arrays (clears)
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
  const [captureOpen, setCaptureOpen] = useState(false);
  const [sequencerVisible, setSequencerVisible] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [mobileTab, setMobileTab] = useState<MobileTab>("arrange");

  // Load bookmarks from API
  useEffect(() => {
    if (!session?.id) return;
    fetch(`/api/session/${session.id}/bookmark`)
      .then((res) => (res.ok ? res.json() : { bookmarks: [] }))
      .then((data: { bookmarks?: Bookmark[] }) => {
        if (data.bookmarks?.length) {
          setBookmarks(data.bookmarks);
        }
      })
      .catch(() => {});
  }, [session?.id]);

  // ------- API keys -------
  const { apiKey } = useApiKey();

  // ------- Chat sendMessage ref (so captures can send to chat) -------
  const chatSendRef = useRef<((msg: string) => void) | null>(null);

  // ------- Auto-kickoff for fresh sessions -------
  // When a user lands on a brand-new session (no sections, no notes),
  // auto-send a kickoff message to the AI so they get immediate guidance.
  const hasAutoKicked = useRef(false);
  useEffect(() => {
    if (
      session &&
      !hasAutoKicked.current &&
      sections.length === 0 &&
      contextNotes.length === 0
    ) {
      hasAutoKicked.current = true;

      // Build a contextual kickoff message based on what the user already set
      const parts: string[] = [];
      if (session.genre) parts.push(`genre is ${session.genre}`);
      if (session.mood) parts.push(`mood is ${session.mood}`);
      if (session.bpm !== 120) parts.push(`BPM is ${session.bpm}`);
      if (session.keySignature && session.keySignature !== "C") parts.push(`key is ${session.keySignature}`);

      const ctx = parts.length > 0
        ? `I've set up: ${parts.join(", ")}.`
        : "I just started a fresh session.";

      const msg = `${ctx} Build me a full arrangement with chord progressions I can hear right away. Pick anything I haven't chosen yet.`;

      // Wait for chatSendRef to be populated by ChatPanel, with retries
      let attempts = 0;
      const tryKick = () => {
        attempts++;
        if (chatSendRef.current) {
          chatSendRef.current(msg);
        } else if (attempts < 10) {
          setTimeout(tryKick, 500);
        }
      };
      const timer = setTimeout(tryKick, 1000);
      return () => clearTimeout(timer);
    }
  }, [session, sections.length, contextNotes.length]);

  // ------- Tone.js player (uses sequencer notes, not empty context) -------
  const {
    isPlaying,
    play,
    stop,
    setBpm,
    setPosition,
    currentTick,
  } = useTonePlayer(
    sequencer.notes,
    session?.bpm ?? 120,
    tracks[0]?.instrument ?? "piano",
  );

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

  // ------- AI tool action handler -------
  const handleChatAction = useCallback(
    (action: ChatAction) => {
      if (action.toolName === "generate_arrangement") {
        const input = action.toolInput as {
          sections?: Array<{
            name: string;
            type: string;
            lengthBars: number;
            chordProgression: Array<{
              chord: { root: string; quality: string; bass?: string };
              durationBars: number;
            }>;
          }>;
          key?: string;
          bpm?: number;
        };

        if (input.key) {
          updateSession({ keySignature: input.key });
        }
        if (input.bpm) {
          updateSession({ bpm: input.bpm });
          setBpm(input.bpm);
        }

        if (input.sections?.length) {
          let currentBar = 0;
          const newSections: Omit<Section, "id" | "sessionId">[] = input.sections.map(
            (raw, index) => {
              const sectionType = raw.type as SectionType;
              const section: Omit<Section, "id" | "sessionId"> = {
                name: raw.name,
                type: sectionType,
                startBar: currentBar,
                lengthBars: raw.lengthBars,
                chordProgression: (raw.chordProgression ?? []).map((ce) => ({
                  chord: {
                    root: ce.chord.root as ChordEvent["chord"]["root"],
                    quality: ce.chord.quality as ChordEvent["chord"]["quality"],
                    ...(ce.chord.bass
                      ? { bass: ce.chord.bass as ChordEvent["chord"]["root"] }
                      : {}),
                  },
                  durationBars: ce.durationBars,
                })),
                sortOrder: index,
                color: SECTION_COLORS[sectionType] ?? SECTION_COLORS.custom,
              };
              currentBar += raw.lengthBars;
              return section;
            },
          );

          void addSections(newSections).then(() => {
            addToast({
              message: `${newSections.length} section${newSections.length === 1 ? "" : "s"} added`,
              variant: "success",
              duration: 3000,
            });

            // Auto-place chords in sequencer and auto-play
            setTimeout(() => {
              if (tracks.length > 0) {
                const trackId = tracks[0].id;
                const chordNotes = chordProgressionToNotes(
                  newSections as Section[],
                  trackId,
                  input.bpm ?? session?.bpm ?? 120,
                  session?.timeSignature ?? "4/4",
                );
                if (chordNotes.length > 0) {
                  sequencer.addBulkNotes(chordNotes);
                  // Show sequencer and auto-play so user hears music immediately
                  setSequencerVisible(true);
                  setTimeout(() => void play(), 300);
                }
              }
            }, 500);
          });
        }
      } else if (action.toolName === "update_session") {
        const input = action.toolInput as {
          bpm?: number;
          keySignature?: string;
          genre?: string;
          mood?: string;
        };
        const updates: Record<string, unknown> = {};
        if (input.bpm) {
          updates.bpm = input.bpm;
          setBpm(input.bpm);
        }
        if (input.keySignature) updates.keySignature = input.keySignature;
        if (input.genre) updates.genre = input.genre;
        if (input.mood) updates.mood = input.mood;
        if (Object.keys(updates).length > 0) {
          updateSession(updates);
        }
      }
    },
    [addSections, addToast, updateSession, setBpm, tracks, session?.bpm, session?.timeSignature, sequencer, play],
  );

  // ------- Arrangement generation handler (manual fallback) -------
  const handleGenerateArrangement = useCallback(
    (newSections: Omit<Section, "id" | "sessionId">[], meta?: { key?: string; bpm?: number }) => {
      // Apply key/BPM from arrangement generation to session
      if (meta?.key) {
        updateSession({ keySignature: meta.key });
      }
      if (meta?.bpm) {
        updateSession({ bpm: meta.bpm });
        setBpm(meta.bpm);
      }

      void addSections(newSections).then(() => {
        addToast({
          message: `Arrangement generated -- ${newSections.length} section${newSections.length === 1 ? "" : "s"} added`,
          variant: "success",
          duration: 3000,
        });
      });
    },
    [addSections, addToast, updateSession, setBpm],
  );

  // ------- Chord-to-sequencer handler -------
  const handleAddChordsToSequencer = useCallback(() => {
    if (sections.length === 0 || tracks.length === 0) {
      addToast({ message: "No arrangement sections to add", variant: "default" });
      return;
    }

    const trackId = tracks[0].id;
    const chordNotes = chordProgressionToNotes(
      sections,
      trackId,
      session?.bpm ?? 120,
      session?.timeSignature ?? "4/4",
    );

    if (chordNotes.length === 0) {
      addToast({ message: "No chords found in the arrangement", variant: "default" });
      return;
    }

    sequencer.addBulkNotes(chordNotes);
    addToast({
      message: `${chordNotes.length} chord notes added to the sequencer`,
      variant: "success",
      duration: 3000,
    });
  }, [sections, tracks, session?.bpm, session?.timeSignature, sequencer, addToast]);

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

  // ------- Bookmark creation -------
  const handleAddBookmark = useCallback(() => {
    if (!session?.id) return;
    const label = `Checkpoint ${bookmarks.length + 1}`;
    fetch(`/api/session/${session.id}/bookmark`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        contextSnapshot: {
          bpm: session.bpm,
          keySignature: session.keySignature,
          sectionCount: sections.length,
          noteCount: sequencer.notes.length,
        },
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.bookmark) {
          setBookmarks((prev) => [...prev, data.bookmark]);
          addToast({ message: "Bookmark saved", variant: "success", duration: 2000 });
        }
      })
      .catch(() => {
        addToast({ message: "Failed to save bookmark", variant: "error" });
      });
  }, [session, bookmarks.length, sections.length, sequencer.notes.length, addToast]);

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
              <Tooltip content="Generate audio with AI">
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
              onAddChordsToSequencer={handleAddChordsToSequencer}
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
              onRemoveNote={sequencer.removeNote}
              selectedNotes={sequencer.selectedNotes}
              onTrackInstrumentChange={handleTrackInstrumentChange}
              onClearAll={sequencer.clearAll}
              onPlay={handlePlay}
              onStop={stop}
              onSetPlayhead={setPosition}
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
              onAddChordsToSequencer={handleAddChordsToSequencer}
              onAction={handleChatAction}
              className="flex-1"
            />
            <div className="border-t border-neutral-800 p-3">
              <BookmarkList bookmarks={bookmarks} onAdd={handleAddBookmark} />
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

      {/* Desktop workspace (2-column: Chat | Arrangement + optional Sequencer) */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Left Panel: Chat */}
        <div className="flex w-[380px] shrink-0 flex-col overflow-hidden border-r border-neutral-800">
          <ChatPanel
            sessionId={session.id}
            context={chatContext}
            apiKey={apiKey}
            sendMessageRef={chatSendRef}
            onGenerateArrangement={handleGenerateArrangement}
            onAddChordsToSequencer={handleAddChordsToSequencer}
            onAction={handleChatAction}
            className="min-h-0 flex-1"
          />

          {/* Bookmarks section below chat */}
          <div className="shrink-0 border-t border-neutral-800 p-3">
            <BookmarkList bookmarks={bookmarks} onAdd={handleAddBookmark} />
          </div>
        </div>

        {/* Center: Arrangement + collapsible Sequencer */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-3">
          {/* Arrangement panel */}
          <ArrangementPanel
            sections={sections}
            onAddSection={handleAddSection}
            onDeleteSection={handleDeleteSection}
            onUpdateSection={handleUpdateSection}
            onRequestAIGenerate={handleRequestAIGenerate}
            onAddChordsToSequencer={handleAddChordsToSequencer}
          />

          {/* Sequencer toggle */}
          <button
            onClick={() => setSequencerVisible((v) => !v)}
            className={cn(
              "mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              sequencerVisible
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : "border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300",
            )}
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
              className={cn("transition-transform", sequencerVisible && "rotate-90")}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {sequencerVisible ? "Hide Piano Roll" : "Show Piano Roll"}
            {sequencer.notes.length > 0 && (
              <span className="rounded-full bg-neutral-700 px-1.5 py-0.5 text-[10px] text-neutral-300">
                {sequencer.notes.length} notes
              </span>
            )}
          </button>

          {/* Collapsible Sequencer */}
          {sequencerVisible && (
            <div className="mt-3 flex-1 min-h-[400px]">
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
                onRemoveNote={sequencer.removeNote}
                selectedNotes={sequencer.selectedNotes}
                onTrackInstrumentChange={handleTrackInstrumentChange}
                onClearAll={sequencer.clearAll}
                onPlay={handlePlay}
                onStop={stop}
                onSetPlayhead={setPosition}
                onSetBpm={handleBpmChange}
                className="h-full"
              />
            </div>
          )}
        </div>
      </div>

      {/* Floating Capture Button (desktop) */}
      <div className="hidden md:block">
        <button
          onClick={() => setCaptureOpen((v) => !v)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-[#0a0a0a] shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400 hover:shadow-amber-500/30 active:scale-95"
          aria-label="Capture idea"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        </button>

        {/* Capture panel popover */}
        {captureOpen && (
          <div className="fixed bottom-24 right-6 z-40 w-80 rounded-2xl border border-neutral-700 bg-[#0a0a0a] shadow-2xl shadow-black/50">
            <CapturePanel
              collapsed={false}
              onAddToSession={handleCaptureAddToSession}
              className="border-l-0 rounded-2xl"
            />
          </div>
        )}
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
