# JASIRI — Launch Readiness Checklist

> **Mission:** Every child who opens JASIRI for the first time deserves a safe, calm, and reliable experience.
> This checklist is the gate between development and real children.
>
> Philosophy: **Ubuntu — We are because of each other.** Ship only when ready.

---

## How to Use This Checklist

- Work through each section in order — later sections depend on earlier ones
- Every `[ ]` item must be `[x]` before tagging `v1.0.0`
- Items marked `🔴 CRITICAL` block launch — no exceptions
- Items marked `🟡 HIGH` must be resolved unless formally risk-accepted with written reasoning
- Items marked `🟢 MEDIUM` are strongly recommended but may carry forward to v1.1

---

## Section 1 — Security & Privacy 🔴

These are non-negotiable. JASIRI handles health data of minor children.

### 1.1 Child Data Protection (COPPA + Kenya DPA 2019)

- [ ] 🔴 `appwrite/collections.js` — Collection-level permissions restrict to `Role.team('admins')` only (see PRIVACY_ETHICS_REVIEW.md C1)
- [ ] 🔴 `medicalInfo` and `emergencyContact` fields are encrypted at the application layer before writing to Appwrite (see PRIVACY_ETHICS_REVIEW.md C2)
- [ ] 🔴 `FIELD_ENCRYPTION_KEY` (32 bytes, AES-256-GCM) is set in Railway and rotated on any suspected breach
- [ ] 🔴 No child PII (name, photo, diagnosis) is logged in plaintext in Winston or Sentry
- [ ] 🔴 Guardian-only auth confirmed — no child login flow exists or can be triggered
- [ ] 🔴 Privacy policy and guardian consent screen shown and accepted before any child profile is created
- [ ] 🟡 Data retention policy is implemented — stale inactive profiles are flagged for deletion after defined period
- [ ] 🟡 Guardian can export and delete all child data from within the app (right to erasure)

### 1.2 Authentication & Token Security

- [ ] 🔴 `JWT_SECRET` and `JWT_REFRESH_SECRET` are ≥ 32 random bytes (`openssl rand -hex 32`)
- [ ] 🔴 `BCRYPT_ROUNDS=12` — never lowered
- [ ] 🔴 Refresh token jti reuse detection confirmed active (`controllers/auth.js`)
- [ ] 🔴 Auth tokens stored in `expo-secure-store` (not AsyncStorage) — confirmed in `services/api.js`
- [ ] 🔴 No tokens, secrets, or API keys appear in source code, git history, or logs
- [ ] 🟡 Session invalidation confirmed when JWT_SECRET is rotated (users re-login gracefully)

### 1.3 Network & API Security

- [ ] 🔴 `CORS_ORIGIN` set to production app bundle ID only — no wildcards (`*`)
- [ ] 🔴 `helmet` middleware active with HSTS preload enabled
- [ ] 🔴 All API routes require authentication except `/auth/login`, `/auth/register`, `/health`
- [ ] 🔴 Rate limiter verified: auth endpoints (15 req/15 min), AI endpoints (20 req/min)
- [ ] 🔴 Request body sanitization (`middleware/sanitize.js`) confirmed active on all routes
- [ ] 🟡 SQL/NoSQL injection impossible — all Appwrite queries use SDK methods only (no raw strings)
- [ ] 🟡 `X-Request-Id` header present in all API responses for tracing

### 1.4 Secrets & Configuration

- [ ] 🔴 No `.env` file committed to git — confirmed via `git log --all -- "**/.env"`
- [ ] 🔴 All required Railway production environment variables set (see DEPLOYMENT.md §3)
- [ ] 🔴 Appwrite API key has minimum required permissions only — no admin scope
- [ ] 🔴 `NODE_ENV=production` confirmed in Railway deployment
- [ ] 🔴 `CONTENT_MODERATION_ENABLED=true` set in production

---

## Section 2 — Backend Readiness

### 2.1 Infrastructure

- [ ] 🔴 Railway service is deployed and `/health` returns `200` with all subsystem fields
- [ ] 🔴 Appwrite Cloud project created, collections set up (`npm run setup:db` executed successfully)
- [ ] 🔴 All Appwrite collection indexes created for query performance
- [ ] 🔴 Redis connection verified in production (Upstash or Railway add-on)
- [ ] 🟡 Winston log level is `info` in production (not `debug` — no PII in debug logs)
- [ ] 🟡 Sentry DSN configured and a test error event received in Sentry dashboard
- [ ] 🟢 Railway auto-scaling or alerting configured for CPU/memory spikes

### 2.2 API Contract

- [ ] 🔴 All backend routes (`auth`, `child`, `game`, `art`, `ai`) respond correctly end-to-end
- [ ] 🔴 Error responses use consistent format from `utils/response.js`
- [ ] 🔴 `utils/audit.js` writes audit log entries for all sensitive actions (profile create/delete, auth events)
- [ ] 🟡 Backend `__tests__/` suite passes with zero failures (`npm test`)
- [ ] 🟡 No `console.log` statements in production code — only Winston logger

### 2.3 Rollback Readiness

- [ ] 🔴 Railway rollback tested — `scripts/rollback-backend.sh` executed at least once in staging
- [ ] 🟡 Latest Railway deployment snapshot is saved before tagging v1.0.0
- [ ] 🟢 Database backup strategy confirmed with Appwrite Cloud export schedule

---

## Section 3 — Mobile App Readiness

### 3.1 Build & Configuration

- [ ] 🔴 `app.json` `version` string and `android.versionCode` incremented for release
- [ ] 🔴 `EXPO_PUBLIC_API_URL` points to production Railway backend URL (not staging, not localhost)
- [ ] 🔴 EAS project ID registered and confirmed in `eas.json`
- [ ] 🔴 Splash screen asset present at correct dimensions (`assets/images/`)
- [ ] 🔴 App icon present for all required Android adaptive icon variants
- [ ] 🔴 Deep link scheme `jasiri://` configured in `app.json`
- [ ] 🟡 EAS production build profile configured (`eas.json` `production` profile)
- [ ] 🟡 OTA update channel configured for post-launch hotfixes (`expo-updates`)
- [ ] 🟡 `scripts/rollback-ota.sh` tested and confirmed working

### 3.2 Device & Performance Testing

- [ ] 🔴 App tested on a physical low-end Android device (≤ 2GB RAM, e.g. Samsung Galaxy A03)
- [ ] 🔴 App launch time is < 3 seconds on the test device (cold start)
- [ ] 🔴 No crashes during a 30-minute continuous session on the test device
- [ ] 🔴 All game screens tested end-to-end on Android (memory match, pattern, word-picture)
- [ ] 🔴 Art studio tested end-to-end — draw, save, retrieve artwork
- [ ] 🟡 App tested on iOS simulator or physical device
- [ ] 🟡 FlatList / scroll performance confirmed smooth (no jank at 60fps)
- [ ] 🟡 All screens tested with screen font size set to "Largest" in Android accessibility settings
- [ ] 🟢 App tested with TalkBack (Android) enabled — no unread or broken elements

### 3.3 Offline Behavior

- [ ] 🔴 Core games are playable with airplane mode enabled
- [ ] 🔴 Art studio is usable offline — saved locally and syncs when reconnected
- [ ] 🔴 Offline progress persists after app restart (Zustand + AsyncStorage confirmed)
- [ ] 🟡 Network error state shown to user clearly — no silent failures
- [ ] 🟡 Optimistic updates do not corrupt data when sync fails

### 3.4 Onboarding Flow

- [ ] 🔴 Guardian can complete registration → child profile creation → first game in < 5 minutes
- [ ] 🔴 Onboarding screen explains the app purpose before any data collection
- [ ] 🔴 Guardian consent for data collection is explicit and logged
- [ ] 🔴 Select-profile screen tested with ≥ 2 child profiles
- [ ] 🟡 Onboarding flow tested with a non-technical caregiver (usability test)

---

## Section 4 — Accessibility Compliance 🔴

> If accessibility is not ready, the app is not ready. This is the core product promise.

- [ ] 🔴 All interactive elements have touch targets ≥ 44×44 points
- [ ] 🔴 All buttons have `accessibilityLabel` props set
- [ ] 🔴 All images have `accessibilityLabel` or `accessible={false}` (decorative)
- [ ] 🔴 Text contrast ratio meets WCAG AA (≥ 4.5:1 for normal text, ≥ 3:1 for large text)
- [ ] 🔴 No time-limited interactions that a child cannot complete in time
- [ ] 🔴 No audio-only feedback — visual equivalent always present
- [ ] 🔴 No motion animations without a reduced-motion fallback
- [ ] 🟡 Game instructions use icons + audio, not text-only
- [ ] 🟡 Positive reinforcement never shows a "failure" or "wrong" state without encouragement
- [ ] 🟡 Color palette is color-blind safe — tested with a deuteranopia/protanopia simulator
- [ ] 🟡 Font sizes use the theme token system — no hardcoded `fontSize` values in screens
- [ ] 🟢 App reviewed by an occupational therapist or special education professional

---

## Section 5 — Monitoring & Observability

### 5.1 Error Tracking

- [ ] 🔴 Sentry is initialized in the mobile app (`services/errorReporting.js`) and a test crash is captured
- [ ] 🔴 Sentry is initialized in the backend and a test error is received
- [ ] 🔴 Sentry alerts configured for `error` and `fatal` events → notify on-call contact
- [ ] 🟡 Sentry source maps uploaded for readable stack traces in production builds
- [ ] 🟡 `ErrorBoundary` component wraps all game screens — no uncaught render crash

### 5.2 Backend Metrics

- [ ] 🟡 Railway metrics dashboard bookmarked — CPU, memory, request latency monitored
- [ ] 🟡 `/health` endpoint polled by an uptime monitor (e.g. UptimeRobot — free tier)
- [ ] 🟡 Alert configured for > 2 minutes of `/health` downtime
- [ ] 🟢 Log aggregation configured (Railway logs → external sink if needed)

### 5.3 App Analytics (Privacy-Safe)

- [ ] 🟡 No third-party analytics SDKs that collect PII (confirmed: no Firebase Analytics, Mixpanel, etc.)
- [ ] 🟡 Internal engagement metrics (session duration, games played) stored anonymized in Appwrite
- [ ] 🟡 `appwrite/security.js` `anonymizeForAnalytics()` used before any analytics writes
- [ ] 🟢 Dashboard (caregiver-facing) shows meaningful progress data, not raw usage counts

---

## Section 6 — Caregiver & Support Readiness

- [ ] 🔴 Parent/Guardian in-app guide or tooltip is present before the first session
- [ ] 🟡 `docs/PARENT_TEACHER_GUIDE.md` is accessible as an in-app help link or web page
- [ ] 🟡 Support contact (email or WhatsApp) is visible in Settings screen
- [ ] 🟡 A caregiver can reset a child's PIN or profile without contacting support
- [ ] 🟡 Guardian reports screen shows real data — not placeholder content
- [ ] 🟢 At least one caregiver (parent or teacher) has used the app and given feedback

---

## Section 7 — Feedback Loops & Iteration Plan

### 7.1 Pre-Launch (Before v1.0.0 Tag)

- [ ] Closed beta with 3–5 caregiver families in Nairobi
- [ ] Session observations with at least 2 children using the app
- [ ] Blockers from beta documented and resolved or formally risk-accepted
- [ ] Backend load test simulating 50 concurrent users executed

### 7.2 Launch Week (Days 1–7)

- [ ] Monitor Sentry daily — triage every `error` within 24 hours
- [ ] Monitor Railway `/health` — confirm uptime > 99.5%
- [ ] Collect caregiver feedback via in-app prompt or WhatsApp group
- [ ] OTA hotfix process ready — tested with a non-breaking change before launch
- [ ] Rollback plan confirmed with entire team

### 7.3 Post-Launch Iteration Cadence

| Week | Focus |
|------|-------|
| Week 1 | Stability — fix crashes, auth issues, offline edge cases |
| Week 2 | Caregiver feedback — usability pain points, onboarding gaps |
| Week 3 | Engagement — which games are played most? Which are abandoned? |
| Week 4 | Accessibility — field observations with children, occupational therapist review |
| Month 2 | AI personalization tuning — adjust difficulty rules based on real session data |
| Month 3 | Feature expansion — new game types, additional language support (Swahili) |

### 7.4 Success Metrics (What "Good" Looks Like After 30 Days)

| Metric | Target |
|--------|--------|
| Crash-free sessions | ≥ 98% |
| Backend uptime | ≥ 99.5% |
| Average session length | ≥ 8 minutes |
| Caregiver retention (week 2) | ≥ 60% of beta families active |
| Guardian-reported satisfaction | ≥ 4 / 5 |
| Art saves per child per week | ≥ 3 (emotional expression signal) |
| Game completion rate | ≥ 70% of started sessions |

---

## Section 8 — Go / No-Go Decision Gate

Complete this table on launch day. Every 🔴 CRITICAL item must show ✅.

| Area | Status | Owner | Notes |
|------|--------|-------|-------|
| Child data encrypted at rest | ☐ | | |
| Collection permissions tightened | ☐ | | |
| No secrets in git | ☐ | | |
| Backend `/health` returns 200 | ☐ | | |
| Low-end Android device tested | ☐ | | |
| Core games work offline | ☐ | | |
| Touch targets ≥ 44pt | ☐ | | |
| Sentry receiving errors | ☐ | | |
| Guardian consent flow complete | ☐ | | |
| OTA rollback tested | ☐ | | |

**Launch is blocked until all rows show ✅.**

---

## Final Principle

> JASIRI is not just software.
> It is inclusion through technology, dignity through design, confidence through learning.
>
> Every `[x]` in this checklist is a promise kept to a child and their family.
>
> **Ship only when ready. Launch confidently. Iterate with care.**

---

*Last updated: May 2026 | Version: 1.0.0-rc*
