# JASIRI — Developer Guide

> An AI-powered assistive learning platform for children with Down syndrome.
> Inspired by Ubuntu: *"We are because of each other."*

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Repository Structure](#3-repository-structure)
4. [Tech Stack](#4-tech-stack)
5. [Local Development Setup](#5-local-development-setup)
6. [Environment Variables](#6-environment-variables)
7. [Mobile App — Jasiri/](#7-mobile-app--jasiri)
8. [Backend API — Backend/](#8-backend-api--backend)
9. [Authentication Flow](#9-authentication-flow)
10. [State Management](#10-state-management)
11. [Offline-First Architecture](#11-offline-first-architecture)
12. [API Reference](#12-api-reference)
13. [Design System](#13-design-system)
14. [Accessibility Requirements](#14-accessibility-requirements)
15. [Testing](#15-testing)
16. [Contribution Guidelines](#16-contribution-guidelines)

---

## 1. Project Overview

JASIRI is a production-ready mobile learning platform designed specifically for children with Down syndrome. It is not a generic educational app — every engineering decision prioritises cognitive accessibility, emotional safety, and offline resilience for low-end Android devices in African markets.

### Core features

| Feature | Description |
|---|---|
| Serious Games | Memory, pattern recognition, communication, motor-skill games |
| AI Personalisation | Rule-based recommendation engine — adapts difficulty, pacing, activity suggestions |
| Digital Art Studio | Finger painting, coloring templates, emotional expression tools |
| Caregiver Dashboard | Progress tracking, skill breakdowns, activity history for parents and teachers |
| Music & Stories | Audio-first sing-alongs and read-aloud stories |
| Child Profiles | Guardian-managed, COPPA-compliant; children never authenticate |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     JASIRI PLATFORM                      │
├──────────────────────────┬──────────────────────────────┤
│   Mobile App (Expo RN)   │   Backend API (Express)      │
│   EAS Build + OTA        │   Railway.app / Node 18      │
├──────────────────────────┼──────────────────────────────┤
│       Appwrite Cloud — Auth · Database · Storage         │
├──────────────────────────┬──────────────────────────────┤
│   Redis (session cache)  │   Winston + Sentry (logs)    │
└──────────────────────────┴──────────────────────────────┘
```

### Data flow

```
Child interacts with app
        │
        ▼
Expo mobile (React Native)
        │  HTTP / REST
        ▼
Express backend (Railway)
        │  Appwrite SDK
        ▼
Appwrite Cloud
  ├── Authentication (Appwrite Users)
  ├── Guardian profiles (Database)
  ├── Child profiles  (Database)
  ├── Game sessions   (Database)
  ├── AI profiles     (Database)
  └── Artwork         (Storage)
```

### Key design decisions

| Decision | Reason |
|---|---|
| Appwrite over Firebase/Supabase | COPPA-friendly, self-hostable, African data-residency options |
| Rule-based AI over ML | Explainable, low-latency, zero cloud AI cost |
| Expo over bare RN | OTA updates without app store re-approval |
| Zustand over Redux | Minimal boilerplate; fits small team velocity |
| Offline-first | Budget Android, intermittent Kenyan connectivity |
| JWT + SecureStore | Auth tokens never touch AsyncStorage; resistant to A02 |

---

## 3. Repository Structure

```
Jasiri3/
├── AGENTS.md               ← Engineering rules & philosophy (read first)
├── DEPLOYMENT.md           ← Full production deployment runbook
├── PRIVACY_ETHICS_REVIEW.md← OWASP / COPPA audit findings
├── README.md               ← MVP scope & feature freeze
│
├── Jasiri/                 ← React Native / Expo mobile app
│   ├── app/                ← Expo Router screens (routes only)
│   │   ├── _layout.jsx     ← Root layout: fonts, auth guard, audio init
│   │   ├── index.jsx       ← Entry — redirects to /welcome
│   │   ├── welcome.jsx     ← Animated landing screen
│   │   ├── onboarding.jsx  ← 3-step new-guardian onboarding
│   │   ├── select-profile.jsx ← Child / guardian profile picker
│   │   ├── child-home.jsx  ← Child's main hub (games, art, music, stories)
│   │   ├── games.jsx       ← Serious games hub
│   │   ├── stories.jsx     ← Read-aloud story hub
│   │   ├── music.jsx       ← Music & sing-along hub
│   │   ├── dashboard.jsx   ← Child activity dashboard
│   │   ├── parent-dashboard.jsx ← Guardian progress view
│   │   ├── reports.jsx     ← Detailed learning reports
│   │   ├── goals.jsx       ← Learning goals screen
│   │   ├── settings.jsx    ← App settings
│   │   └── (auth)/         ← Auth screens (login, register)
│   │
│   ├── src/
│   │   ├── components/     ← Reusable UI components
│   │   ├── services/       ← API client wrappers
│   │   ├── store/          ← Zustand global state
│   │   ├── theme/          ← Design tokens (colors, typography, spacing)
│   │   ├── hooks/          ← Custom React hooks
│   │   ├── config/         ← App-level config (API base URL, etc.)
│   │   └── navigation/     ← Navigation utilities
│   │
│   ├── assets/
│   │   ├── fonts/          ← Poppins font family (TTF)
│   │   ├── images/         ← App icons, illustrations
│   │   └── audio/          ← Sound effects, narration assets
│   │
│   ├── app.config.js       ← Expo config (app name, bundle ID, plugins)
│   ├── tailwind.config.js  ← NativeWind / Tailwind class extensions
│   ├── global.css          ← NativeWind global stylesheet
│   └── babel.config.js
│
└── Backend/                ← Express.js REST API
    ├── src/
    │   ├── app.js          ← Express app factory (middleware stack)
    │   ├── server.js       ← HTTP server entry point
    │   ├── config/         ← Zod-validated environment config
    │   ├── routes/         ← Route definitions (auth, child, game, ai, art)
    │   ├── controllers/    ← Request handlers & business logic
    │   ├── middleware/     ← Auth, rate-limit, sanitize, validate, error handler
    │   ├── services/       ← Appwrite SDK wrapper
    │   ├── appwrite/       ← Appwrite helpers: auth, client, collections, security
    │   └── utils/          ← Logger, audit, error classes, response helpers
    │
    ├── scripts/
    │   ├── setup.js        ← Create Appwrite collections (first-time setup)
    │   ├── setup-game-collections.js
    │   └── setup-all-collections.js
    └── package.json
```

---

## 4. Tech Stack

### Mobile (Jasiri/)

| Technology | Version | Purpose |
|---|---|---|
| React Native | 0.81.5 | Core mobile framework |
| Expo | ~54.0 | Build tooling, OTA updates, device APIs |
| Expo Router | ~6.0 | File-based routing (like Next.js for RN) |
| NativeWind | ^4.2 | Tailwind CSS utility classes in React Native |
| Zustand | ^5.0 | Lightweight global state management |
| AsyncStorage | ^2.2 | Offline child data cache |
| expo-secure-store | ~15.0 | Encrypted token & PII storage |
| expo-speech | ~14.0 | Text-to-speech for accessibility |
| expo-haptics | ~15.0 | Haptic feedback for touch interactions |
| expo-audio | ~1.1 | Background music and sound effects |
| react-native-reanimated | ~4.1 | 60fps UI animations |

### Backend (Backend/)

| Technology | Version | Purpose |
|---|---|---|
| Node.js | ≥18.0 | Runtime |
| Express.js | ^4.18 | HTTP framework |
| Appwrite (node-appwrite) | ^13.0 | Database, auth, storage |
| jsonwebtoken | ^9.0 | JWT access + refresh tokens |
| bcryptjs | ^2.4 | Password hashing (12 rounds) |
| express-validator | ^7.3 | Input validation & sanitization |
| helmet | ^7.1 | Security headers |
| express-rate-limit | ^7.1 | Rate limiting |
| redis | ^4.6 | Session/recommendation cache |
| zod | ^3.22 | Config validation at startup |
| winston | ^3.11 | Structured logging |
| uuid | ^14.0 | Request IDs, JWT `jti` |

---

## 5. Local Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Expo CLI (`npm install -g expo`)
- An [Appwrite Cloud](https://cloud.appwrite.io) project (free tier works)
- Optional: Redis (Docker or Upstash for cache)

### 1. Clone and install

```bash
# Install backend dependencies
cd Backend
npm install

# Install mobile app dependencies
cd ../Jasiri
npm install
```

### 2. Configure environment variables

Copy the example env files and fill in your values (see [Section 6](#6-environment-variables)):

```bash
# Backend
cd Backend
cp .env.example .env
# Edit .env with your Appwrite credentials, JWT secrets, etc.
```

### 3. Provision Appwrite collections

Run the setup script once to create all database collections and indexes:

```bash
cd Backend
npm run setup       # creates guardians, children collections
npm run setup:games # creates game sessions, attempts collections
npm run setup:db    # creates all collections at once
```

### 4. Start the backend

```bash
cd Backend
npm run dev    # nodemon — hot reload on file changes
```

Backend runs at `http://localhost:3000` by default.

### 5. Start the mobile app

```bash
cd Jasiri
npm start      # opens Expo dev tools

# Or target a specific platform:
npm run android
npm run ios
```

Scan the QR code with Expo Go (Android) or the iOS Camera app.

---

## 6. Environment Variables

### Backend (`Backend/.env`)

```env
# Runtime
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Appwrite
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_server_api_key

# Appwrite Collection IDs (auto-created by setup scripts)
APPWRITE_DATABASE_ID=jasiri_db
APPWRITE_COLLECTION_GUARDIANS=guardians
APPWRITE_COLLECTION_CHILDREN=children
APPWRITE_GAME_SESSIONS_COLLECTION=game_sessions
APPWRITE_GAME_ATTEMPTS_COLLECTION=game_attempts
APPWRITE_LEARNING_PROFILES_COLLECTION=learning_profiles
APPWRITE_GOALS_COLLECTION=goals
APPWRITE_GAMES_COLLECTION=games

# JWT — use: openssl rand -hex 32
JWT_SECRET=at_least_32_random_characters_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=different_32_random_characters_here
JWT_REFRESH_EXPIRES_IN=30d

# Redis
REDIS_URL=redis://localhost:6379
# REDIS_PASSWORD=optional_password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:8081,exp://192.168.x.x:8081

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Security
BCRYPT_ROUNDS=12
```

### Mobile (`Jasiri/.env` or `app.config.js`)

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

> Prefix all mobile env vars with `EXPO_PUBLIC_` to expose them to the client bundle. Never put secrets here.

---

## 7. Mobile App — Jasiri/

### Boot sequence

```
App launch
  │
  ├── Load Poppins fonts (expo-font)
  ├── initErrorReporting()
  ├── setAudioModeAsync() — configure audio once
  │
  ├── useAuthStore.bootstrap()
  │     ├── Read token from SecureStore
  │     ├── Restore cached user (fast offline render)
  │     └── Validate token with GET /auth/me
  │
  ├── useChildStore.loadChildren() — if authenticated
  │
  └── SplashScreen.hideAsync()
       │
       ▼
     Route guard (segments-based)
       ├── Not authenticated → /welcome or /(auth)/login
       └── Authenticated     → /select-profile
```

### Screen routing

| Route | Screen | Guard |
|---|---|---|
| `/` | Redirect to `/welcome` | None |
| `/welcome` | Animated landing | None |
| `/onboarding` | 3-step guardian intro | None |
| `/(auth)/login` | Email/password login | Must be unauth |
| `/(auth)/register` | New guardian account | Must be unauth |
| `/select-profile` | Child/guardian picker | Authenticated |
| `/child-home` | Child activity hub | Authenticated + child selected |
| `/games` | Serious games hub | Authenticated + child selected |
| `/stories` | Story hub | Authenticated + child selected |
| `/music` | Music hub | Authenticated + child selected |
| `/dashboard` | Child activity dashboard | Authenticated |
| `/parent-dashboard` | Guardian progress view | Authenticated |
| `/reports` | Detailed reports | Authenticated |
| `/goals` | Learning goals | Authenticated |
| `/settings` | App settings | Authenticated |

### Key components

| Component | Purpose |
|---|---|
| `PrimaryButton` | Accessible CTA button — large touch target, haptic, TTS label |
| `AccessibleButton` | Generic accessible pressable with a11y role |
| `AccessibleInput` | Text input with large label, error state, accessibilityLabel |
| `DashboardShell` | Shell layout shared across dashboard screens |
| `ChildDashboard` | Child-facing activity summary |
| `ParentDashboard` | Guardian-facing progress overview |
| `SeriousGamesHub` | Game catalogue and session launcher |
| `StoryHub` | Story listing and reader |
| `MusicHub` | Music tracks and sing-along player |
| `ErrorBoundary` | Catches render errors; shows friendly recovery UI |

### Services (API clients)

Each service wraps a backend route group using the central `api` client (`src/services/api.js`):

| Service | Backend route | Description |
|---|---|---|
| `authService` | `/auth/*` | Register, login, logout, `/me` |
| `childService` | `/children/*` | CRUD child profiles |
| `gameService` | `/games/*` | Game catalogue, sessions, attempts |
| `artService` | `/art/*` | Save/load artwork |
| `goalsService` | `/goals/*` | Learning goals |
| `reportsService` | `/reports/*` | Analytics data |

The `api` client handles:
- Automatic `Authorization: Bearer <token>` injection
- Access token refresh via `/auth/refresh` (interceptor)
- Offline detection (network errors → `isNetworkError: true`)
- Request ID correlation (`X-Request-Id` header)

---

## 8. Backend API — Backend/

### Middleware stack (applied in order)

1. **Request ID** — unique UUID per request, sent as `X-Request-Id`
2. **Helmet** — security headers (HSTS, X-Frame-Options, CSP, etc.)
3. **CORS** — allow-listed origins only
4. **Rate limiter** — 100 req/15 min general; 15 req/15 min auth; 20 req/min AI
5. **Compression** — gzip response bodies
6. **Body parser** — JSON limit 100 KB (mitigates payload-based DoS)
7. **Request logger** — structured Winston log per request
8. **Input sanitizer** — strips `<script>` and HTML injection from all body strings
9. **Route handlers**
10. **Error handler** — normalises all errors to `{ success, error, message }` JSON

### Route groups

| Prefix | File | Auth required |
|---|---|---|
| `/api/v1/auth` | `routes/auth.js` | No (register, login) / Yes (me, logout) |
| `/api/v1/children` | `routes/child.js` | Yes |
| `/api/v1/games` | `routes/game.js` | Yes + verified |
| `/api/v1/ai` | `routes/ai.js` | Yes |
| `/api/v1/art` | `routes/art.js` | Yes |
| `/health` | `routes/health.js` | No |

### Standard response envelope

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Human-readable message"
}
```

**Error:**
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable description",
  "requestId": "uuid"
}
```

### Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `AUTHENTICATION_ERROR` | 401 | Missing or invalid Bearer token |
| `AUTHORIZATION_ERROR` | 403 | Authenticated but not permitted |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate resource (e.g. email already used) |
| `VALIDATION_ERROR` | 422 | Input failed express-validator rules |
| `RATE_LIMIT_ERROR` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 9. Authentication Flow

JASIRI uses a guardian-only auth model. Children **never** authenticate.

### Registration

```
Client                          Backend                     Appwrite
  │  POST /auth/register           │                             │
  │  { name, email, password,      │                             │
  │    role: "parent" }            │                             │
  │──────────────────────────────►│                             │
  │                               │  users.create(...)          │
  │                               │────────────────────────────►│
  │                               │◄────────────────────────────│
  │                               │  databases.createDocument() │
  │                               │  (guardian profile)         │
  │                               │────────────────────────────►│
  │                               │◄────────────────────────────│
  │                               │  sign accessToken (7d)      │
  │                               │  sign refreshToken (30d)    │
  │◄──────────────────────────────│                             │
  │  { accessToken, refreshToken } │
```

### Token refresh

The mobile `api` client intercepts 401 responses and automatically calls `/auth/refresh`. If the refresh also fails, the user is signed out and redirected to `/login`.

### Role model

| Role | Capabilities |
|---|---|
| `parent` | Full access to own children's data |
| `teacher` | Same as parent, but must be `isVerified: true` |
| `therapist` | Same as teacher |
| `caregiver` | Same as parent |

The `requireVerified` middleware gates teacher/therapist routes until email verification is complete.

---

## 10. State Management

### `useAuthStore` (Zustand)

```
State:
  user            — guardian profile object (null if unauth)
  isAuthenticated — boolean
  isBootstrapping — true until initial token check completes

Actions:
  bootstrap()  — called once on app mount; restores cached session
  login()      — POST /auth/login, persist tokens
  register()   — POST /auth/register, persist tokens
  logout()     — POST /auth/logout, clear tokens + cached user
```

Tokens are stored in **`expo-secure-store`** (encrypted). The user object is also cached in SecureStore to prevent PII from leaking into AsyncStorage.

### `useChildStore` (Zustand)

```
State:
  children      — array of child profile objects
  selectedChild — the active child for the current session
  progress      — learning profile for selectedChild
  isLoading     — boolean
  error         — error string or null

Actions:
  loadChildren()       — GET /children; falls back to AsyncStorage cache offline
  addChild(data)       — POST /children; updates local cache
  selectChild(child)   — sets selectedChild, loads cached/live progress
  updateChild(id, data)— PATCH /children/:id
  deleteChild(id)      — DELETE /children/:id
  loadProgress(childId)— GET /children/:id/progress
```

Child list is cached in `AsyncStorage` (plain object, no PII beyond name/age). Progress data is cached per-child in `AsyncStorage` with a namespaced key.

---

## 11. Offline-First Architecture

| Layer | Strategy |
|---|---|
| Auth tokens | SecureStore; bootstrap restores from cache if offline |
| User profile | SecureStore cache; validated against server when online |
| Child list | AsyncStorage cache; server fetch on mount, stale-while-revalidate |
| Child progress | AsyncStorage cache per child ID; background refresh |
| Game sessions | Sessions started locally; synced on network reconnect |
| Art | Saved locally first; upload to Appwrite Storage when online |

**Offline detection:** The `api` client catches `TypeError` (no response) and `status 0/408` and marks errors with `isNetworkError: true`. Stores check this flag to decide whether to use cached data rather than surface an error.

---

## 12. API Reference

### Auth

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/auth/register` | `{ name, email, password, role }` | Create guardian account |
| `POST` | `/auth/login` | `{ email, password }` | Sign in |
| `POST` | `/auth/refresh` | `{ refreshToken }` | Rotate access token |
| `POST` | `/auth/logout` | — | Revoke refresh token |
| `GET` | `/auth/me` | — | Get authenticated guardian |

### Children

| Method | Path | Body | Description |
|---|---|---|---|
| `GET` | `/children` | — | List own children |
| `POST` | `/children` | `{ name, age }` | Create child profile |
| `GET` | `/children/:id` | — | Get child profile |
| `PATCH` | `/children/:id` | `{ name?, age? }` | Update child |
| `DELETE` | `/children/:id` | — | Delete child profile |
| `GET` | `/children/:id/progress` | — | Get learning progress |

### Games

| Method | Path | Body | Description |
|---|---|---|---|
| `GET` | `/games` | — | List game catalogue |
| `GET` | `/games/:id` | — | Get game details |
| `GET` | `/games/sessions` | Query: `childId, status, gameId` | List sessions |
| `POST` | `/games/:id/sessions` | `{ childId, difficulty }` | Start session |
| `POST` | `/games/:id/sessions/:sid/attempts` | `{ score, completionTimeMs, correct, metadata? }` | Record attempt |
| `PATCH` | `/games/:id/sessions/:sid` | `{ status, finalScore, completionTimeMs }` | Complete/abandon session |

### AI

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/ai/recommendations` | `{ childId, context? }` | Get adaptive game recommendations |
| `POST` | `/ai/analyze-performance` | `{ childId, periodDays? }` | Analyse performance trends |

### Art

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/art` | `multipart/form-data { childId, file }` | Upload artwork |
| `GET` | `/art` | Query: `childId` | List artwork |
| `DELETE` | `/art/:id` | — | Delete artwork |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check (no auth required) |

---

## 13. Design System

### Design tokens (`src/theme/tokens.js`)

```js
Colors.orange     // #FF8A3D — primary CTA, warmth, energy
Colors.blue       // #5BB9FF — calm, trust, headers
Colors.green      // #63C174 — progress, success, growth
Colors.yellow     // #FFD65A — rewards, delight
Colors.lavender   // #B79CFF — creativity, art studio
Colors.background // #FFF9F2 — main screen background (warm off-white)
Colors.surface    // #FFFFFF — cards, modals

Typography.regular   // Poppins-Regular
Typography.medium    // Poppins-Medium
Typography.semibold  // Poppins-SemiBold
Typography.bold      // Poppins-Bold
```

### When to use NativeWind vs. StyleSheet

| Situation | Use |
|---|---|
| Standard layout, padding, margin, text, flex | `className` (NativeWind) |
| Animations (`Animated.Value`) | `StyleSheet.create()` |
| Platform-specific properties | `StyleSheet.create()` with `Platform.select` |
| Dynamic runtime values | `StyleSheet.create()` with inline style merge |

### Typography scale

The Tailwind config extends NativeWind with `jasiri.*` tokens. Use `text-jasiri-2xs` through `text-jasiri-4xl` for consistent sizing across the app.

---

## 14. Accessibility Requirements

These are non-negotiable:

- **Touch targets** — minimum 48×48 dp on Android, 44×44 pt on iOS
- **TTS narration** — all interactive elements have `accessibilityLabel`; key screens speak on mount via `expo-speech`
- **Reduced motion** — all screens check `AccessibilityInfo.isReduceMotionEnabled()` and skip or shorten animations
- **Color contrast** — all text meets WCAG AA (4.5:1) minimum; brand palette is AA-compliant
- **Screen reader** — all non-decorative elements have `accessible={true}` and `accessibilityRole`
- **Haptic feedback** — button presses use `expo-haptics` for tactile confirmation
- **Large font support** — layouts use flexible units; do not hard-code pixel heights for text containers

---

## 15. Testing

### Backend

```bash
cd Backend
npm test              # run all tests
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

Tests live in `Backend/src/__tests__/`. The test setup file is `src/__tests__/setup.js`.

### Mobile

```bash
cd Jasiri
npm run lint   # ESLint check
```

End-to-end and component tests are planned for post-MVP. For now, manual accessibility testing on a low-end Android device (≤2 GB RAM) is required before merging any UI change.

---

## 16. Contribution Guidelines

1. **Read `AGENTS.md`** before writing any code. It is the primary engineering contract.
2. **No new dependencies** without team approval. Justify clearly: why, what it replaces, tradeoffs.
3. **Screens contain routes only.** Business logic belongs in `services/`, `store/`, or `utils/`.
4. **Accessibility check on every PR.** Run on a real device with TalkBack/VoiceOver enabled.
5. **Offline test every feature.** Toggle airplane mode and verify graceful fallback.
6. **Security.** All user input is validated on the backend. Never trust client-side data.
7. **No console.log in production.** Use `src/services/logger.js` (mobile) or `utils/logger.js` (backend).
8. **Keep commits small and focused.** One logical change per PR.

---

*JASIRI — Technology in service of dignity.*
