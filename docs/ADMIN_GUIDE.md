# JASIRI — Platform Administrator Guide

> This guide covers environment setup, Appwrite provisioning, backend deployment, mobile distribution, security hardening, and monitoring.
> For developer onboarding, see [docs/DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md).

---

## Table of Contents

1. [Platform Architecture](#1-platform-architecture)
2. [Appwrite Cloud Setup](#2-appwrite-cloud-setup)
3. [Backend Deployment (Railway)](#3-backend-deployment-railway)
4. [Environment Variables Reference](#4-environment-variables-reference)
5. [Redis Setup](#5-redis-setup)
6. [Mobile App Deployment (EAS)](#6-mobile-app-deployment-eas)
7. [Security Hardening Checklist](#7-security-hardening-checklist)
8. [User Role Management](#8-user-role-management)
9. [Monitoring & Health Checks](#9-monitoring--health-checks)
10. [Backup & Data Retention](#10-backup--data-retention)
11. [Rollback Procedures](#11-rollback-procedures)
12. [Incident Response](#12-incident-response)
13. [Compliance: COPPA & Kenya DPA](#13-compliance-coppa--kenya-dpa)

---

## 1. Platform Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      JASIRI PLATFORM                      │
│                                                            │
│   ┌─────────────────────┐  ┌──────────────────────────┐  │
│   │  Mobile App (Expo)  │  │  Backend API (Express)   │  │
│   │  EAS Build          │  │  Railway.app             │  │
│   │  OTA: expo-updates  │  │  Node.js 18 LTS          │  │
│   └──────────┬──────────┘  └────────────┬─────────────┘  │
│              │  HTTPS / REST             │                 │
│              └──────────────────────────┘                 │
│                           │                               │
│   ┌───────────────────────▼─────────────────────────────┐│
│   │          Appwrite Cloud                              ││
│   │  Auth · Database · Storage · Permissions            ││
│   └──────────────────────────────────────────────────────┘│
│                                                            │
│   ┌─────────────────┐  ┌──────────────────────────────┐  │
│   │  Redis Cache    │  │  Logging (Winston + Sentry)  │  │
│   │  Railway add-on │  │  Railway metrics dashboard   │  │
│   └─────────────────┘  └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Hosting stack

| Component | Service | Tier |
|---|---|---|
| Backend API | [Railway](https://railway.app) | Hobby → Pro at scale |
| Database + Auth + Storage | [Appwrite Cloud](https://cloud.appwrite.io) | Free → Pro |
| Redis | Upstash (serverless) or Railway Redis add-on | Free tier |
| Mobile builds | [Expo EAS](https://expo.dev/eas) | Free → Production |
| Crash tracking | Sentry | Free tier |

---

## 2. Appwrite Cloud Setup

### 2.1 Create the project

1. Sign in at [cloud.appwrite.io](https://cloud.appwrite.io).
2. Click **Create project** → name it `JASIRI`.
3. Note the **Project ID** — you will need it in the env file.

### 2.2 Create an API key

1. Go to **Settings → API Keys → Add API Key**.
2. Name: `jasiri-backend`.
3. Expiry: **Never** (rotate manually every 90 days in production).
4. Scopes to enable:

| Scope | Reason |
|---|---|
| `databases.read` | Read collections and documents |
| `databases.write` | Create/update/delete documents |
| `users.read` | Verify account status |
| `users.write` | Create user accounts, update preferences |
| `storage.read` | Read artwork files |
| `storage.write` | Upload and delete artwork |

5. Copy the key and save it as `APPWRITE_API_KEY` in your backend `.env`.

### 2.3 Provision database collections

Run the setup script once per environment:

```bash
cd Backend

# Copy and fill in your .env first (see Section 4)
npm run setup:db
```

This creates:

| Collection | Purpose |
|---|---|
| `guardians` | Guardian profiles (name, email hash, role) |
| `children` | Child profiles (name, age, guardian link) |
| `game_sessions` | Game play sessions per child |
| `game_attempts` | Individual attempts within a session |
| `learning_profiles` | AI personalisation data per child |
| `goals` | Learning goals set by guardians |
| `games` | Game catalogue (seeded manually or via API) |

### 2.4 Storage bucket

1. In Appwrite console → **Storage → Create Bucket**.
2. Name: `artwork`.
3. Max file size: **5 MB**.
4. Allowed extensions: `jpg, jpeg, png, webp`.
5. Enable **Antivirus** scan if available on your plan.
6. Set permissions: `create(Role.users())` — authenticated guardians upload; `read` scoped to document-level per child.

### 2.5 Email verification (professional roles)

Teachers and therapists must verify their email before accessing child/AI data.

1. In Appwrite console → **Auth → Email/Password** — ensure this is enabled.
2. Customise the verification email template: **Messaging → Templates → Verification**.
3. Set the redirect URL to your app's deep link (e.g. `jasiri://verify`).

### 2.6 Hardening collection permissions

> **Critical.** The setup script creates collections with broad `Role.users()` permissions for ease of first-run. Before going live, tighten them:

In Appwrite console → **Databases → [collection] → Settings → Permissions**:

| Collection | Remove | Keep |
|---|---|---|
| `guardians` | `read(Role.users())` | `create(Role.users())` |
| `children` | `read(Role.users())`, `update(Role.users())`, `delete(Role.users())` | `create(Role.users())` |
| All others | `read(Role.users())` | `create(Role.users())` |

Document-level permissions set by the backend controllers handle per-guardian access. Collection-level read permissions should be restricted to the `admins` team.

---

## 3. Backend Deployment (Railway)

### 3.1 First-time deploy

1. Sign in at [railway.app](https://railway.app).
2. Click **New Project → Deploy from GitHub** → connect the `Jasiri3` repository.
3. Select the **`Backend`** directory as the root.
4. Railway auto-detects Node.js from `package.json`.

### 3.2 Set environment variables

In Railway project → **Variables** tab, add every variable from [Section 4](#4-environment-variables-reference).

**Critical:** Never commit `.env` to Git. Use Railway's UI for production secrets.

### 3.3 Health check

Railway pings `/health` to determine if the deployment is healthy.

Ensure the `railway.json` at the root of Backend sets:

```json
{
  "healthcheckPath": "/health",
  "restartPolicyType": "on_failure"
}
```

### 3.4 Custom domain

1. Railway project → **Settings → Domains → Add Custom Domain**.
2. Point your DNS `CNAME` to the Railway-provided hostname.
3. Railway provisions a Let's Encrypt TLS certificate automatically.

### 3.5 Scaling

Railway's Hobby plan runs on shared CPUs. For production load:

- Upgrade to **Pro** for dedicated CPU and memory.
- Enable **horizontal scaling** (multiple replicas) once daily active users exceed ~500.
- Add Upstash Redis for shared session cache across replicas.

---

## 4. Environment Variables Reference

All variables are validated at startup via Zod. The backend will crash with a clear error if a required variable is missing.

### Required

| Variable | Example | Description |
|---|---|---|
| `NODE_ENV` | `production` | `development`, `staging`, or `production` |
| `PORT` | `3000` | HTTP port |
| `APPWRITE_ENDPOINT` | `https://cloud.appwrite.io/v1` | Appwrite API URL |
| `APPWRITE_PROJECT_ID` | `abc123` | Appwrite project ID |
| `APPWRITE_API_KEY` | `v1:xxx...` | Server-side API key (never expose to client) |
| `APPWRITE_DATABASE_ID` | `jasiri_db` | Main database ID |
| `APPWRITE_COLLECTION_GUARDIANS` | `guardians` | Collection ID |
| `APPWRITE_COLLECTION_CHILDREN` | `children` | Collection ID |
| `APPWRITE_GAME_SESSIONS_COLLECTION` | `game_sessions` | Collection ID |
| `APPWRITE_GAME_ATTEMPTS_COLLECTION` | `game_attempts` | Collection ID |
| `APPWRITE_LEARNING_PROFILES_COLLECTION` | `learning_profiles` | Collection ID |
| `APPWRITE_GOALS_COLLECTION` | `goals` | Collection ID |
| `APPWRITE_GAMES_COLLECTION` | `games` | Collection ID |
| `JWT_SECRET` | *(32+ random chars)* | Access token signing secret |
| `JWT_EXPIRES_IN` | `7d` | Access token lifetime |
| `JWT_REFRESH_SECRET` | *(32+ random chars, different)* | Refresh token secret |
| `JWT_REFRESH_EXPIRES_IN` | `30d` | Refresh token lifetime |
| `CORS_ORIGIN` | `https://myapp.com` | Comma-separated allowed origins |

### Optional but recommended

| Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `REDIS_PASSWORD` | *(empty)* | Redis auth password |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Requests per window |
| `LOG_LEVEL` | `info` | `error`, `warn`, `info`, `debug` |
| `LOG_FILE` | `logs/app.log` | Log file path |
| `BCRYPT_ROUNDS` | `12` | bcrypt work factor (keep ≥12) |

### Generating secrets

```bash
# Requires OpenSSL (pre-installed on Linux/macOS; Windows: Git Bash)
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # JWT_REFRESH_SECRET (run again for a different value)
```

---

## 5. Redis Setup

Redis is used to cache:
- Rate limit counters (express-rate-limit store)
- AI recommendation results (5-minute TTL)
- Session metadata

### Upstash (recommended for production)

1. Create a free database at [upstash.com](https://upstash.com).
2. Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. Set `REDIS_URL` in Railway to the Upstash TLS URL: `rediss://default:PASSWORD@HOST:PORT`.

### Railway Redis add-on

1. Railway project → **New Service → Database → Redis**.
2. The `REDIS_URL` variable is injected automatically.

### Without Redis

The backend degrades gracefully without Redis — rate limiting falls back to in-memory (resets on restart; not suitable for multi-replica deploys).

---

## 6. Mobile App Deployment (EAS)

### 6.1 Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### 6.2 Configure `eas.json`

The `Jasiri/eas.json` file defines three build profiles:

```json
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview":     { "distribution": "internal" },
    "production":  { "autoIncrement": true }
  },
  "submit": {
    "production": {
      "android": { "serviceAccountKeyPath": "./google-service-account.json" },
      "ios":     { "appleId": "your@appleid.com", "ascAppId": "123456789" }
    }
  }
}
```

### 6.3 Build and submit

```bash
cd Jasiri

# Android
eas build --platform android --profile production
eas submit --platform android --latest

# iOS
eas build --platform ios --profile production
eas submit --platform ios --latest
```

### 6.4 OTA updates (expo-updates)

Publish JavaScript-only updates without a new app store release:

```bash
eas update --branch production --message "Fix: offline fallback for child list"
```

OTA updates are safe for bug fixes and content changes. Use a full build for:
- Native module changes
- New permissions in `app.config.js`
- Expo SDK version upgrades

### 6.5 App store metadata

| Field | Android (Play Store) | iOS (App Store) |
|---|---|---|
| Category | Education | Education |
| Content rating | Everyone | 4+ |
| Privacy policy URL | Required | Required |
| Data safety | Declare child data collection | Declare child data |

---

## 7. Security Hardening Checklist

Complete every item before collecting real child data.

### Backend

- [ ] `NODE_ENV=production` set
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are ≥32 random bytes and **different**
- [ ] `BCRYPT_ROUNDS` is ≥12
- [ ] HTTPS enforced (Railway provides TLS; verify HSTS header is present)
- [ ] `CORS_ORIGIN` lists only your production app origin(s) — no wildcards
- [ ] Rate limiter is active on all `/api` routes
- [ ] Redis is password-protected in production
- [ ] Appwrite API key has **minimum required scopes only**
- [ ] Collection-level permissions hardened (see Section 2.6)
- [ ] Audit log (`utils/audit.js`) writing to persistent storage
- [ ] No `console.log` in production code (only Winston logger)

### Appwrite

- [ ] API key rotated — document the new expiry date
- [ ] Collection permissions scoped to `admins` team at collection level
- [ ] Storage bucket file size limit set (5 MB)
- [ ] Storage antivirus enabled (if on paid plan)
- [ ] Email verification enforced for teacher/therapist roles

### Mobile

- [ ] `EXPO_PUBLIC_API_URL` points to production backend
- [ ] No secrets in `app.config.js` or `.env` files committed to Git
- [ ] Expo SecureStore used for all tokens and PII (never AsyncStorage for auth)
- [ ] Deep links properly configured for email verification redirect

---

## 8. User Role Management

### Guardian roles

| Role | Who | Access |
|---|---|---|
| `parent` | Primary caregiver | Manage own children; view progress |
| `caregiver` | Extended family, carer | Same as parent |
| `teacher` | School staff | Same as parent; **requires email verification** |
| `therapist` | OT, speech therapist | Same as teacher; **requires email verification** |

### Admin access

There is no in-app admin panel in V1. Administrative tasks are performed directly in the Appwrite console:

- **Disable an account:** Console → Users → [user] → Block.
- **Delete a guardian and all child data:** Console → Users → [user] → Delete; then manually delete associated Appwrite documents.
- **Grant admin team membership:** Console → Teams → admins → Members → Invite.

### Handling guardian account deletion requests

Under GDPR/Kenya DPA, a guardian may request full deletion:

1. In Appwrite console, find the user by email.
2. Delete all documents in `children` collection linked to `guardianId`.
3. Delete associated `game_sessions`, `game_attempts`, `learning_profiles`, `goals` documents.
4. Delete artwork files in Storage linked to the child.
5. Delete the Appwrite user account.
6. Log the deletion in your audit trail.

---

## 9. Monitoring & Health Checks

### Health endpoint

```
GET /health
```

Returns `200 OK` with:
```json
{
  "status": "healthy",
  "timestamp": "2026-05-18T10:00:00.000Z",
  "uptime": 86400,
  "environment": "production"
}
```

Railway pings this every 30 seconds. A failure triggers an alert and automatic restart.

### Winston logs

All logs are structured JSON written to:
- **stdout** — Railway streams these to its dashboard
- **`logs/app.log`** — rolling file (configure log rotation in production)

Log levels: `error > warn > info > debug`

Each log entry includes: `timestamp`, `level`, `message`, `requestId`, `userId` (where applicable).

### Key log events to monitor

| Event | Level | Action required |
|---|---|---|
| `Auth failure` | `warn` | High rate → possible brute-force; rate limiter should kick in |
| `Rate limit exceeded` | `warn` | Investigate source IP |
| `Unhandled error` | `error` | Investigate immediately |
| `Appwrite connection failure` | `error` | Check Appwrite status page |
| `JWT reuse detected` | `warn` | Possible token theft; consider invalidating user session |

### Sentry integration (recommended)

1. Create a project at [sentry.io](https://sentry.io).
2. Add the Sentry DSN to your backend env: `SENTRY_DSN=https://...`.
3. Initialise Sentry in `src/server.js` before route registration.
4. Set up alert rules for `error` level events.

---

## 10. Backup & Data Retention

### Appwrite Cloud (Pro plan)

- Daily automated backups are included on the Pro plan.
- Download a backup: Console → **Settings → Backups**.

### Self-hosted Appwrite

Run `appwrite backup` on a schedule (e.g. via Railway cron or external CI):

```bash
# Example: export all databases
appwrite databases export --databaseId jasiri_db
```

### Retention policy (Kenya DPA / COPPA guidance)

| Data type | Retention | Action at expiry |
|---|---|---|
| Active child profiles | Duration of guardian account | Guardian-controlled deletion |
| Inactive accounts (no login > 2 years) | 2 years | Anonymise or delete |
| Game session data | 3 years | Anonymise (remove child link) |
| Artwork | Until guardian deletes | No automatic deletion |
| Audit logs | 5 years | Archive to cold storage |

---

## 11. Rollback Procedures

### Backend rollback (Railway)

Railway keeps full deployment history.

1. Railway project → **Deployments** tab.
2. Find the last known-good deployment.
3. Click **Redeploy**.

Or using the CLI:

```bash
# Redeploy a specific commit
railway up --detach  # then select the commit in the UI
```

The `Backend/scripts/rollback-backend.sh` script automates this for CI pipelines.

### Mobile app rollback (OTA)

Roll back an OTA update without a new app store release:

```bash
# Revert to a specific update
eas update --branch production --republish --group <previous-update-group-id>
```

### Mobile app rollback (store release)

If the current native build is broken:

1. Submit the previous `.aab` / `.ipa` to the store using the previous build artifact from EAS.
2. Use `eas build:list` to find previous build IDs.

---

## 12. Incident Response

### Severity levels

| Level | Example | Response time |
|---|---|---|
| P1 (Critical) | API down; data breach suspected | Immediate |
| P2 (High) | Auth failing for all users; Appwrite unreachable | < 1 hour |
| P3 (Medium) | Specific game feature broken; slow responses | < 4 hours |
| P4 (Low) | Minor UI bug; log noise | Next sprint |

### P1 runbook

1. **Identify:** Check Railway health dashboard + Sentry alerts.
2. **Isolate:** Roll back to last healthy deployment (Section 11).
3. **Communicate:** Notify affected guardians via email if data is impacted.
4. **Investigate:** Pull logs from Railway; check Appwrite audit trail.
5. **Post-mortem:** Document root cause, fix, and preventive measures within 48 hours.

### Suspected data breach

1. Immediately rotate all JWT secrets and Appwrite API keys.
2. Force-expire all active refresh tokens (delete `jti` from all user prefs in Appwrite).
3. Notify affected guardians within 72 hours (Kenya DPA requirement).
4. File a breach report with the Kenyan Office of the Data Protection Commissioner if personal data was accessed.

---

## 13. Compliance: COPPA & Kenya DPA

JASIRI is designed for children. The following controls are mandatory:

### COPPA (Children's Online Privacy Protection Act)

| Requirement | Implementation |
|---|---|
| No child accounts | Children never authenticate; guardian-only auth |
| Verifiable parental consent | Guardian account creation + email verification |
| Data minimisation | Only name and age collected for child profiles |
| No targeted advertising | No ad SDKs; no third-party analytics |
| Right to deletion | Guardians can delete child profiles at any time |

### Kenya Data Protection Act 2019

| Requirement | Implementation |
|---|---|
| Lawful basis for processing | Explicit consent during guardian registration |
| Data subject rights | Deletion available in-app + via admin console |
| Data minimisation | Collect only what is necessary for learning |
| Storage limitation | Retention policy defined (Section 10) |
| Security | bcrypt, JWT, HTTPS, rate limiting, audit logs |
| Data Protection Officer | Appoint before launch; register with ODPC |
| Privacy policy | Publish and link from app store listing |

### Privacy policy minimum contents

- What data is collected and why
- How data is stored and for how long
- Whether data is shared with third parties (it is not, in V1)
- How guardians can request deletion
- Contact information for data protection queries

---

*JASIRI — Inclusion through technology. Dignity through design.*
