import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  {
    title: "Capture in Seconds",
    description:
      "Hum, tap, or describe. Your idea is safe before it escapes.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    ),
  },
  {
    title: "AI Producer, Not Teacher",
    description:
      "A session partner that handles the boring parts and keeps you moving.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    title: "Built for Your Brain",
    description:
      "ADHD-friendly workflows. No forced linearity. No decision fatigue.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.5V20h6v-2.5c2.9-1.2 5-4.1 5-7.5a8 8 0 0 0-8-8Z" />
        <line x1="12" x2="12" y1="20" y2="22" />
        <line x1="9" x2="15" y1="22" y2="22" />
      </svg>
    ),
  },
] as const;

const steps = [
  {
    number: "01",
    label: "Capture",
    description: "Record audio, tap a rhythm, or describe what you hear in your head.",
  },
  {
    number: "02",
    label: "Structure",
    description: "AI analyzes your idea and suggests chords, melody, and arrangement.",
  },
  {
    number: "03",
    label: "Arrange",
    description: "Build out full sections with your AI co-producer. Branch and experiment freely.",
  },
  {
    number: "04",
    label: "Export",
    description: "Download stems, MIDI, or a full mix. Bring it into your DAW or share it.",
  },
] as const;

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 py-32 text-center sm:py-40 overflow-hidden">
        {/* Gradient background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 animate-gradient bg-gradient-to-br from-indigo-950 via-slate-950 to-violet-950 opacity-80"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.12),transparent_70%)]"
        />

        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-50 sm:text-5xl md:text-6xl">
          The music in your head
          <br />
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            deserves to exist.
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400 sm:text-xl">
          An AI producer that helps solo musicians go from idea to finished
          track &mdash; built for how your brain actually works.
        </p>

        <div className="mt-10">
          <Link href="/dashboard">
            <Button size="lg" className="text-base px-8">
              Start Creating
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-5xl px-6 py-24">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-indigo-400">
          Why Unbottle
        </h2>
        <p className="mt-2 text-center text-3xl font-bold text-slate-50 sm:text-4xl">
          Everything you need, nothing you don&apos;t
        </p>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} variant="interactive" className="flex flex-col gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-400">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-50">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-400">
                {f.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-800/60 bg-slate-900/30">
        <div className="mx-auto w-full max-w-4xl px-6 py-24">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-indigo-400">
            How it works
          </h2>
          <p className="mt-2 text-center text-3xl font-bold text-slate-50 sm:text-4xl">
            From spark to finished track
          </p>

          <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.number} className="flex flex-col gap-3">
                <span className="text-3xl font-bold text-indigo-500/40">
                  {s.number}
                </span>
                <h3 className="text-lg font-semibold text-slate-50">
                  {s.label}
                </h3>
                <p className="text-sm leading-relaxed text-slate-400">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="flex flex-col items-center px-6 py-24 text-center">
        <h2 className="max-w-lg text-3xl font-bold text-slate-50 sm:text-4xl">
          Stop letting great ideas die in your head.
        </h2>
        <p className="mt-4 max-w-md text-slate-400">
          Your next track is one session away. Let your AI producer handle the
          rest.
        </p>
        <div className="mt-8">
          <Link href="/dashboard">
            <Button size="lg" className="text-base px-8">
              Start Creating
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-8 text-center text-sm text-slate-500">
        Unbottle &mdash; AI music production for the rest of us.
      </footer>
    </div>
  );
}
