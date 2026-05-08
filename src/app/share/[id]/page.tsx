import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSession as getSessionDB, getLatestAudioCapture } from "@/lib/supabase/db";
import { getSession as getSessionMemory } from "@/lib/session/store";
import type { Session } from "@/lib/music/types";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

// 7 days in seconds
const SIGNED_URL_TTL = 7 * 24 * 60 * 60;

interface ShareData {
  session: Session;
  audioUrl: string | null;
}

async function fetchShareData(id: string): Promise<ShareData | null> {
  if (supabaseConfigured) {
    try {
      const client = await createClient();
      const session = await getSessionDB(client, id);
      if (!session || !session.isShared) return null;

      let audioUrl: string | null = null;
      const capture = await getLatestAudioCapture(client, session.id);
      if (capture?.audioUrl) {
        const captureId = capture.audioUrl.split("/").pop();
        if (captureId) {
          const storagePath = `${session.userId}/${captureId}.webm`;
          const { data: signed } = await client.storage
            .from("captures")
            .createSignedUrl(storagePath, SIGNED_URL_TTL);
          audioUrl = signed?.signedUrl ?? null;
        }
      }

      return { session, audioUrl };
    } catch {
      return null;
    }
  }

  const session = getSessionMemory(id);
  return session ? { session, audioUrl: null } : null;
}

function buildTweetText(title: string, shareUrl: string): string {
  // Max tweet length is 280. URLs count as 23 chars per Twitter's t.co wrapping.
  const urlDisplayLen = 23;
  const suffix = " — made with Unbottle ";
  // Available chars for the title: 280 - urlDisplayLen - suffix.length
  const maxTitleLen = 280 - urlDisplayLen - suffix.length;
  const truncated =
    title.length > maxTitleLen ? title.slice(0, maxTitleLen - 1) + "…" : title;
  return `${truncated}${suffix}${shareUrl}`;
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shareData = await fetchShareData(id);
  if (!shareData) notFound();

  const { session, audioUrl } = shareData;

  const headersList = await headers();
  const host = headersList.get("host") ?? "unbottle.com";
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  const shareUrl = `${proto}://${host}/share/${id}`;

  const tweetText = buildTweetText(session.title, shareUrl);
  const tweetHref = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  const meta = [session.genre, session.mood, session.bpm ? `${session.bpm} BPM` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4 py-16">
      <div className="w-full max-w-md space-y-8">
        {/* Track card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8 shadow-2xl shadow-black/40">
          {/* Waveform decoration */}
          <div className="mb-6 flex items-end gap-0.5 h-8" aria-hidden="true">
            {[4, 7, 5, 9, 6, 10, 7, 5, 8, 6, 9, 5, 7, 10, 6].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-full bg-amber-500/40"
                style={{ height: `${h * 10}%` }}
              />
            ))}
          </div>

          <h1 className="text-2xl font-bold text-warm-white leading-tight mb-2">
            {session.title}
          </h1>
          {meta && (
            <p className="text-sm text-neutral-400 mb-4">{meta}</p>
          )}

          {/* Audio player */}
          {audioUrl && (
            <audio
              src={audioUrl}
              controls
              preload="metadata"
              className="w-full mb-6 rounded-lg"
              aria-label={`Listen to ${session.title}`}
            />
          )}

          {/* Share on X button */}
          <a
            href={tweetHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-800 px-5 py-3 text-sm font-semibold text-neutral-100 transition-colors hover:bg-neutral-700 active:bg-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
          >
            {/* X (formerly Twitter) logo */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.257 5.626zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share on X
          </a>
        </div>

        {/* Made with Unbottle badge */}
        <div className="flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-neutral-800/80 border border-neutral-700/60 px-4 py-1.5 text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-200 hover:border-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
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
              className="text-amber-500/80"
              aria-hidden="true"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            Made with Unbottle
          </Link>
        </div>
      </div>
    </div>
  );
}
