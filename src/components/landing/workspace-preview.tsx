/**
 * A stylized, CSS-only representation of the Unbottle workspace.
 * Dark blocks that suggest a chat + arrangement interface without
 * being a literal screenshot.
 */
export function WorkspacePreview() {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4 backdrop-blur-sm shadow-[0_0_60px_rgba(245,158,11,0.08)]">
      {/* Window chrome */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
        <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
        <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
        <div className="ml-4 h-2 w-20 rounded-full bg-white/5" />
      </div>

      {/* Two-column layout suggestion */}
      <div className="flex gap-3 sm:gap-4 min-h-[200px] sm:min-h-[280px]">
        {/* Chat/conversation panel */}
        <div className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 sm:p-4 flex flex-col gap-3">
          {/* User message */}
          <div className="self-end max-w-[75%]">
            <div className="rounded-lg bg-amber-glow/10 border border-amber-glow/10 px-3 py-2">
              <div className="h-2 w-28 rounded-full bg-amber-glow/20" />
              <div className="mt-1.5 h-2 w-20 rounded-full bg-amber-glow/15" />
            </div>
          </div>

          {/* AI response */}
          <div className="self-start max-w-[80%]">
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.03] px-3 py-2">
              <div className="h-2 w-32 rounded-full bg-white/10" />
              <div className="mt-1.5 h-2 w-24 rounded-full bg-white/8" />
              <div className="mt-1.5 h-2 w-28 rounded-full bg-white/6" />
            </div>
          </div>

          {/* User follow-up */}
          <div className="self-end max-w-[70%]">
            <div className="rounded-lg bg-amber-glow/10 border border-amber-glow/10 px-3 py-2">
              <div className="h-2 w-24 rounded-full bg-amber-glow/20" />
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Input area */}
          <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
            <div className="h-2 w-36 rounded-full bg-white/5" />
          </div>
        </div>

        {/* Arrangement/tracks panel */}
        <div className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 sm:p-4 flex flex-col gap-2">
          {/* Track labels */}
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-10 rounded-full bg-white/8" />
            <div className="flex-1" />
            <div className="h-2 w-6 rounded-full bg-white/5" />
          </div>

          {/* Track rows */}
          <div className="flex items-center gap-2">
            <div className="h-2 w-8 rounded-sm bg-white/8 flex-shrink-0" />
            <div className="flex-1 h-6 rounded-sm bg-amber-glow/8 relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-3/5 bg-amber-glow/10 rounded-sm" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-2 w-8 rounded-sm bg-white/8 flex-shrink-0" />
            <div className="flex-1 h-6 rounded-sm bg-teal-accent/8 relative overflow-hidden">
              <div className="absolute inset-y-0 left-[10%] w-2/5 bg-teal-accent/12 rounded-sm" />
              <div className="absolute inset-y-0 left-[55%] w-1/4 bg-teal-accent/10 rounded-sm" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-2 w-8 rounded-sm bg-white/8 flex-shrink-0" />
            <div className="flex-1 h-6 rounded-sm bg-amber-glow/6 relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-4/5 bg-amber-glow/8 rounded-sm" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-2 w-8 rounded-sm bg-white/8 flex-shrink-0" />
            <div className="flex-1 h-6 rounded-sm bg-white/[0.03] relative overflow-hidden">
              <div className="absolute inset-y-0 left-[5%] w-1/3 bg-white/5 rounded-sm" />
              <div className="absolute inset-y-0 left-[45%] w-2/5 bg-white/4 rounded-sm" />
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Transport bar */}
          <div className="flex items-center gap-3 pt-2 border-t border-white/5">
            <div className="h-3 w-3 rounded-full border border-amber-glow/20 bg-amber-glow/5" />
            <div className="flex-1 h-1 rounded-full bg-white/5 relative">
              <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-amber-glow/20" />
            </div>
            <div className="h-2 w-8 rounded-full bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
