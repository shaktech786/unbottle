// Re-export all types from a single entry point
export type {
  NoteName,
  Octave,
  Pitch,
  Note,
  Chord,
  ChordEvent,
  SectionType,
  Section,
  InstrumentType,
  Track,
  Session,
  Bookmark,
  CaptureData,
  ChatMessage,
  Suggestion,
  SequencerState,
} from "@/lib/music/types";

export { PPQ, barsToTicks, ticksToSeconds, chordToString } from "@/lib/music/types";

// API types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface ChatRequest {
  sessionId: string;
  message: string;
  context?: {
    bpm?: number;
    keySignature?: string;
    timeSignature?: string;
    genre?: string;
    mood?: string;
    sections?: Section[];
    tracks?: Track[];
  };
}

export interface ArrangementRequest {
  prompt: string;
  key?: string;
  genre?: string;
  mood?: string;
  existingSections?: Section[];
}

export interface ArrangementResponse {
  sections: Section[];
  suggestions: string[];
}

export interface MomentumResponse {
  suggestions: Suggestion[];
  nextStep: string;
}

export interface MidiExportRequest {
  sessionId: string;
  trackIds?: string[];
}

// Import Section and Track for use in interfaces above
import type { Section, Track, Suggestion } from "@/lib/music/types";
