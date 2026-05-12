"use client";

import { useCallback, useReducer } from "react";
import {
  type TimelineState,
  type TimelineClip,
  type TimelineTrack,
  type Marker,
  type Region,
  makeTimelineClip,
  makeTimelineTrack,
  makeMarker,
  makeRegion,
  PPQ_DEFAULT,
} from "./types";

// Re-export PPQ for consumer convenience
export { PPQ_DEFAULT as PPQ } from "./types";

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

export function defaultTimelineState(overrides?: Partial<TimelineState>): TimelineState {
  return {
    bpm: 120,
    timeSignature: "4/4",
    playheadTick: 0,
    scrollTick: 0,
    pixelsPerTick: 0.25,
    tracks: [],
    markers: [],
    regions: [],
    activeLoopRegionId: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Action =
  | { type: "SET_PLAYHEAD"; tick: number }
  | { type: "SET_SCROLL"; tick: number }
  | { type: "SET_ZOOM"; pixelsPerTick: number }
  | { type: "SET_BPM"; bpm: number }
  | { type: "ADD_TRACK"; track: TimelineTrack }
  | { type: "REMOVE_TRACK"; trackId: string }
  | { type: "UPDATE_TRACK"; trackId: string; updates: Partial<Omit<TimelineTrack, "id" | "clips">> }
  | { type: "ADD_CLIP"; clip: TimelineClip }
  | { type: "REMOVE_CLIP"; clipId: string }
  | { type: "MOVE_CLIP"; clipId: string; startTick: number; trackId?: string }
  | { type: "RESIZE_CLIP"; clipId: string; durationTicks: number; contentOffsetTicks?: number }
  | { type: "UPDATE_CLIP"; clipId: string; updates: Partial<TimelineClip> }
  | { type: "ADD_MARKER"; marker: Marker }
  | { type: "REMOVE_MARKER"; markerId: string }
  | { type: "ADD_REGION"; region: Region }
  | { type: "REMOVE_REGION"; regionId: string }
  | { type: "SET_ACTIVE_LOOP"; regionId: string | null }
  | { type: "RESET"; state: TimelineState };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function updateClipInTracks(
  tracks: TimelineTrack[],
  clipId: string,
  fn: (clip: TimelineClip) => TimelineClip,
): TimelineTrack[] {
  return tracks.map((t) => ({
    ...t,
    clips: t.clips.map((c) => (c.id === clipId ? fn(c) : c)),
  }));
}

function reducer(state: TimelineState, action: Action): TimelineState {
  switch (action.type) {
    case "SET_PLAYHEAD":
      return { ...state, playheadTick: Math.max(0, action.tick) };

    case "SET_SCROLL":
      return { ...state, scrollTick: Math.max(0, action.tick) };

    case "SET_ZOOM":
      return { ...state, pixelsPerTick: Math.max(0.01, Math.min(4, action.pixelsPerTick)) };

    case "SET_BPM":
      return { ...state, bpm: Math.max(20, Math.min(400, action.bpm)) };

    case "ADD_TRACK": {
      const exists = state.tracks.some((t) => t.id === action.track.id);
      if (exists) return state;
      return { ...state, tracks: [...state.tracks, action.track] };
    }

    case "REMOVE_TRACK":
      return { ...state, tracks: state.tracks.filter((t) => t.id !== action.trackId) };

    case "UPDATE_TRACK":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId ? { ...t, ...action.updates } : t,
        ),
      };

    case "ADD_CLIP": {
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.clip.trackId
            ? { ...t, clips: [...t.clips, action.clip].sort((a, b) => a.startTick - b.startTick) }
            : t,
        ),
      };
    }

    case "REMOVE_CLIP":
      return {
        ...state,
        tracks: state.tracks.map((t) => ({
          ...t,
          clips: t.clips.filter((c) => c.id !== action.clipId),
        })),
      };

    case "MOVE_CLIP": {
      const { clipId, startTick, trackId } = action;
      let newTracks = state.tracks;

      // If moving to a different track, remove from old and add to new
      if (trackId) {
        let movingClip: TimelineClip | null = null;
        newTracks = newTracks.map((t) => ({
          ...t,
          clips: t.clips.filter((c) => {
            if (c.id === clipId) { movingClip = c; return false; }
            return true;
          }),
        }));
        if (movingClip) {
          const updated: TimelineClip = { ...(movingClip as TimelineClip), startTick: Math.max(0, startTick), trackId };
          newTracks = newTracks.map((t) =>
            t.id === trackId
              ? { ...t, clips: [...t.clips, updated].sort((a, b) => a.startTick - b.startTick) }
              : t,
          );
        }
      } else {
        newTracks = updateClipInTracks(newTracks, clipId, (c) => ({
          ...c,
          startTick: Math.max(0, startTick),
        }));
      }

      return { ...state, tracks: newTracks };
    }

    case "RESIZE_CLIP":
      return {
        ...state,
        tracks: updateClipInTracks(state.tracks, action.clipId, (c) => ({
          ...c,
          durationTicks: Math.max(1, action.durationTicks),
          ...(action.contentOffsetTicks !== undefined
            ? { contentOffsetTicks: Math.max(0, action.contentOffsetTicks) }
            : {}),
        })),
      };

    case "UPDATE_CLIP":
      return {
        ...state,
        tracks: updateClipInTracks(state.tracks, action.clipId, (c) => ({
          ...c,
          ...action.updates,
        })),
      };

    case "ADD_MARKER": {
      const exists = state.markers.some((m) => m.id === action.marker.id);
      if (exists) return state;
      return {
        ...state,
        markers: [...state.markers, action.marker].sort((a, b) => a.tick - b.tick),
      };
    }

    case "REMOVE_MARKER":
      return { ...state, markers: state.markers.filter((m) => m.id !== action.markerId) };

    case "ADD_REGION": {
      const exists = state.regions.some((r) => r.id === action.region.id);
      if (exists) return state;
      return { ...state, regions: [...state.regions, action.region] };
    }

    case "REMOVE_REGION":
      return {
        ...state,
        regions: state.regions.filter((r) => r.id !== action.regionId),
        activeLoopRegionId:
          state.activeLoopRegionId === action.regionId ? null : state.activeLoopRegionId,
      };

    case "SET_ACTIVE_LOOP":
      return { ...state, activeLoopRegionId: action.regionId };

    case "RESET":
      return action.state;

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTimeline(initial?: Partial<TimelineState>) {
  const [state, dispatch] = useReducer(reducer, defaultTimelineState(initial));

  const setPlayhead = useCallback((tick: number) => dispatch({ type: "SET_PLAYHEAD", tick }), []);
  const setScroll = useCallback((tick: number) => dispatch({ type: "SET_SCROLL", tick }), []);
  const setZoom = useCallback((ppt: number) => dispatch({ type: "SET_ZOOM", pixelsPerTick: ppt }), []);
  const setBpm = useCallback((bpm: number) => dispatch({ type: "SET_BPM", bpm }), []);

  const addTrack = useCallback(
    (opts: Partial<TimelineTrack> & Pick<TimelineTrack, "id" | "name" | "type" | "laneIndex">) =>
      dispatch({ type: "ADD_TRACK", track: makeTimelineTrack(opts) }),
    [],
  );
  const removeTrack = useCallback((trackId: string) => dispatch({ type: "REMOVE_TRACK", trackId }), []);
  const updateTrack = useCallback(
    (trackId: string, updates: Partial<Omit<TimelineTrack, "id" | "clips">>) =>
      dispatch({ type: "UPDATE_TRACK", trackId, updates }),
    [],
  );

  const addClip = useCallback(
    (opts: Partial<TimelineClip> & Pick<TimelineClip, "id" | "trackId" | "startTick" | "durationTicks" | "type" | "contentRef">) =>
      dispatch({ type: "ADD_CLIP", clip: makeTimelineClip(opts) }),
    [],
  );
  const removeClip = useCallback((clipId: string) => dispatch({ type: "REMOVE_CLIP", clipId }), []);
  const moveClip = useCallback(
    (clipId: string, startTick: number, trackId?: string) =>
      dispatch({ type: "MOVE_CLIP", clipId, startTick, trackId }),
    [],
  );
  const resizeClip = useCallback(
    (clipId: string, durationTicks: number, contentOffsetTicks?: number) =>
      dispatch({ type: "RESIZE_CLIP", clipId, durationTicks, contentOffsetTicks }),
    [],
  );
  const updateClip = useCallback(
    (clipId: string, updates: Partial<TimelineClip>) =>
      dispatch({ type: "UPDATE_CLIP", clipId, updates }),
    [],
  );

  const addMarker = useCallback(
    (opts: Partial<Marker> & Pick<Marker, "id" | "tick" | "label">) =>
      dispatch({ type: "ADD_MARKER", marker: makeMarker(opts) }),
    [],
  );
  const removeMarker = useCallback((markerId: string) => dispatch({ type: "REMOVE_MARKER", markerId }), []);

  const addRegion = useCallback(
    (opts: Partial<Region> & Pick<Region, "id" | "type" | "startTick" | "endTick">) =>
      dispatch({ type: "ADD_REGION", region: makeRegion(opts) }),
    [],
  );
  const removeRegion = useCallback((regionId: string) => dispatch({ type: "REMOVE_REGION", regionId }), []);
  const setActiveLoop = useCallback(
    (regionId: string | null) => dispatch({ type: "SET_ACTIVE_LOOP", regionId }),
    [],
  );

  const reset = useCallback(
    (newState: TimelineState) => dispatch({ type: "RESET", state: newState }),
    [],
  );

  return {
    state,
    setPlayhead,
    setScroll,
    setZoom,
    setBpm,
    addTrack,
    removeTrack,
    updateTrack,
    addClip,
    removeClip,
    moveClip,
    resizeClip,
    updateClip,
    addMarker,
    removeMarker,
    addRegion,
    removeRegion,
    setActiveLoop,
    reset,
  };
}
