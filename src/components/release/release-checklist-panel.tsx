"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import type {
  ReleaseChecklist,
  ReleaseStep,
  ReleaseStepCategory,
  DistributionStatus,
} from "@/lib/release/types";
import { deriveReleaseStatus } from "@/lib/release/types";
import { createClient } from "@/lib/supabase/client";
import {
  getOrCreateReleaseChecklist,
  updateReleaseChecklist,
} from "@/lib/release/db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<ReleaseStepCategory, string> = {
  mastering: "Mastering",
  metadata: "Metadata",
  distribution: "Distribution",
};

const CATEGORY_ORDER: ReleaseStepCategory[] = [
  "mastering",
  "metadata",
  "distribution",
];

const DISTRIBUTION_STATUS_LABELS: Record<DistributionStatus, string> = {
  not_submitted: "Not submitted",
  submitted: "Submitted",
  distributed: "Distributed",
  live: "Live",
};

const DISTRIBUTION_STATUS_COLORS: Record<DistributionStatus, string> = {
  not_submitted: "text-neutral-400",
  submitted: "text-amber-400",
  distributed: "text-blue-400",
  live: "text-emerald-400",
};

const STATUS_ORDER: DistributionStatus[] = [
  "not_submitted",
  "submitted",
  "distributed",
  "live",
];

function progressPercent(steps: ReleaseStep[]): number {
  if (steps.length === 0) return 0;
  return Math.round((steps.filter((s) => s.completed).length / steps.length) * 100);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepRow({
  step,
  onToggle,
  onNote,
}: {
  step: ReleaseStep;
  onToggle: (id: string) => void;
  onNote: (id: string, notes: string) => void;
}) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(step.notes ?? "");

  function commitNote() {
    setEditingNote(false);
    onNote(step.id, noteValue);
  }

  return (
    <div className="group flex flex-col gap-1 py-2">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(step.id)}
          aria-label={step.completed ? "Mark incomplete" : "Mark complete"}
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors",
            step.completed
              ? "border-emerald-500 bg-emerald-500"
              : "border-neutral-600 hover:border-emerald-400",
          )}
        >
          {step.completed && (
            <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6l3 3 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
        <span
          className={cn(
            "flex-1 text-sm leading-5",
            step.completed ? "line-through text-neutral-500" : "text-neutral-200",
          )}
        >
          {step.label}
        </span>
        <button
          onClick={() => setEditingNote((v) => !v)}
          className="opacity-0 group-hover:opacity-100 text-xs text-neutral-500 hover:text-neutral-300 transition-opacity"
        >
          note
        </button>
      </div>

      {editingNote && (
        <div className="ml-8 flex gap-2">
          <input
            autoFocus
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitNote();
              if (e.key === "Escape") setEditingNote(false);
            }}
            placeholder="Add a note..."
            className="flex-1 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={commitNote}
            className="text-xs text-amber-400 hover:text-amber-300"
          >
            save
          </button>
        </div>
      )}
      {!editingNote && step.notes && (
        <p className="ml-8 text-xs text-neutral-500 italic">{step.notes}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export interface ReleaseChecklistPanelProps {
  sessionId: string;
  className?: string;
}

export function ReleaseChecklistPanel({
  sessionId,
  className,
}: ReleaseChecklistPanelProps) {
  const [checklist, setChecklist] = useState<ReleaseChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  // Initial load + realtime subscription
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getOrCreateReleaseChecklist(supabase, sessionId);
        if (!cancelled) setChecklist(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel(`release-checklist:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "release_checklists",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new) {
            const row = payload.new as {
              id: string;
              session_id: string;
              steps: ReleaseStep[];
              status: string;
              distribution_status: string;
              created_at: string;
              updated_at: string;
            };
            setChecklist({
              id: row.id,
              sessionId: row.session_id,
              steps: row.steps,
              status: row.status as ReleaseChecklist["status"],
              distributionStatus: row.distribution_status as DistributionStatus,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            });
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const persistSteps = useCallback(
    async (steps: ReleaseStep[]) => {
      if (!checklist) return;
      setSaving(true);
      try {
        const updated = await updateReleaseChecklist(supabase, checklist.id, { steps });
        setChecklist(updated);
      } finally {
        setSaving(false);
      }
    },
    [checklist, supabase],
  );

  const handleToggle = useCallback(
    (stepId: string) => {
      if (!checklist) return;
      const steps = checklist.steps.map((s) =>
        s.id === stepId ? { ...s, completed: !s.completed } : s,
      );
      // Optimistic update
      setChecklist((c) =>
        c
          ? { ...c, steps, status: deriveReleaseStatus(steps) }
          : c,
      );
      persistSteps(steps);
    },
    [checklist, persistSteps],
  );

  const handleNote = useCallback(
    (stepId: string, notes: string) => {
      if (!checklist) return;
      const steps = checklist.steps.map((s) =>
        s.id === stepId ? { ...s, notes: notes || undefined } : s,
      );
      setChecklist((c) => (c ? { ...c, steps } : c));
      persistSteps(steps);
    },
    [checklist, persistSteps],
  );

  if (loading) {
    return (
      <div className={cn("animate-pulse rounded-xl bg-neutral-900/50 h-40", className)} />
    );
  }

  if (!checklist) return null;

  const pct = progressPercent(checklist.steps);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Header + progress */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-100">Release Checklist</h2>
        <span className="text-xs text-neutral-400">
          {checklist.steps.filter((s) => s.completed).length}/{checklist.steps.length} done
          {saving && " · saving…"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            pct === 100 ? "bg-emerald-500" : "bg-amber-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Grouped steps */}
      <div className="flex flex-col gap-4">
        {CATEGORY_ORDER.map((cat) => {
          const steps = checklist.steps.filter((s) => s.category === cat);
          if (steps.length === 0) return null;
          const catDone = steps.every((s) => s.completed);
          return (
            <div key={cat}>
              <h3
                className={cn(
                  "text-xs font-medium uppercase tracking-wider mb-1",
                  catDone ? "text-emerald-500" : "text-neutral-500",
                )}
              >
                {CATEGORY_LABELS[cat]}
              </h3>
              <div className="divide-y divide-neutral-800">
                {steps.map((step) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    onToggle={handleToggle}
                    onNote={handleNote}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Distribution status */}
      <DistributionStatusSection checklist={checklist} onUpdate={setChecklist} supabase={supabase} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Distribution status section (MAIN-29)
// ---------------------------------------------------------------------------

function DistributionStatusSection({
  checklist,
  onUpdate,
  supabase,
}: {
  checklist: ReleaseChecklist;
  onUpdate: (c: ReleaseChecklist) => void;
  supabase: ReturnType<typeof createClient>;
}) {
  const [saving, setSaving] = useState(false);
  const currentIdx = STATUS_ORDER.indexOf(checklist.distributionStatus);

  async function advanceStatus() {
    const nextIdx = Math.min(currentIdx + 1, STATUS_ORDER.length - 1);
    const next = STATUS_ORDER[nextIdx];
    setSaving(true);
    try {
      const updated = await updateReleaseChecklist(supabase, checklist.id, {
        distributionStatus: next,
      });
      onUpdate(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-neutral-800 pt-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Distribution Status
        </span>
        {currentIdx < STATUS_ORDER.length - 1 && (
          <Button
            size="sm"
            variant="secondary"
            loading={saving}
            onClick={advanceStatus}
          >
            Mark as {DISTRIBUTION_STATUS_LABELS[STATUS_ORDER[currentIdx + 1]]}
          </Button>
        )}
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-1">
        {STATUS_ORDER.map((s, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s} className="flex items-center gap-1 flex-1 last:flex-none">
              <div
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  done ? (active ? "bg-amber-400 ring-2 ring-amber-400/30" : "bg-emerald-500") : "bg-neutral-700",
                )}
              />
              <span
                className={cn(
                  "text-xs truncate",
                  DISTRIBUTION_STATUS_COLORS[s],
                  !done && "text-neutral-600",
                )}
              >
                {DISTRIBUTION_STATUS_LABELS[s]}
              </span>
              {i < STATUS_ORDER.length - 1 && (
                <div className={cn("flex-1 h-px mx-1", done && i < currentIdx ? "bg-emerald-700" : "bg-neutral-800")} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
