/**
 * CSS-only animated waveform visualization for the hero section.
 * No canvas, no JS animation -- pure CSS keyframes.
 */
export function Waveform() {
  // Heights and delays create an organic, non-uniform wave
  const bars = [
    { height: 12, delay: 0 },
    { height: 20, delay: 0.15 },
    { height: 32, delay: 0.3 },
    { height: 24, delay: 0.1 },
    { height: 40, delay: 0.45 },
    { height: 28, delay: 0.2 },
    { height: 36, delay: 0.55 },
    { height: 16, delay: 0.35 },
    { height: 44, delay: 0.6 },
    { height: 20, delay: 0.25 },
    { height: 36, delay: 0.4 },
    { height: 28, delay: 0.5 },
    { height: 18, delay: 0.15 },
    { height: 40, delay: 0.65 },
    { height: 24, delay: 0.3 },
    { height: 32, delay: 0.7 },
    { height: 14, delay: 0.1 },
    { height: 24, delay: 0.45 },
    { height: 36, delay: 0.55 },
    { height: 16, delay: 0.2 },
    { height: 28, delay: 0.35 },
    { height: 20, delay: 0.5 },
    { height: 12, delay: 0.65 },
  ];

  return (
    <div
      className="flex items-center justify-center gap-[3px] h-12 opacity-40"
      aria-hidden="true"
    >
      {bars.map((bar, i) => (
        <div
          key={i}
          className="waveform-bar w-[2px] rounded-full bg-gradient-to-t from-amber-glow/60 to-teal-accent/40"
          style={{
            height: `${bar.height}px`,
            animationDelay: `${bar.delay}s`,
            animationDuration: `${1.0 + (i % 5) * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}
