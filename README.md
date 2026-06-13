# ai-interview-admin

Next.js 16 internal admin panel for JavihAI — user management, support tickets, analytics, and audit logs.

**Production:** https://admin.javihai.in | **Hosting:** Vercel (auto-deploys from `main`) | **Firebase:** `ai-interview-tutor`

Access is restricted to accounts with `admin: true` custom claim in Firebase Auth.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Auth guard | `proxy.ts` (Next.js 16 proxy convention) + httpOnly `admin-session` cookie |
| Auth provider | Firebase Auth — Google sign-in, admin claim required |
| Database | Firestore via Firebase Admin SDK |
| Styles | CSS modules (`globals.css`) |

---

## Local setup

```bash
npm install
cp .env.example .env.development.local   # fill in dev Firebase values
npm run dev                              # http://localhost:3001
```

Set `NEXT_PUBLIC_ADMIN_DEV_NO_AUTH=true` in `.env.development.local` to bypass auth locally.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

---

## Environment variables

```bash
# .env.development.local

# Firebase web client (dev project)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK — single-line minified service account JSON
FIREBASE_ADMIN_SDK_JSON={"type":"service_account","project_id":"..."}

# Dev auth bypass — skips admin claim check locally
NEXT_PUBLIC_ADMIN_DEV_NO_AUTH=true

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

Production values (without the dev bypass) are set in Vercel.

---

## Auth flow

```
Request arrives → proxy.ts (Edge runtime)
  → reads admin-session httpOnly cookie
  → cookie missing or isAdmin=false → redirect /login?next=<path>
  → cookie valid → request passes through

/login
  → Google sign-in → Firebase ID token
  → POST /api/auth/login → verifies token, checks admin claim
  → sets admin-session cookie (httpOnly, sameSite=strict)
  → redirect to /
```

To grant admin access to a new account, run in the landing or helper repo:
```bash
node scripts/grant-admin.mjs user@example.com
```

---

## Project structure

```
app/
  page.tsx                  Dashboard — KPIs, recent users, audit log preview
  users/page.tsx            User list — search, upgrade plan, ban, reset quota
  support/page.tsx          Support ticket queue — view, reply, update status
  analytics/
    page.tsx                Analytics overview
    components/             KPICards, RevenueChart, DAUChart, UserDistribution,
                            APIUsageChart, CohortTable
  audit/page.tsx            Full audit log
  settings/page.tsx         API key management
  login/page.tsx            Google sign-in (admin only)
  api/
    auth/login/             POST — verify Firebase token, set session cookie
    auth/logout/            POST — clear session cookie
    health/                 GET — liveness check
    users/
      list/                 GET — paginated user list with plan/usage data
      upgrade/              POST — manually upgrade a user's plan
      ban/                  POST — ban a user account
      reset-quota/          POST — reset a user's monthly usage
    support/tickets/
      [ticketId]/reply/     POST — send admin reply
      [ticketId]/update/    POST — update ticket status
    analytics/
      kpis/                 GET — MRR, DAU, conversion rate
      revenue/              GET — revenue chart data
      api-usage/            GET — token usage over time
      cohorts/              GET — retention cohorts
    moderation/messages/    GET/DELETE — message moderation
    audit/logs/             GET — audit log entries
    settings/api-keys/      GET/POST — manage API keys

components/
  AdminShell.tsx            Authenticated layout wrapper
  Sidebar.tsx               Navigation sidebar
  TopNav.tsx                Top navigation bar
  DataStates.tsx            Loading/error/empty state components

lib/
  firebase-admin.ts         Admin SDK init
  firebase-client.ts        Client SDK init (for login page)
  session-server.ts         isAdminRequest() — reads admin-session cookie
  session.ts                createSession, clearSession helpers
  adminActions.ts           postAdmin() fetch wrapper with auth
  useAdminData.ts           useSWR-style data fetching hook

hooks/
  useAdminAuth.ts           Auth state + loginGoogle + logout

proxy.ts                    Auth guard for all routes (Next.js 16 proxy)
```

---

## Firestore collections read

| Collection | Used for |
|---|---|
| `users` | User list, plan data |
| `subscriptions` | Subscription status, billing |
| `usage_tracking` | Monthly token/voice/screenshot usage |
| `support_tickets` | Support queue |
| `audit_logs` | Admin action audit trail |
| `interview_sessions` | Activity counts |

---

## Deploy

Every push to `main` auto-deploys via Vercel.

> The `production` branch in Vercel is a Preview-only environment — do not use it for the live admin panel. The `main` branch is production.

## Adding a new admin user

```bash
# In ai-interview-landing or ai-interview-helper directory
node scripts/grant-admin.mjs smartjaganrao@gmail.com
```

The user must sign out and back in for the new claim to take effect.
