# Unbottle

An AI music production companion that helps solo musicians go from idea to finished track.

**Live:** https://unbottle-rouge.vercel.app

![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Database%20%2B%20Auth-3ecf8e?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06b6d4?logo=tailwindcss)

---

## What is Unbottle?

Unbottle is an AI producer for solo musicians -- especially those with ADHD or creative anxiety who struggle to finish tracks. Instead of teaching music theory or offering generic tutorials, Unbottle acts as a production partner: it handles the tedious decisions (arrangement structure, chord voicings, what to work on next) so you stay in creative flow.

The interface is built around non-linear workflows. There is no forced step-by-step process. You can hum a melody, tap a rhythm, describe a vibe in words, or jump straight into the piano roll -- and the AI adapts to wherever you are.

---

## Features

- **AI Producer Chat** -- Streaming conversation with Claude that understands your session context (BPM, key, genre, sections, tracks). Conversation memory across messages.
- **Audio Capture** -- Record from your mic, tap rhythms on a pad, or describe your idea in text. Pitch and rhythm detection built in.
- **Piano Roll Sequencer** -- Canvas-based note editor with Tone.js playback. Multi-track support with per-track volume, pan, mute, and solo.
- **AI Arrangement Generation** -- Generate full song structures with chord progressions. Specify genre, mood, and key -- the AI returns sections with chords you can edit.
- **Audio Generation** -- Generate instrumental audio from text prompts via ElevenLabs Music API. Configurable duration, genre, mood, BPM, and instrumentation.
- **MIDI Export** -- Export your sequencer tracks as standard MIDI files for use in any DAW.
- **ADHD-Friendly Design** -- Momentum engine suggests next actions based on session state. Hyperfocus guard nudges you after extended sessions. Bookmarks let you save and return to any point. Session branching for exploring ideas without losing progress.
- **Session Management** -- Full persistence via Supabase with in-memory fallback for local dev. Session branching, archiving, and context reconstruction.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| UI | React 19, Tailwind CSS 4 |
| Database + Auth | Supabase (PostgreSQL, Row Level Security, Auth) |
| AI Chat | Anthropic Claude API (streaming) |
| Audio Generation | ElevenLabs Music API |
| Audio Playback | Tone.js |
| MIDI Export | midi-writer-js |
| Fonts | Inter, Space Grotesk (Google Fonts) |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- A Supabase project (free tier works)
- Anthropic API key
- ElevenLabs API key (for audio generation)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-username/unbottle.git
cd unbottle

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.local.example .env.local
# Then fill in the values (see Environment Variables below)

# 4. Set up Supabase
# Create a project at https://supabase.com
# Run the migration in the SQL Editor (see Database below)

# 5. Start the dev server
npm run dev

# 6. Open http://localhost:3000
```

---

## Environment Variables

Create `.env.local` from the example file and fill in these values:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL (e.g., `https://abc123.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key (safe for client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only, never exposed to client) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude. Users can also provide their own key via the UI. |
| `ELEVENLABS_API_KEY` | No | ElevenLabs API key for audio generation. Users can also provide their own key via the UI. |

Without Supabase configured, the app falls back to an in-memory store (data does not persist across restarts).

---

## Database

Supabase with 8 tables, all protected by Row Level Security:

| Table | Purpose |
|---|---|
| `profiles` | User profiles (extends `auth.users`), auto-created on signup |
| `sessions` | Music production sessions with BPM, key, time signature, genre, mood |
| `sections` | Song structure (intro, verse, chorus, bridge, etc.) with chord progressions |
| `tracks` | Audio/instrument tracks with volume, pan, mute, solo controls |
| `notes` | MIDI note data (pitch, start tick, duration, velocity) per track |
| `chat_messages` | AI producer conversation history per session |
| `captures` | Audio recordings, rhythm taps, and text descriptions |
| `bookmarks` | Saved session snapshots with context for later recall |

Two storage buckets (`captures`, `exports`) are also created for audio file storage.

### Running the migration

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Run the query

Or via the Supabase CLI:

```bash
supabase db push
```

---

## Project Structure

```
src/
  app/
    (app)/              # Authenticated app routes
      dashboard/        # Session list and overview
      session/          # Session workspace (sequencer, chat, arrangement)
      settings/         # User settings
    (auth)/             # Login, signup, OAuth callback
    api/                # API routes (see below)
  components/
    arrangement/        # Section timeline, chord display
    audio/              # Audio player, generation panel
    capture/            # Record button, tap pad, waveform display
    chat/               # Chat panel, message bubbles, suggestion chips
    export/             # MIDI export dialog
    landing/            # Landing page components
    layout/             # Header, sidebar, navigation
    sequencer/          # Piano roll, note grid, transport controls
    session/            # Session cards, bookmarks, hyperfocus nudge
    ui/                 # Shared primitives (button, dialog, toast, etc.)
  lib/
    ai/                 # Claude client, system prompts
    audio/              # ElevenLabs client, pitch/rhythm detection, Tone.js setup
    hooks/              # React hooks (useChat, useSequencer, useSession, etc.)
    midi/               # MIDI export writer
    music/              # Scales, types
    session/            # Session context provider, in-memory store
    supabase/           # Supabase client, server client, auth, DB operations
    utils/              # cn(), debounce, format helpers
  types/                # Shared TypeScript types
```

---

## API Routes

All routes are under `/api`. Session sub-routes require authentication when Supabase is configured.

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/chat` | Stream AI producer chat (SSE). Accepts session context and conversation history. |
| `POST` | `/api/arrangement/generate` | Generate song sections with chord progressions from a text prompt. |
| `POST` | `/api/arrangement/suggest` | Get AI-powered next-step suggestions based on current session state. |
| `POST` | `/api/audio/generate` | Generate instrumental audio via ElevenLabs. Returns MP3 binary. |
| `POST` | `/api/audio/upload` | Upload an audio blob (multipart/form-data). |
| `POST` | `/api/capture/analyze` | Analyze a musical capture (audio/tap/text) via AI. |
| `POST` | `/api/midi/export` | Export tracks as a MIDI file. Supports inline data or DB lookup by session ID. |
| `GET` | `/api/session` | List all sessions for the authenticated user. |
| `POST` | `/api/session` | Create a new session with default track. |
| `GET` | `/api/session/[id]` | Get session with tracks, sections, and notes. |
| `PUT` | `/api/session/[id]` | Update session metadata (title, BPM, key, genre, etc.). |
| `DELETE` | `/api/session/[id]` | Archive (soft delete) a session. |
| `GET` | `/api/session/[id]/bookmark` | List bookmarks for a session. |
| `POST` | `/api/session/[id]/bookmark` | Create a bookmark with context snapshot. |
| `POST` | `/api/session/[id]/branch` | Fork a session (copies tracks, sections, metadata). |
| `GET` | `/api/session/[id]/captures` | List captures for a session. |
| `POST` | `/api/session/[id]/captures` | Save a capture (audio, tap, or text). |
| `GET` | `/api/session/[id]/messages` | Load chat history for a session. |
| `POST` | `/api/session/[id]/messages` | Persist chat messages. |
| `GET` | `/api/session/[id]/sections` | List sections for a session. |
| `POST` | `/api/session/[id]/sections` | Add sections to a session. |
| `POST` | `/api/session/[id]/notes` | Bulk sync notes for a session (diff-based). |

---

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## Deployment

The app is deployed on Vercel. To deploy your own instance:

1. Fork or clone this repo
2. Import the project into [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local.example` in the Vercel project settings
4. Set up a Supabase project and run the migration
5. Deploy

Vercel will auto-detect the Next.js framework and configure the build.

---

## Contributing

Contributions are welcome. Open an issue to discuss before submitting a PR for any significant changes.

---

## License

TBD
