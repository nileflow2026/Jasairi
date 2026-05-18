# JASIRI Privacy & Ethics Review
**Scope:** Full codebase audit — Backend (`src/`) + Mobile (`Jasiri/src/`)  
**Date:** May 2026  
**Standard:** OWASP Top 10, COPPA, Kenya Data Protection Act 2019, WCAG, Ubuntu design philosophy

---

## Summary Verdict

JASIRI has a strong foundational security posture. The COPPA-first architecture, JWT rotation, bcrypt hashing, rate limiting, and audit logging are all production-quality. However, **five critical gaps must be closed before any real-child data is collected**, and several medium-risk issues should be addressed before public launch.

---

## What Is Already Good

| Control | Where |
|---|---|
| Children never authenticate — guardian-only auth | `auth.js`, `select-profile.jsx` |
| JWT refresh token rotation with jti reuse detection | `controllers/auth.js` |
| Auth tokens stored in `expo-secure-store`, not AsyncStorage | `services/api.js` |
| bcrypt(12) for password hashing | `controllers/auth.js` |
| Rate limiting: auth (15/15 min), AI (20/min) | `middleware/rateLimiter.js` |
| HTML/script-injection sanitization on all request bodies | `middleware/sanitize.js` |
| Role-based access: parent, teacher, therapist, caregiver | `middleware/authenticate.js` |
| Professional roles gated behind `requireVerified` | `middleware/authenticate.js` |
| Audit log for every sensitive action | `utils/audit.js` |
| Document-level Appwrite permissions per guardian | `controllers/child.js` line 75 |
| Data anonymization function for analytics | `appwrite/security.js` |
| Zod schema enforces valid config at startup | `config/index.js` |
| No third-party analytics/telemetry SDKs present | entire codebase |

---

## CRITICAL Risks — Fix Before Collecting Real Data

### C1. Collection-Level Permissions Are Too Broad
**File:** `appwrite/collections.js` — `createGuardiansCollection`, `createChildrenCollection`, all collections  
**Risk:** Every collection is configured with `Permission.read(Role.users())` — meaning **any authenticated guardian can read every other guardian's documents and every child's profile** at the collection query level.

```js
// CURRENT — dangerous
const permissions = [
  Permission.read(Role.users()),    // ← any logged-in user
  Permission.create(Role.users()),
  Permission.update(Role.users()),
  Permission.delete(Role.users()),
];
```

Document-level permissions are correct in `createChild()`, but Appwrite evaluates collection-level permissions as a gate. Cross-tenant reads become possible depending on query construction.

**Fix:** Restrict collection permissions to admin-role team only. Let document-level permissions handle per-guardian access.

```js
// RECOMMENDED
const permissions = [
  Permission.read(Role.team('admins')),
  Permission.create(Role.users()),   // any guardian can create
];
// Document-level permissions already grant per-guardian read/update/delete
```

---

### C2. `medicalInfo` and `emergencyContact` Stored as Plain Text
**File:** `appwrite/collections.js` line 126, `controllers/child.js` line 64  
**Risk:** `medicalInfo` (diagnoses, medications, therapies) and `emergencyContact` (third-party PII) are stored as unencrypted strings in Appwrite. A database breach or misconfigured API key directly exposes this special-category health data.

Under Kenya's Data Protection Act 2019 (s.46) and most global frameworks, health data of minors requires heightened protection including **encryption at rest**.

**Fix:** Encrypt at the application layer before writing. Decrypt on read. Never log or expose raw values.

```js
// services/encryption.js
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY = Buffer.from(process.env.FIELD_ENCRYPTION_KEY, 'hex'); // 32 bytes

export function encryptField(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptField(ciphertext) {
  const [ivHex, tagHex, dataHex] = ciphertext.split(':');
  const decipher = createDecipheriv(ALGO, KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(dataHex, 'hex')) + decipher.final('utf8');
}
```

Add `FIELD_ENCRYPTION_KEY` to your `.env` (never commit it). Apply `encryptField`/`decryptField` in `createChild` and `updateChild` controllers.

---

### C3. No Data Retention Enforcement
**File:** `appwrite/security.js` — `SecurityService.COPPA_RULES`  
**Risk:** `DATA_RETENTION_DAYS: 365` and `AUTOMATIC_DELETION_AGE: 18` are defined as constants but are **never enforced**. No scheduled job, no cron task, no deletion trigger exists in the codebase. Child data accumulates indefinitely.

Under COPPA and the Kenya DPA, operators must delete child data when it is no longer needed or when the child reaches adulthood.

**Fix:** Implement a scheduled cleanup job (run nightly via a Node cron or Appwrite Function):

```js
// scripts/data-retention.js
const { Query } = require('node-appwrite');

async function enforceRetention(databases, databaseId, childrenCollection) {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18); // 18 years ago

  const aged = await databases.listDocuments(databaseId, childrenCollection, [
    Query.lessThan('dateOfBirth', cutoff.toISOString()),
    Query.equal('isActive', true),
  ]);

  for (const child of aged.documents) {
    // Anonymize, then deactivate — never hard-delete without guardian notification
    await notifyGuardian(child.guardianIds[0], 'data_retention_notice');
    await databases.updateDocument(databaseId, childrenCollection, child.$id, {
      isActive: false,
      name: '[anonymized]',
      medicalInfo: null,
      emergencyContact: null,
      dateOfBirth: null,
    });
  }
}
```

---

### C4. No Parental Consent Record
**File:** `controllers/child.js` `createChild()`  
**Risk:** Creating a child profile requires no explicit, recorded consent from the guardian. COPPA mandates **verifiable parental consent** is obtained and recorded before collecting data from or about a child under 13.

**Fix:** Add a `consentRecords` collection (or field on the child document) that captures:

```js
// When creating a child profile, also record consent
const consentRecord = {
  childId: child.$id,
  guardianId: req.user.sub,
  consentVersion: '1.0',           // bump when privacy policy changes
  consentTimestamp: new Date().toISOString(),
  ipAddress: req.ip,               // hashed, not raw
  userAgent: req.headers['user-agent'],
  dataCollectionPurpose: ['learning_personalization', 'progress_tracking'],
};
```

Surface this to guardians in the dashboard as a clear record of what they consented to and when.

---

### C5. Content Moderation Is Largely Unimplemented
**File:** `appwrite/security.js`  
**Risk:** Three moderation gaps exist that could allow inappropriate content to reach caregivers or the platform:

1. `bannedWords: []` — text moderation has **no actual word list**
2. `moderateVoice()` — called but not implemented (the switch statement falls through without a `default`)
3. Artwork image content analysis is explicitly `// TODO`

These gaps matter most for voice recordings and free-text notes that caregivers or therapists might enter.

**Fix (priority order):**
1. Add a curated `bannedWords` list appropriate for a children's educational platform
2. Implement `moderateVoice`: validate duration, format, file header signature
3. For image moderation, integrate a lightweight on-device check (file signature validation, EXIF stripping) as a minimum before a cloud-based solution is viable

---

## HIGH Risks — Fix Before Public Launch

### H1. JWT Access Token Lifetime Is 7 Days
**File:** `config/index.js` — `jwt.expiresIn: "7d"`  
**Risk:** A 7-day access token significantly increases the window of exposure if a token is intercepted or a device is stolen. For an app holding children's health and behavioral data, 15–30 minutes is the industry standard.

**Fix:**
```js
// .env
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
```
The refresh token infrastructure is already in place. Use it.

---

### H2. Child Name Stored Unencrypted in AsyncStorage
**File:** `components/DashboardShell.jsx` line 68  
**Risk:** `AsyncStorage.setItem(STORAGE_KEYS.CHILD_NAME, data.name)` stores the child's name in plaintext on-device storage. On unrooted Android, this is application-sandboxed, but on rooted devices or via ADB backup, it is readable.

**Fix:** Store only a non-identifying session indicator (e.g., child profile index) in AsyncStorage. Retrieve the child's name from the authenticated API call on each session load.

---

### H3. Teacher/Therapist Verification Workflow Is Undefined
**File:** `middleware/authenticate.js` — `requireVerified`  
**Risk:** The `requireVerified` gate correctly blocks unverified professionals. But there is no implementation of *how* verification happens. This means:
- A teacher can register and attempt to access children's data  
- An admin must somehow flip `isVerified: true` with no UI or API defined  
- The gap could lead to either lockout (no one can verify) or manual bypassing

**Fix:** Build a minimal admin verification endpoint and a simple notification flow:

```
POST /admin/guardians/:id/verify  (admin-only route)
→ sets isVerified: true
→ sends email notification to teacher/therapist
→ creates audit log entry
```

---

### H4. `dateOfBirth` Exact Value Collected When Only Age Is Used
**File:** `appwrite/collections.js` line 116, `controllers/child.js` line 57  
**Risk:** Exact date of birth is sensitive PII. The codebase uses `age` for all logic. Storing exact DOB creates unnecessary data that heightens risk in a breach.

**Fix:** Remove `dateOfBirth` from the children collection schema unless it is actively needed for a specific feature (e.g., age-appropriate content filtering could use birth year only). Apply the **data minimization principle**.

---

### H5. No Privacy Policy Visible in the App
**File:** `app/select-profile.jsx` — privacy note present but insufficient  
**Risk:** The current "COPPA compliant" note in `select-profile.jsx` is a label, not informed consent. Guardians have no way to read what data is collected, how it's used, or how to request deletion.

**Fix:** Add a tappable "Privacy Policy" link on the registration screen, login screen, and settings. Host a plain-language policy that covers:
- What data is collected (name, age, game performance, artwork)
- Who can access it (guardian, verified teachers)
- How long it is kept (12 months, deleted when child reaches 18)
- How to request deletion (email address or in-app delete button)
- That no data is sold to third parties

---

## MEDIUM Risks — Fix Before Scale

### M1. `passwordHash` Stored in Appwrite User Prefs
**File:** `controllers/auth.js` line 90  
**Risk:** Storing the bcrypt hash in user prefs is creative but unconventional. Appwrite prefs are readable by the account owner via the client SDK, and by any server-side code with the admin API key. While bcrypt is one-way, prefs storage bypasses Appwrite's credential security model.

**Fix:** Use Appwrite's native password management for authentication. Store only the `refreshJti` in prefs. If custom password management is required, store the hash in a server-only `guardian_credentials` collection with admin-only read permissions.

---

### M2. No Idle Session Timeout on Caregiver Dashboard
**Risk:** If a parent leaves their device unlocked with JASIRI open, any person can view child progress, photos, and medical info indefinitely.

**Fix:** Add a 10-minute inactivity timer in the `DashboardShell` that blurs the screen and requires biometric/PIN re-authentication.

```js
// hooks/useIdleTimer.js
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

export function useIdleTimer(onIdle, timeoutMs = 10 * 60 * 1000) {
  const timer = useRef(null);
  const resetTimer = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(onIdle, timeoutMs);
  };
  // reset on any touch gesture and on AppState active
  useEffect(() => { resetTimer(); }, []);
}
```

---

### M3. `accessibilityNeeds` Creates a Disability Profile
**File:** `appwrite/collections.js` — `createLearningProfilesCollection`  
**Risk:** Storing `accessibilityNeeds` alongside a child's identity creates a formal record linking the child to specific disability characteristics. In the wrong hands (insurance, employers in 15 years), this is harmful.

**Fix:**
- Never link `accessibilityNeeds` directly to identity in any API response
- Ensure this field is always included in `anonymizeChildData()`
- Add a note in the data model documentation: this field must never appear in exports, analytics dashboards, or third-party integrations

---

### M4. Audit Log Stores Raw `meta` JSON
**File:** `utils/audit.js`  
**Risk:** `meta: JSON.stringify(meta)` is passed by callers without consistent sanitization. A caller could accidentally log sensitive values (a child's name, an error message containing PII).

**Fix:** Add a sanitization step in `auditLog()` before writing:

```js
const SENSITIVE_KEYS = ['name', 'email', 'medicalInfo', 'emergencyContact', 'password'];
function sanitizeMeta(meta) {
  const clean = { ...meta };
  for (const key of SENSITIVE_KEYS) {
    if (key in clean) clean[key] = '[redacted]';
  }
  return clean;
}
// Usage:
meta: JSON.stringify(sanitizeMeta(meta)),
```

---

## Ethical Considerations

### E1. Disability Behavioral Data — Purpose Limitation
The app collects granular game interaction data: accuracy per attempt, response speed, attention span, preferred game types, challenge areas. This creates a **detailed behavioral profile of a child with a disability**.

**Risk:** Even anonymized, these profiles — if aggregated — could be used to discriminate, to identify vulnerability patterns, or to train commercial AI systems without consent.

**Required safeguards:**
- Define a strict, written data use policy: data is used only to personalize the in-app experience for this child
- Never sell, license, or share interaction data with third parties
- Never use this data to train external ML models without explicit opt-in consent from each guardian
- Add a `dataPurpose` field to the `aiRecommendations` schema documenting why each recommendation was generated

---

### E2. Guardianship Model Assumptions
The current model assumes a single stable guardian per child (`guardianIds[0]`). In the Kenyan context, children may be cared for by:
- Extended family members in rotating arrangements
- Institutional caregivers in special schools
- Multiple parents after separation/divorce

**Risk:** A custody dispute could result in an unauthorized adult accessing a child's profile if guardianship is not formally managed.

**Fix:** Add a guardian management flow:
- Primary guardian (creator) can invite secondary guardians with limited read-only access
- Primary guardian can revoke secondary access at any time
- Audit log captures all guardian access events

---

### E3. Stigma Risk in Progress Reporting
The caregiver dashboard displays "challenge areas" and "success rate" metrics. Framing matters enormously. Labeling a child's difficulties as "failure" or displaying low scores prominently can:
- Harm caregiver perception of the child
- Affect how teachers interact with the child
- Cause emotional harm if the child ever sees the dashboard

**Fix:**
- Replace "challenge areas" language with "growth opportunities" in all API responses and UI
- Cap displayed scores at a minimum floor to prevent discouraging visuals
- Never show raw accuracy scores to the child — only to guardians
- Add a "what this means" tooltip on every metric explaining it in positive terms

---

### E4. Ubuntu Principle — Data Governance Must Reflect Community Values
JASIRI's founding philosophy is "we are because of each other." This should extend to data governance:

- **Transparency:** Guardians should see every piece of data stored about their child, in plain language, on demand
- **Collective benefit:** If aggregate (anonymized) insights are used to improve the app, guardians should know this and be able to opt out
- **Right to erasure:** Provide a one-tap "Delete all my child's data" option in settings, with immediate effect
- **No dark patterns:** Never use engagement metrics to drive longer usage sessions — the app's purpose is learning, not time-on-app

---

## Compliance Checklist

| Requirement | Status | Action Needed |
|---|---|---|
| Children don't authenticate directly | ✅ Done | — |
| Parental consent recorded at profile creation | ❌ Missing | C4 above |
| Health data encrypted at rest | ❌ Missing | C2 above |
| Data retention enforced automatically | ❌ Missing | C3 above |
| Privacy policy accessible in-app | ❌ Missing | H5 above |
| Right to erasure (delete child data) | ❌ Missing | E4 above |
| Access token lifetime ≤ 30 min | ❌ 7 days | H1 above |
| Content moderation functional | ❌ Partial | C5 above |
| Audit log PII sanitization | ❌ Missing | M4 above |
| Collection-level permissions restricted | ❌ Too broad | C1 above |
| Professional verification workflow | ❌ Missing | H3 above |
| Kenya DPA registration (if processing health data) | ⚠️ TBD | Legal counsel |

---

## Recommended Fix Priority

```
Week 1 (pre-data-collection):
  C1 — Fix collection-level Appwrite permissions
  C2 — Encrypt medicalInfo and emergencyContact
  C4 — Record parental consent at child profile creation
  H1 — Reduce JWT access token to 15 minutes

Week 2 (pre-launch):
  C3 — Data retention enforcement script
  C5 — Complete content moderation (word list, voice validation)
  H3 — Admin verification workflow for teachers/therapists
  H5 — In-app privacy policy link
  M4 — Sanitize audit log meta

Month 2 (post-launch hardening):
  H2 — Move child name out of AsyncStorage
  H4 — Remove exact dateOfBirth from schema
  M2 — Idle session timeout
  M3 — Disability profile access controls
  E2 — Multi-guardian access management
  E3 — Reframe progress language
  E4 — Right to erasure in-app button
```

---

*This review was conducted against the codebase as of May 2026. Re-audit after any significant changes to data models, authentication flows, or third-party integrations.*
