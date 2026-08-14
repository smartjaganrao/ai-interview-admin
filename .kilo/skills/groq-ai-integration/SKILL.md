---
name: groq-ai-integration
description: >
  Use when working with Groq AI inference in the AI Tutor apps.
  Triggers: modifying AI prompts, streaming responses, model selection,
  quota enforcement for AI calls, Groq API key configuration, debugging
  AI errors, or working with ai-interview-helper/src/services/ai/ai.service.ts,
  ai-interview-landing/app/api/groq/stream/route.ts, or any GROQ_API_KEY references.
  Covers both Electron desktop IPC path and Next.js server proxy path.
---

# Groq AI Integration

## Overview

Groq provides ultra-fast LLM inference. AI Tutor uses it for:
- Interview answer generation (voice/text Q&A)
- Coding problem analysis (screenshot → AI solution)
- Follow-up question generation
- Mock interview answers and feedback
- Blog content generation

There are **two code paths** for Groq calls:

| Context | Path | Key Storage |
|---|---|---|
| Electron desktop | IPC via `window.electronAPI.groqStream` | `main.js` (never exposed to renderer) |
| Next.js web | Server proxy `/api/groq/stream` | `process.env.GROQ_API_KEY` |

---

## Key Files

| File | Purpose |
|---|---|
| `ai-interview-helper/src/services/ai/ai.service.ts` | Desktop AI service: model selection, streaming, caching, hours/quota checks |
| `ai-interview-helper/src/services/config/runtime-config.ts` | Runtime config including Groq key fetch |
| `ai-interview-landing/app/api/groq/stream/route.ts` | Server-side Groq proxy with auth + quota |
| `ai-interview-landing/app/api/mock-interview/route.ts` | Mock interview AI endpoint |
| `ai-interview-helper/src/services/ai/prompts.ts` | Prompt templates (VOICE_PROMPT, CODING_PROMPT, etc.) |

---

## Desktop AI Path (`ai.service.ts`)

### Model Selection

```ts
const GROQ_CHAT_LIGHT = 'llama-3.1-8b-instant';   // Default for most questions
const GROQ_CHAT_HEAVY = 'openai/gpt-oss-120b';    // Complex topics
const GROQ_CODING_VISION = 'qwen/qwen3.6-27b';    // Coding/screenshot analysis
```

`selectModel(question)` chooses heavy model for: system design, distributed systems, microservices, dynamic programming, graph algorithms.

### Streaming Flow

```
generateAnswer(question)
    │
    ▼
streamRequest(messages, model, temperature, maxTokens, onChunk)
    │
    ├─► If Electron + window.electronAPI.groqStream exists:
    │   └─► IPC to main.js (Groq key never leaves main process)
    │       └─► Returns { fullAnswer, totalTokens }
    │
    └─► If dev/browser fallback:
        └─► Direct Groq SDK (requires VITE_GROQ_API_KEY in .env)
    │
    ▼
Returns { fullAnswer, totalTokens }
```

**Key rule:** In production, the Groq key is fetched server-side via `window.electronAPI.groqKeyFetch({ idToken })` and cached in `main.js`. The renderer never has the key.

### Quota/Hours Check

Before calling Groq, `generateAnswer` checks:
1. `getRemainingHours(uid)` — blocks if hours exhausted
2. `quota.isOverQuota` — blocks if daily AI quota exceeded

After successful answer, `consumeHours(uid, 0.01)` deducts from remaining hours.

### Response Cache

`ResponseCache` class (in-memory, max 100 entries):
- Key: `hashQuestion(question)` — deterministic hash
- LRU eviction when full
- Used to avoid duplicate Groq calls for identical questions

### Retry Logic

`retryWithBackoff(fn, maxAttempts=3)`:
- Exponential backoff: `3^attempt * 100ms` delays
- Re-throws last error after all attempts fail

---

## Web AI Path (`/api/groq/stream`)

### Endpoint: `POST /api/groq/stream`

**Request:**
```ts
{
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model?: string,           // default: 'llama-3.1-8b-instant'
  temperature?: number,     // default: 0.5
  max_tokens?: number       // default: 1024
}
```

**Headers:** `X-Firebase-Token: <idToken>`

**Flow:**
1. Verify `idToken` → get user UID
2. Check AI quota via `checkAiQuota(uid)` — returns 429 if exceeded
3. Concurrency gate: max 25 in-flight requests (Groq free tier: 30 req/min)
4. Call `https://api.groq.com/openai/v1/chat/completions` with `stream: true`
5. Pipe SSE through `TransformStream` to decrement concurrency counter on completion
6. Return SSE with quota headers: `X-Quota-Plan`, `X-Quota-Used`, `X-Quota-Limit`

**Error handling:**
- 429 from Groq → 503 with user-friendly message
- Network errors → decrement counter immediately
- Non-streaming failures → return JSON error with Groq's message

---

## Quota System

### Daily Quota (`usage_tracking/{userId}/days/{date}`)

Tracks per-day usage:
- `tokensUsed` — incremented by `trackTokenUsage()`
- `voiceMinutes` — incremented by `trackVoiceUsage()`
- `screenshotsUsed` — incremented by `trackScreenshotUsage()`

### Quota Limits by Plan

| Plan | AI Answers | Voice Minutes | Screenshots |
|---|---|---|---|
| free | 10/day | 5/day | 2/day |
| quick_pass | ∞ | ∞ | ∞ |
| pro | ∞ | ∞ | ∞ |
| power | ∞ | ∞ | ∞ |

**Note:** Quick Pass has unlimited daily quotas but is gated by `hoursRemaining` (1 hour total, 0.01h per answer).

---

## AI Prompts

Located in `ai-interview-helper/src/services/ai/prompts.ts`:

| Prompt | Purpose |
|---|---|
| `VOICE_PROMPT` | Base system prompt for voice Q&A |
| `CODING_PROMPT` | Coding problem analysis |
| `PHASE_PROMPTS` | Interview phase-specific prompts |
| `FOLLOW_UP_PROMPT` | Generate follow-up questions |
| `MOCK_MODEL_ANSWER_PROMPT` | Mock interview model answer |
| `MOCK_OVERALL_FEEDBACK_PROMPT` | Mock interview evaluation |
| `buildProfileContext()` | Builds context from user profile (languages, role, skills, etc.) |

---

## Configuration

### Desktop (`main.js` / IPC)

- Groq key is fetched server-side using Firebase ID token
- Key is cached in main process memory
- Exposed via `window.electronAPI.groqStream` and `window.electronAPI.groqKeyFetch`

### Web (`process.env`)

- `GROQ_API_KEY` — server-side only, never exposed to client
- Set in Vercel dashboard for landing app

### Dev Fallback

- `VITE_GROQ_API_KEY` in `.env` — only used in `import.meta.env.DEV` mode
- Never shipped to production renderer

---

## Common Pitfalls

| Pitfall | Fix |
|---|---|
| Groq key leaked to renderer bundle | Never import `groq-sdk` in renderer code; use IPC or server proxy |
| 429 rate limits | Concurrency gate (25 max) + retry with backoff; consider upgrading Groq plan |
| Daily quota not updating | `trackTokenUsage` writes to `usage_tracking/{uid}/days/{date}` — check date uses UTC |
| Streaming breaks on client disconnect | Use `TransformStream` with `.finally()` to decrement concurrency counter |
| Model too slow for voice | Use `GROQ_CHAT_LIGHT` (`llama-3.1-8b-incent`) for most questions |
| Token usage not tracked | Call `trackTokenUsage(uid, tokens)` after AI response completes |
| Hours not deducted | Call `consumeHours(uid, 0.01)` after successful answer generation |
