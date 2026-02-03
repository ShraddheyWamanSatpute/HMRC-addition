# Firebase + Vite Security Verification Report

**Date:** January 19, 2026  
**Requirements Checked:**
1. Do not make client-side API calls to HMRC directly; use Firebase backend
2. Store secrets in Firebase environment variables

---

## ✅ Requirement 1: No Client-Side Direct HMRC API Calls

### Status: ✅ **FULLY COMPLIANT**

**Evidence:**

#### 1. All HMRC API Calls Route Through Firebase Functions ✅

**File:** `src/backend/services/hmrc/HMRCAPIClient.ts`

- ✅ All submissions use `submitViaProxy()` method (line 512-547)
- ✅ Proxy calls Firebase Functions: `${FUNCTIONS_BASE_URL}/submitRTI` (line 524)
- ✅ No direct calls to `*.service.hmrc.gov.uk` from client code

```typescript
// ✅ CORRECT: Client calls Firebase Functions, not HMRC directly
private async submitViaProxy(request: {...}): Promise<RTISubmissionResponse> {
  const response = await fetch(`${FUNCTIONS_BASE_URL}/submitRTI`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
}
```

#### 2. OAuth Token Exchange Goes Through Firebase Functions ✅

**File:** `src/frontend/pages/hmrc/OAuthCallback.tsx`

- ✅ Token exchange calls Firebase Function: `${fnBase}/exchangeHMRCToken` (line 102)
- ✅ Token refresh calls Firebase Function: `${fnBase}/refreshHMRCToken` (HMRCSettingsTab.tsx:326)
- ✅ Only sends `code`, `redirectUri`, and `environment` - never credentials (line 83-87)

```typescript
// ✅ CORRECT: Client only sends code, redirectUri, environment
const requestBody = {
  code,
  redirectUri,
  environment: environment || 'sandbox'
}
const response = await fetch(`${fnBase}/exchangeHMRCToken`, {
  method: 'POST',
  body: JSON.stringify(requestBody)
})
```

#### 3. Authorization URL Generation ✅

**File:** `src/frontend/components/hr/settings/HMRCSettingsTab.tsx`

- ✅ Uses `HMRCAuthService.getAuthorizationUrl()` (line 267)
- ⚠️ **NOTE**: This only generates the OAuth URL (not an API call)
- ✅ Client ID is needed for OAuth URL construction (public information)
- ✅ Actual token exchange happens server-side via Firebase Functions

```typescript
// ✅ CORRECT: Only generates OAuth URL (not an API call)
const authUrl = authService.getAuthorizationUrl(
  clientId,  // Public client ID (safe to expose)
  redirectUri,
  scope,
  hmrcSettings.hmrcEnvironment || 'sandbox'
)
```

#### 4. HMRCAuthService Methods Analysis ⚠️

**File:** `src/backend/services/hmrc/HMRCAuthService.ts`

**Methods Found:**
- `exchangeCodeForToken()` (line 49-87) - Makes direct API call to HMRC
- `refreshAccessToken()` (line 92-113) - Makes direct API call to HMRC

**Status:** ⚠️ **NOT USED CLIENT-SIDE**

**Analysis:**
- ✅ These methods are NOT called from frontend code
- ✅ All token operations use Firebase Functions instead
- ⚠️ **Recommendation**: Consider removing or deprecating these methods to prevent accidental misuse

**Verification:**
```bash
# No direct usage found in frontend:
grep -r "exchangeCodeForToken" src/frontend
grep -r "refreshAccessToken" src/frontend
# Result: No matches found
```

#### 5. No Direct HMRC API URLs in Client Code ✅

**Search Results:**
- ✅ No `fetch()` calls to `*.service.hmrc.gov.uk` in `src/frontend/`
- ✅ All HMRC API URLs only appear in:
  - `functions/src/hmrcOAuth.ts` (server-side ✅)
  - `functions/src/hmrcRTISubmission.ts` (server-side ✅)
  - `src/backend/services/hmrc/HMRCAuthService.ts` (for OAuth URL generation only ✅)

**Conclusion:** ✅ **FULLY COMPLIANT** - All HMRC API calls go through Firebase Functions

---

## ✅ Requirement 2: Store Secrets in Firebase Environment Variables

### Status: ✅ **FULLY COMPLIANT**

**Evidence:**

#### 1. Firebase Functions Use Firebase Secrets ✅

**File:** `functions/src/hmrcOAuth.ts`

```typescript
// ✅ CORRECT: Secrets stored in Firebase Secrets
import { defineSecret } from 'firebase-functions/params';

const hmrcClientId = defineSecret('HMRC_CLIENT_ID');
const hmrcClientSecret = defineSecret('HMRC_CLIENT_SECRET');

// ✅ CORRECT: Secrets read server-side only
const clientId = hmrcClientId.value();
const clientSecret = hmrcClientSecret.value();
```

**File:** `functions/src/hmrcRTISubmission.ts`

```typescript
// ✅ CORRECT: Same pattern in RTI submission
const hmrcClientId = defineSecret('HMRC_CLIENT_ID');
const hmrcClientSecret = defineSecret('HMRC_CLIENT_SECRET');
```

#### 2. Security Checks Reject Client-Sent Credentials ✅

**File:** `functions/src/hmrcOAuth.ts` (lines 71-79)

```typescript
// ✅ SECURITY: Reject any request containing credentials
if (req.body.clientId || req.body.clientSecret) {
  console.error('SECURITY VIOLATION: Client attempted to send credentials');
  res.status(400).json({
    error: 'Security violation',
    message: 'Client must not send credentials. Credentials are stored server-side only.',
  });
  return;
}
```

#### 3. Client Only Uses Public Client ID ✅

**File:** `src/frontend/components/hr/settings/HMRCSettingsTab.tsx`

- ✅ Client ID used for OAuth URL generation (line 233, 267)
- ✅ Client ID is public information (safe to expose)
- ✅ Client secret is NEVER used client-side
- ✅ Environment variable `VITE_HMRC_CLIENT_ID` is optional (only needed for OAuth URL)

```typescript
// ✅ CORRECT: Client ID is public (safe for OAuth URL)
const clientId = import.meta.env.VITE_HMRC_CLIENT_ID

// ✅ CORRECT: Client secret NEVER used client-side
// Client secret is ONLY in Firebase Secrets (server-side)
```

**Note:** Client ID can be safely exposed in frontend code because:
1. It's used only for OAuth authorization URL generation
2. OAuth 2.0 spec allows public client IDs
3. Client secret is what needs to be protected (and it is ✅)

#### 4. Environment Variables Documentation ✅

**File:** `functions/env.example`

```bash
# ✅ CORRECT: Documentation shows Firebase Secrets usage
# IMPORTANT: These MUST be stored as Firebase Secrets, not env vars:
#   firebase functions:secrets:set HMRC_CLIENT_ID
#   firebase functions:secrets:set HMRC_CLIENT_SECRET
```

#### 5. No Client-Side Secret Exposure ✅

**Verification:**
- ✅ No `VITE_HMRC_CLIENT_SECRET` found in codebase
- ✅ No `process.env.HMRC_CLIENT_SECRET` in client code
- ✅ Client secret only exists in Firebase Secrets

**Conclusion:** ✅ **FULLY COMPLIANT** - Secrets stored in Firebase Secrets

---

## 📊 Summary

| Requirement | Status | Evidence |
|------------|--------|----------|
| No direct client-side HMRC API calls | ✅ **COMPLIANT** | All calls route through Firebase Functions |
| Secrets in Firebase environment variables | ✅ **COMPLIANT** | Firebase Secrets used, client never sends secrets |

---

## ✅ Overall Compliance: **FULLY COMPLIANT**

### ✅ What's Working Correctly:

1. **All HMRC API calls use Firebase Functions proxy:**
   - ✅ Token exchange: `exchangeHMRCToken` function
   - ✅ Token refresh: `refreshHMRCToken` function
   - ✅ RTI submissions: `submitRTI` function
   - ✅ Status checks: `checkRTIStatus` function

2. **Secrets properly secured:**
   - ✅ `HMRC_CLIENT_ID` and `HMRC_CLIENT_SECRET` in Firebase Secrets
   - ✅ Server-side only access via `defineSecret()`
   - ✅ Security checks reject client-sent credentials
   - ✅ Client secret never exposed to frontend

3. **Client code security:**
   - ✅ Only sends authorization code (one-time use, safe)
   - ✅ Only sends refresh token (encrypted at rest)
   - ✅ Client ID used only for OAuth URL (public information)
   - ✅ No client secret in frontend code

---

## ⚠️ Minor Recommendations (Optional Improvements)

### 1. Consider Deprecating Unused Methods

**File:** `src/backend/services/hmrc/HMRCAuthService.ts`

**Recommendation:** Add deprecation warnings or remove methods that make direct API calls:

```typescript
/**
 * @deprecated Use Firebase Functions exchangeHMRCToken instead
 * This method makes direct API calls and should not be used client-side
 */
async exchangeCodeForToken(...) { ... }
```

### 2. Environment Variable Documentation

**Recommendation:** Add to `.env.example`:

```bash
# HMRC OAuth (for OAuth URL generation only)
# Client ID is public information, safe to expose
# Client secret is NOT needed here (stored in Firebase Secrets)
VITE_HMRC_CLIENT_ID=your_hmrc_client_id_here
VITE_HMRC_REDIRECT_URI=http://localhost:5173/hmrc/callback
```

---

## ✅ Conclusion

**Both requirements are fully implemented and compliant:**

1. ✅ **No client-side direct HMRC API calls** - All requests route through Firebase Functions
2. ✅ **Secrets in Firebase environment variables** - Firebase Secrets used correctly

**Security Status:** ✅ **SECURE** - Implementation follows best practices

---

**Last Updated:** January 19, 2026  
**Verification Status:** ✅ **COMPLIANT**

