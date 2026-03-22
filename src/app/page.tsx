import Link from "next/link";
import { Waveform } from "@/components/landing/waveform";
import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { WorkspacePreview } from "@/components/landing/workspace-preview";

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      {/* ================================================================ */}
      {/* HERO                                                             */}
      {/* ================================================================ */}
      <section className="relative flex flex-col items-center justify-center px-4 pt-24 pb-16 text-center sm:px-6 sm:pt-36 sm:pb-24 md:pt-44 md:pb-32 overflow-hidden">
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full bg-amber-glow/8 blur-[120px] animate-glow-pulse" />
          <div className="absolute left-1/3 top-2/3 h-[300px] w-[400px] rounded-full bg-teal-accent/5 blur-[100px]" />
        </div>

        <p className="text-sm font-medium tracking-wide text-amber-glow/80 uppercase mb-6 sm:mb-8">
          AI-powered production for solo musicians
        </p>

        <h1 className="font-heading max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-warm-white sm:text-5xl md:text-6xl lg:text-7xl">
          The music in your head deserves to exist.
        </h1>

        <div className="mt-10 sm:mt-14">
          <Waveform />
        </div>

        <div className="mt-10 sm:mt-12">
          <Link href="/dashboard">
            <button className="group relative inline-flex items-center justify-center rounded-xl bg-amber-glow px-8 py-4 text-base font-semibold text-[#0a0a0a] transition-all hover:bg-amber-deep hover:shadow-[0_0_40px_rgba(245,158,11,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-glow focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] min-h-[48px]">
              Start a Session
            </button>
          </Link>
        </div>
      </section>

      {/* ================================================================ */}
      {/* CREDIBILITY LINE                                                 */}
      {/* ================================================================ */}
      <div className="border-t border-white/5 py-6 text-center">
        <p className="text-sm text-muted tracking-wide">
          Built for musicians with ADHD. No tutorials required.
        </p>
      </div>

      {/* ================================================================ */}
      {/* THE PROBLEM                                                      */}
      {/* ================================================================ */}
      <section className="relative px-4 py-20 sm:px-6 sm:py-28 md:py-36">
        <div className="mx-auto max-w-4xl">
          <ScrollReveal>
            <p className="text-sm font-medium tracking-wide text-amber-glow/70 uppercase mb-4">
              The gap
            </p>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <h2 className="font-heading text-3xl font-bold leading-tight text-warm-white sm:text-4xl md:text-5xl max-w-2xl">
              You hear the whole track in your head.
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <p className="mt-6 text-xl leading-relaxed text-warm-gray/70 max-w-xl">
              Then you open your DAW, and...
            </p>
          </ScrollReveal>

          {/* Pain points -- asymmetric, narrative layout */}
          <div className="mt-14 sm:mt-20 space-y-10 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-x-8 sm:gap-y-14">
            <ScrollReveal
              className="sm:col-span-7"
              delay={300}
            >
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8 backdrop-blur-sm">
                <p className="text-lg leading-relaxed text-warm-gray">
                  Twenty minutes choosing a kick drum. Another twenty on a synth
                  preset. The melody you heard so clearly is already fading.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal
              className="sm:col-start-4 sm:col-span-9"
              delay={400}
            >
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8 backdrop-blur-sm">
                <p className="text-lg leading-relaxed text-warm-gray">
                  You watch a 40-minute tutorial on sidechain compression.
                  By the time you get back to your project, you have forgotten
                  what the song was supposed to feel like.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal
              className="sm:col-span-8"
              delay={500}
            >
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8 backdrop-blur-sm">
                <p className="text-lg leading-relaxed text-warm-gray">
                  A hundred project files. Zero finished tracks.
                  Not because you lack talent, but because the tools were not
                  built for how your brain works.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* THE SOLUTION                                                     */}
      {/* ================================================================ */}
      <section className="relative px-4 py-20 sm:px-6 sm:py-28 md:py-36 overflow-hidden">
        {/* Subtle divider glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 max-w-xl bg-gradient-to-r from-transparent via-amber-glow/20 to-transparent"
        />

        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <p className="text-sm font-medium tracking-wide text-amber-glow/70 uppercase mb-4">
              A different approach
            </p>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <h2 className="font-heading text-3xl font-bold leading-tight text-warm-white sm:text-4xl md:text-5xl max-w-2xl">
              Describe it. Unbottle builds it.
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <p className="mt-6 text-lg leading-relaxed text-warm-gray/70 max-w-xl">
              Talk to your AI producer like you would talk to a bandmate.
              Hum the melody, describe the vibe, tap out the rhythm.
              Unbottle handles the production so you stay in the creative zone.
            </p>
          </ScrollReveal>

          {/* Workspace preview */}
          <ScrollReveal delay={300}>
            <div className="mt-14 sm:mt-20">
              <WorkspacePreview />
            </div>
          </ScrollReveal>

          {/* Differentiators */}
          <div className="mt-14 sm:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
            <ScrollReveal delay={400}>
              <div className="space-y-3">
                <div className="h-1 w-10 rounded-full bg-amber-glow/60" />
                <h3 className="font-heading text-lg font-semibold text-warm-white">
                  No blank canvas
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  Start with a conversation, not an empty timeline.
                  Your first idea becomes a working sketch in seconds.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={500}>
              <div className="space-y-3">
                <div className="h-1 w-10 rounded-full bg-teal-accent/60" />
                <h3 className="font-heading text-lg font-semibold text-warm-white">
                  Non-linear by default
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  Jump between chorus and verse. Branch into variations.
                  Your workflow matches your brain, not the other way around.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={600}>
              <div className="space-y-3">
                <div className="h-1 w-10 rounded-full bg-amber-glow/40" />
                <h3 className="font-heading text-lg font-semibold text-warm-white">
                  Producer, not teacher
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  Unbottle does not explain reverb to you. It applies it, the
                  way you described, and moves on. Like a session partner who
                  just gets it.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* HOW IT WORKS                                                     */}
      {/* ================================================================ */}
      <section className="relative px-4 py-20 sm:px-6 sm:py-28 md:py-36">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 max-w-xl bg-gradient-to-r from-transparent via-white/5 to-transparent"
        />

        <div className="mx-auto max-w-4xl">
          <ScrollReveal>
            <p className="text-sm font-medium tracking-wide text-amber-glow/70 uppercase mb-4 text-center">
              Three steps
            </p>
            <h2 className="font-heading text-3xl font-bold text-warm-white sm:text-4xl md:text-5xl text-center">
              From spark to finished track
            </h2>
          </ScrollReveal>

          {/* Steps -- horizontal on desktop, vertical on mobile */}
          <div className="mt-16 sm:mt-20 flex flex-col sm:flex-row items-start sm:items-stretch gap-8 sm:gap-0">
            {/* Step 1 */}
            <ScrollReveal className="flex-1" delay={100}>
              <div className="flex flex-col items-center text-center px-4">
                {/* Visual element: sound waves */}
                <div className="mb-6 flex items-center justify-center h-16 w-16 rounded-2xl bg-white/[0.05] border border-white/10">
                  <div className="flex items-end gap-[3px] h-8">
                    {[0.5, 0.8, 1, 0.7, 0.4].map((scale, i) => (
                      <div
                        key={i}
                        className="w-[3px] rounded-full bg-amber-glow/70"
                        style={{ height: `${scale * 28}px` }}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-xs font-medium text-amber-glow/50 tracking-widest uppercase mb-2">
                  01
                </span>
                <h3 className="font-heading text-xl font-semibold text-warm-white mb-2">
                  Describe
                </h3>
                <p className="text-sm leading-relaxed text-muted max-w-[220px]">
                  Hum it, tap it, or tell your AI producer what you hear.
                  Voice, text, whatever is fastest.
                </p>
              </div>
            </ScrollReveal>

            {/* Connector */}
            <div className="hidden sm:flex items-center flex-shrink-0">
              <div className="h-px w-12 bg-gradient-to-r from-amber-glow/30 to-teal-accent/20 animate-draw-line" />
            </div>

            {/* Step 2 */}
            <ScrollReveal className="flex-1" delay={250}>
              <div className="flex flex-col items-center text-center px-4">
                {/* Visual element: blocks/arrangement */}
                <div className="mb-6 flex items-center justify-center h-16 w-16 rounded-2xl bg-white/[0.05] border border-white/10">
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                      <div className="h-2 w-5 rounded-sm bg-teal-accent/50" />
                      <div className="h-2 w-3 rounded-sm bg-amber-glow/40" />
                    </div>
                    <div className="flex gap-1">
                      <div className="h-2 w-3 rounded-sm bg-amber-glow/40" />
                      <div className="h-2 w-5 rounded-sm bg-teal-accent/50" />
                    </div>
                    <div className="flex gap-1">
                      <div className="h-2 w-4 rounded-sm bg-amber-glow/30" />
                      <div className="h-2 w-4 rounded-sm bg-teal-accent/30" />
                    </div>
                  </div>
                </div>
                <span className="text-xs font-medium text-amber-glow/50 tracking-widest uppercase mb-2">
                  02
                </span>
                <h3 className="font-heading text-xl font-semibold text-warm-white mb-2">
                  Create
                </h3>
                <p className="text-sm leading-relaxed text-muted max-w-[220px]">
                  AI builds out chords, melody, and arrangement.
                  Iterate on what you like, discard what you do not.
                </p>
              </div>
            </ScrollReveal>

            {/* Connector */}
            <div className="hidden sm:flex items-center flex-shrink-0">
              <div className="h-px w-12 bg-gradient-to-r from-teal-accent/20 to-amber-glow/30 animate-draw-line" />
            </div>

            {/* Step 3 */}
            <ScrollReveal className="flex-1" delay={400}>
              <div className="flex flex-col items-center text-center px-4">
                {/* Visual element: export/file */}
                <div className="mb-6 flex items-center justify-center h-16 w-16 rounded-2xl bg-white/[0.05] border border-white/10">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="h-5 w-5 rounded-t-sm border border-amber-glow/30 border-b-0 bg-amber-glow/5" />
                    <div className="h-1.5 w-7 rounded-b-sm bg-amber-glow/20" />
                    <div className="mt-1 h-px w-5 bg-amber-glow/20" />
                    <div className="h-px w-4 bg-amber-glow/10" />
                  </div>
                </div>
                <span className="text-xs font-medium text-amber-glow/50 tracking-widest uppercase mb-2">
                  03
                </span>
                <h3 className="font-heading text-xl font-semibold text-warm-white mb-2">
                  Export
                </h3>
                <p className="text-sm leading-relaxed text-muted max-w-[220px]">
                  Download stems, MIDI, or a full mix.
                  Take it into your DAW or share it directly.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FINAL CTA                                                        */}
      {/* ================================================================ */}
      <section className="relative flex flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28 md:py-36">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 max-w-xl bg-gradient-to-r from-transparent via-amber-glow/20 to-transparent"
        />

        {/* Ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-amber-glow/5 blur-[100px] animate-glow-pulse" />
        </div>

        <ScrollReveal>
          <h2 className="font-heading max-w-xl text-3xl font-bold leading-tight text-warm-white sm:text-4xl md:text-5xl">
            Stop losing ideas to your DAW&apos;s learning curve.
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <div className="mt-10 sm:mt-12">
            <Link href="/dashboard">
              <button className="group relative inline-flex items-center justify-center rounded-xl bg-amber-glow px-10 py-4 text-lg font-semibold text-[#0a0a0a] transition-all hover:bg-amber-deep hover:shadow-[0_0_50px_rgba(245,158,11,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-glow focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] min-h-[52px]">
                Start a Session
              </button>
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* ================================================================ */}
      {/* FOOTER                                                           */}
      {/* ================================================================ */}
      <footer className="border-t border-white/5 py-10 text-center">
        <p className="text-sm text-dim">
          Made for musicians who work alone.
        </p>
      </footer>
    </div>
  );
}
