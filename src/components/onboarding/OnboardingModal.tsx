"use client";

import { useState, useCallback } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const STEPS = [
  {
    title: "Welcome to Unbottle",
    body: "Unbottle turns your musical ideas into arrangements. Hum a melody, tap a beat, or just describe what you want — the AI does the rest.",
    icon: (
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-amber-400"
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    title: "Capture Your Ideas",
    body: "Tap the capture button to record a melody. Hum it, sing it, tap it — anything goes. AI converts it to MIDI notes instantly.",
    icon: (
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-amber-400"
      >
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
  },
  {
    title: "Start Creating",
    body: "Ready to make something? Hit 'Just Start' and the AI will greet you and guide your first session.",
    icon: (
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-amber-400"
      >
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
] as const;

interface OnboardingModalProps {
  userId: string;
  onComplete: () => void;
}

export function OnboardingModal({ userId, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(true);

  const markComplete = useCallback(async () => {
    const client = createClient();
    await client
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", userId);
    setOpen(false);
    onComplete();
  }, [userId, onComplete]);

  const handleSkip = useCallback(() => {
    void markComplete();
  }, [markComplete]);

  const handleDone = useCallback(() => {
    void markComplete();
  }, [markComplete]);

  const handlePrev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const handleNext = useCallback(() => {
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }, []);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <Dialog open={open} onClose={handleSkip}>
      <div className="flex flex-col items-center gap-6 pb-2 text-center">
        {/* Icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/15">
          {current.icon}
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-neutral-50">{current.title}</h2>
          <p className="text-sm leading-relaxed text-neutral-400">{current.body}</p>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={[
                "block h-2 rounded-full transition-all duration-300",
                i === step
                  ? "w-6 bg-amber-500"
                  : "w-2 bg-neutral-700",
              ].join(" ")}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex w-full items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-neutral-500 underline underline-offset-4 transition-colors hover:text-neutral-300"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={handlePrev}>
                Back
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={handleDone}>
                Done
              </Button>
            ) : (
              <Button size="sm" onClick={handleNext}>
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
