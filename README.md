# AI Interview Helper - Super Admin Panel

A separate Next.js web application for managing users, subscriptions, analytics, and support for the AI Interview Helper platform.

## Features

✅ **Phase 1: Authentication** (COMPLETE)
- Admin login via Firebase Auth
- Session management with secure cookies
- Route protection via middleware
- Dashboard home with KPI cards

⏳ **Phase 2: User Management** (Upcoming)
- View all users with pagination and search
- Upgrade/downgrade plans
- Reset usage quotas
- Ban users

⏳ **Phase 3: Analytics** (Upcoming)
- Revenue trends (MRR)
- User distribution by plan
- Daily active users (DAU)
- Churn rate analysis
- Cohort retention

⏳ **Phase 4: Audit & Moderation** (Upcoming)
- Admin action logs
- Content moderation queue
- Session audit trail

⏳ **Phase 5: Support & Settings** (Upcoming)
- Support ticket inbox
- Admin management (invite new admins)
- API key generation

## Quick Start

### Prerequisites

1. **Firebase Project**: Use the same Firebase project as the main AI Interview Helper app
2. **Service Account**: Generate a service account key from Firebase Console
3. **Node.js 18+**: Required for Next.js 14

### Setup

1. **Clone and install**:
   ```bash
   cd ai-interview-admin
   npm install
   ```

2. **Environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Firebase credentials
   ```

   Get Firebase config from: Firebase Console > Project Settings > General

   Get Service Account key from: Firebase Console > Project Settings > Service Accounts > Generate New Private Key

3. **Run development server**:
   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000/login`

4. **Admin Access Setup**:
   - First, enable admin for your user via Firebase Console:
     - Go to Firebase Console > Authentication > Users
     - Click your user email
     - Add custom claim: `"admin": true`
     - Also add: `"role": "super-admin"`
   - Then login with your Firebase credentials

## Project Structure

```
ai-interview-admin/
├── app/                          # Next.js App Router
│   ├── (authenticated)/          # Protected routes (require login)
│   │   ├── dashboard/page.tsx    # Dashboard home
│   │   ├── users/               # User management (Phase 2)
│   │   ├── analytics/           # Analytics dashboard (Phase 3)
│   │   ├── audit/               # Audit logs (Phase 4)
│   │   ├── support/             # Support tickets (Phase 5)
│   │   └── layout.tsx           # Authenticated layout
│   ├── login/page.tsx           # Login page
│   ├── api/
│   │   └── auth/                # Auth endpoints
│   └── layout.tsx               # Root layout
├── components/
│   ├── TopNav.tsx               # Header with user info
│   └── Sidebar.tsx              # Navigation menu
├── lib/
│   ├── firebase-admin.ts        # Admin SDK initialization
│   ├── firebase-client.ts       # Client SDK for auth
│   └── session.ts               # Session management
├── hooks/
│   └── useAdminAuth.ts          # Auth hook
├── middleware.ts                # Route protection
└── README.md
```

## Deployment

### Deploy to Vercel

1. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/yourusername/ai-interview-admin.git
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to https://vercel.com
   - Import project from GitHub
   - Add environment variables in Vercel dashboard:
     - `NEXT_PUBLIC_FIREBASE_API_KEY`
     - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
     - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
     - `FIREBASE_ADMIN_SDK_JSON` (full JSON as string)

3. **Custom Domain**:
   - Add domain in Vercel dashboard (e.g., admin.yourdomain.com)
   - HTTPS auto-enabled

## Security

- ✅ Admin SDK credentials in environment only
- ✅ All admin actions logged
- ✅ Session cookies are HTTP-only and secure
- ✅ Firestore rules restrict to admin users only
- ✅ No API keys exposed in frontend

## Development

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Version

**Phase 1**: Authentication - COMPLETE
**Status**: Ready for Phase 2 (User Management)
**Last Updated**: 2026-05-23
