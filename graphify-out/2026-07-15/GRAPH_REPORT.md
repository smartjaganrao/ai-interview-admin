# Graph Report - ai-interview-admin  (2026-07-15)

## Corpus Check
- 91 files · ~37,840 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 438 nodes · 741 edges · 35 communities (21 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `72298784`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AdminShell.tsx
- getSession
- isAdminRequest
- dependencies
- compilerOptions
- devDependencies
- useAdminData
- session-server.ts
- page.tsx
- page.tsx
- page.tsx
- route.ts
- route.ts
- page.tsx
- DataStates.tsx
- route.ts
- page.tsx
- route.ts
- push-admin-secret.mjs
- route.ts
- route.ts
- grant-admin.mjs
- APIUsageChart.tsx
- CohortTable.tsx
- DAUChart.tsx
- RevenueChart.tsx
- UserDistribution.tsx
- proxy.ts
- KPICards.tsx
- route.ts
- layout.tsx
- Sidebar.tsx
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `isAdminRequest()` - 74 edges
2. `getSession()` - 54 edges
3. `useAdminData()` - 25 edges
4. `postAdmin()` - 19 edges
5. `compilerOptions` - 16 edges
6. `ErrorState()` - 14 edges
7. `Loader()` - 13 edges
8. `ai-interview-admin` - 10 edges
9. `include` - 7 edges
10. `requireSuperAdmin()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `isAdminRequest()`  [EXTRACTED]
  app/api/blog/upload-image/route.ts → lib/session-server.ts
- `GET()` --calls--> `isAdminRequest()`  [EXTRACTED]
  app/api/promotions/route.ts → lib/session-server.ts
- `AnalyticsPage()` --calls--> `useAdminData()`  [EXTRACTED]
  app/analytics/page.tsx → lib/useAdminData.ts
- `requireSuperAdmin()` --calls--> `getSession()`  [EXTRACTED]
  app/api/admins/route.ts → lib/session-server.ts
- `GET()` --calls--> `isAdminRequest()`  [EXTRACTED]
  app/api/analytics/adoption/route.ts → lib/session-server.ts

## Import Cycles
- None detected.

## Communities (35 total, 14 thin omitted)

### Community 0 - "AdminShell.tsx"
Cohesion: 0.06
Nodes (17): LoginForm(), BOTTOM_NAV, NAV_SECTIONS, NOTIF_ICON, NotificationBell(), NotificationItem, relativeTime(), Sidebar() (+9 more)

### Community 1 - "getSession"
Cohesion: 0.11
Nodes (17): GET(), DELETE(), PATCH(), DELETE(), PATCH(), POST(), POST(), POST() (+9 more)

### Community 2 - "isAdminRequest"
Cohesion: 0.09
Nodes (22): GET(), GET(), GET(), GET(), POST(), DELETE(), GET(), POST() (+14 more)

### Community 3 - "dependencies"
Cohesion: 0.06
Nodes (33): axios, firebase, firebase-admin, jose, js-cookie, next, dependencies, axios (+25 more)

### Community 4 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 5 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+17 more)

### Community 6 - "useAdminData"
Cohesion: 0.05
Nodes (64): Admin, AdminsPage(), ROLE_BADGE, ROLES, AdoptionData, AdoptionPage(), AdoptionUser, relativeActive() (+56 more)

### Community 7 - "session-server.ts"
Cohesion: 0.15
Nodes (11): JWKS, POST(), POST(), ALLOWED_TYPES, POST(), GET(), Item, clearSession() (+3 more)

### Community 8 - "page.tsx"
Cohesion: 0.40
Nodes (3): EmailTemplateGeneratorProps, Template, TEMPLATES

### Community 9 - "page.tsx"
Cohesion: 0.18
Nodes (10): Adding a new admin user, ai-interview-admin, Auth flow, Deploy, Environment variables, Firestore collections read, Local setup, Project structure (+2 more)

### Community 10 - "page.tsx"
Cohesion: 0.18
Nodes (11): ACTION_DOT, AdminDashboard(), ApiLog, EMPTY_KPIS, EMPTY_RELEASE, Kpis, PLAN_COLORS, ReleaseInfo (+3 more)

### Community 11 - "route.ts"
Cohesion: 0.36
Nodes (8): AdoptionUser, GET(), GET(), ActivityMap, getActivityMap(), Segment, segmentFor(), UserActivity

### Community 12 - "route.ts"
Cohesion: 0.53
Nodes (5): COLLECTIONS, deleteCollection(), deleteCollectionDeep(), deleteCollectionExcluding(), POST()

### Community 14 - "DataStates.tsx"
Cohesion: 0.70
Nodes (3): KNOWN_PLANS, POST(), wrapPromotionEmail()

### Community 15 - "route.ts"
Cohesion: 0.47
Nodes (8): DELETE(), GET(), logAction(), PATCH(), POST(), requireSuperAdmin(), Role, VALID_ROLES

### Community 18 - "route.ts"
Cohesion: 0.39
Nodes (7): COLLECTIONS, DocRecord, GET(), POST(), requireSuperAdmin(), serialize(), UsageRecord

### Community 19 - "push-admin-secret.mjs"
Cohesion: 0.25
Nodes (6): add, dep, __dirname, envPath, m, value

### Community 20 - "route.ts"
Cohesion: 0.33
Nodes (3): emailCustomer(), POST(), ResendConfig

### Community 22 - "route.ts"
Cohesion: 0.50
Nodes (4): COLLECTIONS_BY_DOC_ID, COLLECTIONS_BY_USERID_FIELD, deleteUserData(), POST()

### Community 23 - "grant-admin.mjs"
Cohesion: 0.40
Nodes (4): __dirname, envPath, match, value

### Community 29 - "proxy.ts"
Cohesion: 0.67
Nodes (3): config, proxy(), PUBLIC_PATHS

## Knowledge Gaps
- **166 isolated node(s):** `Admin`, `ROLE_BADGE`, `ROLES`, `Segment`, `AdoptionUser` (+161 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `isAdminRequest()` connect `isAdminRequest` to `route.ts`, `getSession`, `session-server.ts`, `route.ts`, `DataStates.tsx`, `route.ts`, `route.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `getSession()` connect `getSession` to `route.ts`, `isAdminRequest`, `session-server.ts`, `route.ts`, `DataStates.tsx`, `route.ts`, `route.ts`, `route.ts`, `route.ts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `Admin`, `ROLE_BADGE`, `ROLES` to the rest of the system?**
  _166 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AdminShell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.058693244739756366 - nodes in this community are weakly interconnected._
- **Should `getSession` be split into smaller, more focused modules?**
  _Cohesion score 0.11051693404634581 - nodes in this community are weakly interconnected._
- **Should `isAdminRequest` be split into smaller, more focused modules?**
  _Cohesion score 0.08907563025210084 - nodes in this community are weakly interconnected._