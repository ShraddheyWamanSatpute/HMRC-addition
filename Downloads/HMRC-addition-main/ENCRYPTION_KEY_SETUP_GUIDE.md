# Encryption Key Setup Guide

**Purpose:** Configure encryption keys for HMRC and GDPR compliance  
**Date:** January 19, 2026

---

## Overview

The application uses AES-256-GCM encryption to protect sensitive data including:
- Employee National Insurance Numbers
- Bank account details
- Tax codes
- P45 data
- HMRC OAuth tokens

---

## Required Environment Variable

### Frontend (Client-Side)

**Variable Name:** `VITE_HMRC_ENCRYPTION_KEY`

**Alternative Names (also supported):**
- `VITE_EMPLOYEE_DATA_ENCRYPTION_KEY`

**Requirements:**
- Minimum 32 characters
- Strong, random key recommended
- Different keys for development and production

---

## Setup Instructions

### 1. Create `.env` File

Create a `.env` file in the project root directory:

```bash
# Copy from example (if exists) or create new
cp .env.example .env
# OR
touch .env
```

### 2. Generate Encryption Key

**Option A: Using OpenSSL (Recommended)**
```bash
openssl rand -base64 32
```

**Option B: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Option C: Using Online Generator**
- Use a secure random string generator (minimum 32 characters)
- Example: `https://www.random.org/strings/`

### 3. Add to `.env` File

```env
# HMRC & Employee Data Encryption Key
VITE_HMRC_ENCRYPTION_KEY=your-generated-key-here-minimum-32-characters
```

**Example:**
```env
VITE_HMRC_ENCRYPTION_KEY=K8mN2pQ5rT9vW3xZ6bC1dF4gH7jL0nP8sU2wY5aB8e
```

### 4. Verify Setup

The application will log a warning if the key is not set:
```
[EmployeeDataEncryption] VITE_HMRC_ENCRYPTION_KEY not set. Using fallback key.
```

**To verify:**
1. Start the development server
2. Check browser console for encryption key warnings
3. Ensure no warnings appear (or key is properly set)

---

## Production Deployment

### Vercel

1. Go to Project Settings > Environment Variables
2. Add new variable:
   - **Name:** `VITE_HMRC_ENCRYPTION_KEY`
   - **Value:** Your production encryption key
   - **Environment:** Production, Preview, Development
3. Redeploy application

### Netlify

1. Go to Site Settings > Environment Variables
2. Add new variable:
   - **Key:** `VITE_HMRC_ENCRYPTION_KEY`
   - **Value:** Your production encryption key
   - **Scopes:** All scopes
3. Redeploy site

### Firebase Hosting

1. Use Firebase Functions Secrets (recommended):
   ```bash
   firebase functions:secrets:set HMRC_ENCRYPTION_KEY
   ```

2. Or set in hosting environment (if supported):
   - Configure in Firebase Console > Hosting > Environment Variables

### Docker

Add to `docker-compose.yml`:
```yaml
environment:
  - VITE_HMRC_ENCRYPTION_KEY=${VITE_HMRC_ENCRYPTION_KEY}
```

Or in Dockerfile:
```dockerfile
ENV VITE_HMRC_ENCRYPTION_KEY=your-key-here
```

---

## Security Best Practices

### ✅ DO:
- Use different keys for development and production
- Generate keys using cryptographically secure random generators
- Store keys securely (environment variables, secrets management)
- Rotate keys periodically (every 6-12 months)
- Use minimum 32 characters (64+ recommended)

### ❌ DON'T:
- Commit `.env` file to version control
- Share keys between team members via insecure channels
- Use predictable keys (dates, names, common words)
- Reuse keys from other projects
- Store keys in client-side code

---

## Key Rotation

If you need to rotate the encryption key:

1. **Generate new key** using secure method
2. **Update environment variable** with new key
3. **Re-encrypt existing data** (if needed):
   - Old encrypted data will remain readable (backward compatibility)
   - New data will use new key
   - Consider migration script for existing data

---

## Troubleshooting

### Issue: "Encryption key not set" Warning

**Solution:**
1. Check `.env` file exists in project root
2. Verify variable name: `VITE_HMRC_ENCRYPTION_KEY`
3. Restart development server after adding variable
4. Check for typos in variable name

### Issue: "Encryption key too short" Warning

**Solution:**
1. Ensure key is at least 32 characters
2. Generate new key using secure method
3. Update `.env` file
4. Restart server

### Issue: Decryption fails for existing data

**Solution:**
1. Verify you're using the same key that was used for encryption
2. Check if key was changed recently
3. System has backward compatibility - plain text data will still work
4. If data was encrypted with different key, you may need to re-encrypt

---

## Verification

After setup, verify encryption is working:

1. **Check Console Logs:**
   - No warnings about missing encryption key
   - No errors during encryption/decryption

2. **Test Employee Data:**
   - Create new employee with NI number
   - Check database - NI number should be encrypted (base64 string)
   - View employee - NI number should decrypt correctly

3. **Test HMRC Tokens:**
   - Complete HMRC OAuth flow
   - Check database - tokens should be encrypted
   - Verify tokens work for API calls

---

## Files Using Encryption Key

- `src/backend/utils/EmployeeDataEncryption.ts` - Employee data encryption
- `src/backend/functions/HMRCSettings.tsx` - HMRC token encryption
- `src/backend/services/oauth/SecureTokenStorage.ts` - OAuth token encryption

---

## Support

If you encounter issues:
1. Check console logs for specific error messages
2. Verify environment variable is set correctly
3. Ensure key meets minimum length requirement
4. Check that `.env` file is in project root
5. Restart development server after changes

---

**Last Updated:** January 19, 2026  
**Status:** ✅ Ready for Production

