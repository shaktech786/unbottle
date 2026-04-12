"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionContext } from "@/lib/session/context";
import { TransportControls } from "@/components/sequencer/transport-controls";
import { ArrangementPanel } from "@/components/arrangement/arrangement-panel";
import { ChatPanel } from "@/components/chat/chat-panel";
import { CapturePanel } from "@/components/capture/capture-panel";
import { SequencerPanel } from "@/components/sequencer/sequencer-panel";
import { ExportDialog } from "@/components/export/export-dialog";
import { SheetMusicView } from "@/components/sheet-music/sheet-music-view";
import { GeneratePanel } from "@/components/audio/generate-panel";
import { HyperfocusNudge } from "@/components/session/hyperfocus-nudge";
import { BookmarkList } from "@/components/session/bookmark-list";
import { useTonePlayer } from "@/lib/hooks/use-tone-player";
import { useSequencer } from "@/lib/hooks/use-sequencer";
import { useHyperfocusGuard } from "@/lib/hooks/use-hyperfocus-guard";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { useApiKey } from "@/lib/hooks/use-api-key";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { useToast } from "@/components/ui/toast-provider";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { chordProgressionToNotes } from "@/lib/music/chord-to-notes";
import { reorderSections } from "@/lib/music/section-reorder";
import { getSectionTickRange, copyNotesForSection } from "@/lib/audio/playback-utils";
import { ActionHistory } from "@/lib/session/action-history";
import type { SessionSnapshot } from "@/lib/session/action-history";
import type { ChatAction, ChatContext } from "@/lib/hooks/use-chat";
import { PPQ } from "@/lib/music/types";
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
    clearSections,
    updateSection,
    updateTrack,
    updateSession,
    refreshSession,
  } = useSessionContext();

  const { addToast } = useToast();
  const router = useRouter();
  const { preferences } = usePreferences();

  // ------- Sequencer (note management with undo/redo) -------
  const sequencer = useSequencer(contextNotes);

  // ------- AI Action undo history -------
  const aiHistory = useRef(new ActionHistory());
  const [canUndoAI, setCanUndoAI] = useState(false);

  const snapshotSession = useCallback((): SessionSnapshot => ({
    sections: [...sections],
    notes: [...sequencer.notes],
    bpm: session?.bpm ?? 120,
    keySignature: session?.keySignature ?? "C",
    genre: session?.genre,
    mood: session?.mood,
  }), [sections, sequencer.notes, session?.bpm, session?.keySignature, session?.genre, session?.mood]);

  const pushAISnapshot = useCallback(() => {
    aiHistory.current.push(snapshotSession());
    setCanUndoAI(true);
  }, [snapshotSession]);

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
  const [sheetMusicVisible, setSheetMusicVisible] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");
  const [copiedNotes, setCopiedNotes] = useState<Omit<Note, "id">[] | null>(null);
  const [loopingSectionId, setLoopingSectionId] = useState<string | null>(null);

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
  const [isAutoKicking, setIsAutoKicking] = useState(false);
  useEffect(() => {
    if (
      session &&
      !hasAutoKicked.current &&
      sections.length === 0 &&
      contextNotes.length === 0
    ) {
      hasAutoKicked.current = true;
      setIsAutoKicking(true);

      const parts: string[] = [];
      if (session.genre) parts.push(`genre is ${session.genre}`);
      if (session.mood) parts.push(`mood is ${session.mood}`);
      if (session.bpm !== 120) parts.push(`BPM is ${session.bpm}`);
      if (session.keySignature && session.keySignature !== "C") parts.push(`key is ${session.keySignature}`);

      const ctx = parts.length > 0
        ? `I've set up: ${parts.join(", ")}.`
        : "I just started a fresh session.";

      const msg = `${ctx} Build me a full arrangement with chord progressions I can hear right away. Pick anything I haven't chosen yet.`;

      let attempts = 0;
      const tryKick = () => {
        attempts++;
        if (chatSendRef.current) {
          chatSendRef.current(msg);
          // Clear auto-kick indicator after a delay (AI will respond)
          setTimeout(() => setIsAutoKicking(false), 2000);
        } else if (attempts < 10) {
          setTimeout(tryKick, 500);
        } else {
          setIsAutoKicking(false);
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
    loopSection,
    clearLoop,
  } = useTonePlayer(
    sequencer.notes,
    session?.bpm ?? 120,
    tracks,
  );

  // ------- Hyperfocus guard -------
  const { shouldNudge, elapsedMinutes, dismiss: dismissNudge } =
    useHyperfocusGuard({ thresholdMinutes: preferences.hyperfocusMinutes });

  // ------- Keyboard shortcuts -------
  useKeyboardShortcuts({
    onPlayPause: () => { if (isPlaying) { stop(); } else { void play(); } },
    onUndo: sequencer.undo,
    onRedo: sequencer.redo,
    onDelete: sequencer.deleteSelected,
    onSelectAll: sequencer.selectAll,
    onEscape: sequencer.clearSelection,
  });

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

  // ------- Hum-to-MIDI: transcribe a recorded blob into notes -------
  const handleTranscribeToMidi = useCallback(
    async (blob: Blob) => {
      if (!session) return;

      try {
        const { decodeBlobToMono, detectPitchSegments, segmentsToNotes } = await import(
          "@/lib/audio/hum-to-midi"
        );
        const { samples, sampleRate } = await decodeBlobToMono(blob);
        const segments = detectPitchSegments(samples, {
          sampleRate,
          keySignature: session.keySignature,
        });

        if (segments.length === 0) {
          addToast({
            message: "Couldn't detect a melody — try humming louder and clearer",
            variant: "error",
          });
          return;
        }

        // Find an existing "Vocal" track or create one. We don't reuse the
        // first track because that's usually a piano/bass and stomping notes
        // onto it would surprise the user.
        let vocalTrack = tracks.find((t) => t.name.toLowerCase().includes("vocal"));
        if (!vocalTrack) {
          const r = await fetch(`/api/session/${session.id}/tracks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Vocal", instrument: "piano" }),
          });
          if (r.ok) {
            const { track } = (await r.json()) as { track: typeof tracks[number] };
            vocalTrack = track;
            await refreshSession();
          }
        }

        if (!vocalTrack) {
          addToast({ message: "Failed to create vocal track", variant: "error" });
          return;
        }

        const partialNotes = segmentsToNotes(segments, vocalTrack.id, session.bpm ?? 120);
        const notes: Note[] = partialNotes.map((n, idx) => ({
          ...n,
          id: `hum_${Date.now()}_${idx}`,
        }));
        sequencer.addBulkNotes(notes);

        // Persist the capture metadata so it shows up in the captures list
        fetch(`/api/session/${session.id}/captures`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "audio",
            detectedNotes: notes.map((n) => ({
              pitch: n.pitch,
              start: n.startTick,
              duration: n.durationTicks,
            })),
            durationMs: Math.round((samples.length / sampleRate) * 1000),
          }),
        }).catch(() => {
          // Best-effort persistence — note add still succeeded
        });

        setSequencerVisible(true);
        setSheetMusicVisible(true);
        addToast({
          message: `Transcribed ${notes.length} notes${
            session.keySignature ? ` (auto-tuned to ${session.keySignature})` : ""
          }`,
          variant: "success",
          duration: 4000,
        });
      } catch (err) {
        addToast({
          message: err instanceof Error ? err.message : "Transcription failed",
          variant: "error",
        });
      }
    },
    [session, tracks, refreshSession, sequencer, addToast],
  );

  // ------- AI tool action handler -------
  const handleChatAction = useCallback(
    (action: ChatAction) => {
      // Snapshot current state before any AI modification
      pushAISnapshot();

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

          // When sections already exist, clear them first to avoid duplicates
          const applyArrangement = async () => {
            if (sections.length > 0) {
              await clearSections();
              sequencer.clearAll();
            }

            await addSections(newSections);
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
          };

          void applyArrangement();
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
      } else if (action.toolName === "add_track") {
        const input = action.toolInput as {
          name: string;
          instrument: string;
        };

        if (session) {
          fetch(`/api/session/${session.id}/tracks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: input.name,
              instrument: input.instrument,
            }),
          })
            .then((res) => {
              if (res.ok) {
                addToast({
                  message: `Track '${input.name}' added`,
                  variant: "success",
                  duration: 3000,
                });
                // Refresh session to pick up the new track in state
                void refreshSession();
              } else {
                addToast({
                  message: "Failed to add track",
                  variant: "error",
                });
              }
            })
            .catch(() => {
              addToast({
                message: "Failed to add track",
                variant: "error",
              });
            });
        }
      } else if (action.toolName === "generate_notation") {
        const input = action.toolInput as {
          trackName: string;
          notes: Array<{
            pitch: string;
            startBeat: number;
            durationBeats: number;
            velocity?: number;
          }>;
          description?: string;
        };

        // Find the target track by name
        const targetTrack = tracks.find(
          (t) => t.name.toLowerCase() === input.trackName.toLowerCase(),
        ) ?? tracks[0];

        if (targetTrack && input.notes?.length) {
          const newNotes: Note[] = input.notes.map((n, idx) => ({
            id: `ai_note_${Date.now()}_${idx}`,
            trackId: targetTrack.id,
            pitch: n.pitch as Note["pitch"],
            startTick: Math.round((n.startBeat - 1) * PPQ),
            durationTicks: Math.round(n.durationBeats * PPQ),
            velocity: n.velocity ?? 80,
          }));

          sequencer.addBulkNotes(newNotes);
          setSequencerVisible(true);
          setSheetMusicVisible(true);

          addToast({
            message: `${newNotes.length} notes added${input.description ? `: ${input.description}` : ""}`,
            variant: "success",
            duration: 3000,
          });
        }
      } else if (action.toolName === "suggest_lyrics") {
        const input = action.toolInput as {
          sectionName: string;
          lyrics: string;
          vocalMelodyHint?: string;
        };

        addToast({
          message: `Lyrics suggested for ${input.sectionName}`,
          variant: "success",
          duration: 3000,
        });
      }
    },
    [addSections, addToast, updateSession, setBpm, tracks, session, sequencer, play, refreshSession, clearSections, sections, pushAISnapshot],
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

  // ------- Reorder sections (drag-and-drop) -------
  const handleReorderSections = useCallback(
    (fromIndex: number, toIndex: number) => {
      const reordered = reorderSections(sections, fromIndex, toIndex);
      // Persist each section's new startBar and sortOrder
      for (const s of reordered) {
        void updateSection(s.id, { startBar: s.startBar, sortOrder: s.sortOrder });
      }
    },
    [sections, updateSection],
  );

  // ------- Undo AI action -------
  const handleUndoAI = useCallback(() => {
    const snapshot = aiHistory.current.undo();
    if (!snapshot) return;

    // Restore session-level properties
    updateSession({
      bpm: snapshot.bpm,
      keySignature: snapshot.keySignature,
      ...(snapshot.genre !== undefined ? { genre: snapshot.genre } : {}),
      ...(snapshot.mood !== undefined ? { mood: snapshot.mood } : {}),
    });
    setBpm(snapshot.bpm);

    // Restore notes
    sequencer.setNotes(snapshot.notes);

    // For sections, we do a full refresh to restore them cleanly
    void refreshSession();

    setCanUndoAI(aiHistory.current.canUndo());
    addToast({ message: "AI action undone", variant: "default", duration: 2500 });
  }, [updateSession, setBpm, sequencer, refreshSession, addToast]);

  // ------- Section looping -------
  const handleLoopSection = useCallback(
    (sectionId: string) => {
      const section = sections.find((s) => s.id === sectionId);
      if (!section) return;
      const timeSignature = session?.timeSignature ?? "4/4";
      const { startTick, endTick } = getSectionTickRange(section, timeSignature);
      loopSection(startTick, endTick);
      setLoopingSectionId(sectionId);
      addToast({
        message: `Looping ${section.name}`,
        variant: "default",
        duration: 2000,
      });
    },
    [sections, session?.timeSignature, loopSection, addToast],
  );

  const handleClearLoop = useCallback(() => {
    clearLoop();
    setLoopingSectionId(null);
    addToast({
      message: "Loop cleared",
      variant: "default",
      duration: 2000,
    });
  }, [clearLoop, addToast]);

  // ------- Section copy/paste -------
  const handleCopySection = useCallback(
    (sectionId: string) => {
      const section = sections.find((s) => s.id === sectionId);
      if (!section) return;
      const timeSignature = session?.timeSignature ?? "4/4";
      const { startTick, endTick } = getSectionTickRange(section, timeSignature);
      const copied = copyNotesForSection(
        sequencer.notes,
        startTick,
        endTick,
        0, // store with 0 offset; will be re-offset on paste
      );
      setCopiedNotes(copied);
      addToast({
        message: `Copied ${copied.length} note${copied.length !== 1 ? "s" : ""} from ${section.name}`,
        variant: "success",
        duration: 2000,
      });
    },
    [sections, session?.timeSignature, sequencer.notes, addToast],
  );

  const handlePasteToSection = useCallback(
    (targetSectionId: string) => {
      if (!copiedNotes || copiedNotes.length === 0) return;
      const targetSection = sections.find((s) => s.id === targetSectionId);
      if (!targetSection) return;
      const timeSignature = session?.timeSignature ?? "4/4";
      const { startTick: targetStart } = getSectionTickRange(targetSection, timeSignature);

      // Offset the copied notes (stored at offset 0) to the target section
      const notesToAdd: Note[] = copiedNotes.map((n) => ({
        ...n,
        id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        startTick: n.startTick + targetStart,
      }));

      sequencer.addBulkNotes(notesToAdd);
      addToast({
        message: `Pasted ${notesToAdd.length} note${notesToAdd.length !== 1 ? "s" : ""} to ${targetSection.name}`,
        variant: "success",
        duration: 2000,
      });
    },
    [copiedNotes, sections, session?.timeSignature, sequencer, addToast],
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

  // ------- MusicXML import -------
  const musicxmlInputRef = useRef<HTMLInputElement>(null);
  const handleImportMusicXML = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/musicxml/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Import failed" }));
        throw new Error(data.error ?? "Import failed");
      }

      const result = await res.json();
      const importedTracks: Array<{ name: string; instrument: InstrumentType }> =
        result.tracks ?? [];

      // Create any tracks the import needs that don't exist yet. Imported
      // parts are 1:1 mapped onto session tracks by index, so if the file
      // has more parts than the session has tracks (or the session has zero
      // tracks), POST new ones using the parsed metadata.
      const trackMap: string[] = tracks.map((t) => t.id); // index → real id
      if (session?.id) {
        for (let i = tracks.length; i < importedTracks.length; i++) {
          const importedTrack = importedTracks[i];
          try {
            const r = await fetch(`/api/session/${session.id}/tracks`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: importedTrack.name,
                instrument: importedTrack.instrument,
              }),
            });
            if (r.ok) {
              const { track } = (await r.json()) as { track: { id: string } };
              trackMap[i] = track.id;
            }
          } catch {
            // If track creation fails, we'll fall back to track 0 below
          }
        }
        // Pull the freshly created tracks into the session context
        if (importedTracks.length > tracks.length) {
          await refreshSession();
        }
      }

      // Apply imported notes to sequencer with their real track IDs
      if (result.notes?.length > 0) {
        const fallbackTrackId = trackMap[0];
        const importedNotes: Note[] = result.notes
          .map((n: Omit<Note, "id">, idx: number) => {
            const trackIndexMatch = n.trackId.match(/import_track_(\d+)/);
            const trackIndex = trackIndexMatch ? parseInt(trackIndexMatch[1], 10) : 0;
            const realId = trackMap[trackIndex] ?? fallbackTrackId;
            if (!realId) return null;
            return {
              ...n,
              id: `imported_${Date.now()}_${idx}`,
              trackId: realId,
            };
          })
          .filter((n: Note | null): n is Note => n !== null);
        if (importedNotes.length > 0) {
          sequencer.addBulkNotes(importedNotes);
        }
      }

      // Apply session settings
      if (result.bpm && result.bpm !== 120) {
        updateSession({ bpm: result.bpm });
        setBpm(result.bpm);
      }
      if (result.keySignature) {
        updateSession({ keySignature: result.keySignature });
      }
      if (result.timeSignature) {
        updateSession({ timeSignature: result.timeSignature });
      }

      setSequencerVisible(true);
      setSheetMusicVisible(true);
      addToast({
        message: `Imported ${result.notes?.length ?? 0} notes from ${file.name}`,
        variant: "success",
        duration: 3000,
      });
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : "Failed to import MusicXML",
        variant: "error",
      });
    }

    // Reset input so same file can be re-imported
    if (musicxmlInputRef.current) {
      musicxmlInputRef.current.value = "";
    }
  }, [tracks, session?.id, refreshSession, sequencer, updateSession, setBpm, addToast]);

  // ------- Fork/branch session -------
  const [isForking, setIsForking] = useState(false);
  const handleForkSession = useCallback(async () => {
    if (!session?.id || isForking) return;
    setIsForking(true);
    try {
      const res = await fetch(`/api/session/${session.id}/branch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: `Fork of ${session.title}` }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to fork session");
      }
      const data = await res.json();
      addToast({ message: "Session forked!", variant: "success", duration: 3000 });
      router.push(`/session/${data.session.id}`);
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : "Failed to fork session",
        variant: "error",
      });
    } finally {
      setIsForking(false);
    }
  }, [session?.id, session?.title, isForking, addToast, router]);

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
    { key: "chat", label: "Chat" },
    { key: "arrange", label: "Arrange" },
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
              {canUndoAI && (
                <Tooltip content="Undo last AI action">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUndoAI}
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
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    <span className="hidden sm:inline">Undo AI</span>
                  </Button>
                </Tooltip>
              )}
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
              <Tooltip content="Fork this session">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleForkSession}
                  disabled={isForking}
                  loading={isForking}
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
                    <circle cx="12" cy="18" r="3" />
                    <circle cx="6" cy="6" r="3" />
                    <circle cx="18" cy="6" r="3" />
                    <path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" />
                    <path d="M12 12v3" />
                  </svg>
                  <span className="hidden sm:inline">Fork</span>
                </Button>
              </Tooltip>
              <Tooltip content="Import MusicXML">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => musicxmlInputRef.current?.click()}
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
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span className="hidden sm:inline">Import</span>
                </Button>
              </Tooltip>
              <input
                ref={musicxmlInputRef}
                type="file"
                accept=".musicxml,.xml,.mxl"
                onChange={handleImportMusicXML}
                className="hidden"
              />
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
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
            <ArrangementPanel
              sections={sections}
              onAddSection={handleAddSection}
              onDeleteSection={handleDeleteSection}
              onUpdateSection={handleUpdateSection}
              onRequestAIGenerate={handleRequestAIGenerate}
              onAddChordsToSequencer={handleAddChordsToSequencer}
              onReorderSections={handleReorderSections}
              onLoopSection={handleLoopSection}
              onClearLoop={handleClearLoop}
              loopingSectionId={loopingSectionId}
              onCopySection={handleCopySection}
              onPasteToSection={handlePasteToSection}
              hasCopiedNotes={copiedNotes !== null && copiedNotes.length > 0}
            />
            <button
              onClick={() => setSequencerVisible((v) => !v)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                sequencerVisible
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  : "border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300",
              )}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-transform", sequencerVisible && "rotate-90")}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {sequencerVisible ? "Hide Piano Roll" : "Show Piano Roll"}
              {sequencer.notes.length > 0 && (
                <span className="rounded-full bg-neutral-700 px-1.5 py-0.5 text-[10px] text-neutral-300">
                  {sequencer.notes.length} notes
                </span>
              )}
            </button>
            <button
              onClick={() => setSheetMusicVisible((v) => !v)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                sheetMusicVisible
                  ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
                  : "border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300",
              )}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-transform", sheetMusicVisible && "rotate-90")}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {sheetMusicVisible ? "Hide Sheet Music" : "Show Sheet Music"}
            </button>
            {sheetMusicVisible && (
              <SheetMusicView
                tracks={tracks}
                notes={sequencer.notes}
                bpm={session.bpm}
                keySignature={session.keySignature}
                timeSignature={session.timeSignature}
                className="min-h-[200px]"
              />
            )}
            {sequencerVisible && (
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
                onUpdateVelocity={sequencer.updateNoteVelocity}
                onPlay={handlePlay}
                onStop={stop}
                onSetPlayhead={setPosition}
                onSetBpm={handleBpmChange}
                className="flex-1 min-h-[300px]"
              />
            )}
          </div>
        )}

        {mobileTab === "chat" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <ChatPanel
              sessionId={session.id}
              context={chatContext}
              apiKey={apiKey}
              sendMessageRef={chatSendRef}
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
            onTranscribeToMidi={handleTranscribeToMidi}
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
          {/* Loading indicator during auto-kickoff */}
          {isAutoKicking && sections.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-1.5 rounded-full bg-amber-500/60 waveform-bar"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <p className="text-sm text-neutral-400">Building your arrangement...</p>
            </div>
          )}

          {/* Arrangement panel */}
          <ArrangementPanel
            sections={sections}
            onAddSection={handleAddSection}
            onDeleteSection={handleDeleteSection}
            onUpdateSection={handleUpdateSection}
            onRequestAIGenerate={handleRequestAIGenerate}
            onAddChordsToSequencer={handleAddChordsToSequencer}
            onLoopSection={handleLoopSection}
            onClearLoop={handleClearLoop}
            loopingSectionId={loopingSectionId}
            onCopySection={handleCopySection}
            onPasteToSection={handlePasteToSection}
            hasCopiedNotes={copiedNotes !== null && copiedNotes.length > 0}
          />

          {/* Sequencer & Sheet Music toggles */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setSequencerVisible((v) => !v)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
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

            <button
              onClick={() => setSheetMusicVisible((v) => !v)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                sheetMusicVisible
                  ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
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
                className={cn("transition-transform", sheetMusicVisible && "rotate-90")}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {sheetMusicVisible ? "Hide Sheet Music" : "Show Sheet Music"}
            </button>
          </div>

          {/* Sheet Music View (above sequencer when both visible) */}
          {sheetMusicVisible && (
            <div className="mt-3 min-h-[250px]">
              <SheetMusicView
                tracks={tracks}
                notes={sequencer.notes}
                bpm={session.bpm}
                keySignature={session.keySignature}
                timeSignature={session.timeSignature}
                className="h-full"
              />
            </div>
          )}

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
                onUpdateVelocity={sequencer.updateNoteVelocity}
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

        {/* Capture panel popover with backdrop */}
        {captureOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setCaptureOpen(false)}
            />
            <div className="fixed bottom-24 right-6 z-40 w-80 rounded-2xl border border-neutral-700 bg-[#0a0a0a] shadow-2xl shadow-black/50">
              <CapturePanel
                collapsed={false}
                onAddToSession={handleCaptureAddToSession}
                onTranscribeToMidi={handleTranscribeToMidi}
                className="border-l-0 rounded-2xl"
              />
            </div>
          </>
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
