# Tier Structure — DRAFT (pending sign-off)

> **Status:** DRAFT — not yet final. Decisions below are proposals for review.
> Last updated: 2026-05-08

---

## Free Tier

No credit card required. Designed to let anyone start creating without friction.

### What's included

- **All features** — piano roll, AI chat, arrangement generation, audio generation, MIDI export, session branching, bookmarks, hyperfocus guard, momentum engine
- **Unlimited sessions** — create as many tracks and sessions as you like
- **Unlimited MIDI export** — export any session to standard MIDI files at any time
- **Unlimited sheet music view** — view chord sheets and notation for any session
- **BYO API keys** — supply your own Anthropic and/or ElevenLabs API keys in Settings to remove all rate limits on AI chat and audio generation

### Platform-key rate limits (when not using BYO keys)

These apply only when Unbottle's own API keys are used (i.e. you have not added your own keys):

| Feature | Free limit |
|---------|-----------|
| AI chat messages (Claude) | 5 per day |
| Audio generations (ElevenLabs) | 3 per day |
| Arrangement generations (Claude) | 5 per day |

Rate limits reset at midnight UTC.

---

## Pro Tier ($9/month)

For musicians who want to stay in flow without worrying about limits or API keys.

### What's included

Everything in Free, plus:

- **Platform-provided API keys** — no need to bring your own Anthropic or ElevenLabs keys
- **Higher rate limits** on platform keys (see table below)
- **Priority support** — issues escalated ahead of free-tier requests
- **Unlimited sessions**, **unlimited MIDI export**, **unlimited sheet music view** — same as Free

### Pro platform-key rate limits

| Feature | Pro limit |
|---------|----------|
| AI chat messages (Claude) | 200 per day |
| Audio generations (ElevenLabs) | 30 per day |
| Arrangement generations (Claude) | 50 per day |

Rate limits reset at midnight UTC.

---

## Rate Limits Summary Table

| Feature | Free (platform keys) | Free (BYO keys) | Pro (platform keys) | Pro (BYO keys) |
|---------|---------------------|-----------------|--------------------|--------------------|
| AI chat messages/day | 5 | Unlimited | 200 | Unlimited |
| Audio generations/day | 3 | Unlimited | 30 | Unlimited |
| Arrangement generations/day | 5 | Unlimited | 50 | Unlimited |
| Sessions | Unlimited | Unlimited | Unlimited | Unlimited |
| MIDI export | Unlimited | Unlimited | Unlimited | Unlimited |
| Sheet music view | Unlimited | Unlimited | Unlimited | Unlimited |
| Priority support | No | No | Yes | Yes |

---

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Free AI chat limit | 5 messages/day | Enough to try the feature in a real session; low enough that power users want Pro |
| Free audio generation limit | 3/day | ElevenLabs costs are the highest variable cost; 3 gives a meaningful taste |
| Free arrangement generation limit | 5/day | Same cost bucket as chat; mirrors chat limit for simplicity |
| Pro price | $9/month | Below the $10 psychological threshold; comparable to music tools (Splice, Soundtrap). Affordable for hobbyists. |
| Pro chat limit | 200/day | ~6-7 active sessions per day at ~30 messages each; realistic ceiling for heavy users |
| Pro audio limit | 30/day | ~1 generation per active working hour; ElevenLabs per-second costs make unlimited impractical at $9 |
| Pro arrangement limit | 50/day | High enough to never be a blocker in practice |
| BYO key removes limits | Yes | ADHD users shouldn't hit arbitrary walls mid-flow. BYO key is an escape hatch for power users on Free. |
| MIDI export | Unlimited on both tiers | MIDI is zero marginal cost and a core feature. Gating it would damage trust. |
| Storage limits | None for now | Supabase storage costs are negligible at current scale. Revisit if abuse occurs. |
| Export formats beyond MIDI | Not differentiated | Only MIDI is implemented. Revisit when audio/video export is added. |
