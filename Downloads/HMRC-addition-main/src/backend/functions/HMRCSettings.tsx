/**
 * HMRC Settings Database Functions
 * Functions to fetch and update HMRC settings per company/site/subsite
 * Supports hierarchy: subsite → site → company
 * 
 * SECURITY: OAuth tokens are encrypted at rest using AES-256-GCM encryption
 * to comply with HMRC GDPR requirements.
 */

import { ref, get, set, update } from 'firebase/database'
import { db } from '../services/Firebase'
import { HMRCSettings } from '../interfaces/Company'
import { EncryptionService } from '../utils/EncryptionService'
import { getEncryptionKey } from '../utils/EncryptionKeyManager'

/**
 * Get the path for HMRC settings at a specific level
 */
function getHMRCSettingsPath(
  companyId: string,
  siteId: string | null,
  subsiteId: string | null,
  level: "company" | "site" | "subsite"
): string {
  if (level === "subsite" && subsiteId && siteId) {
    return `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/data/company/hmrcSettings`
  } else if (level === "site" && siteId) {
    return `companies/${companyId}/sites/${siteId}/data/company/hmrcSettings`
  } else {
    return `companies/${companyId}/data/company/hmrcSettings`
  }
}

// Encryption key is now imported from centralized EncryptionKeyManager

/**
 * Encryption prefix marker to clearly identify encrypted values
 */
const ENCRYPTED_PREFIX = 'ENC:'

/**
 * Check if a string is encrypted
 * Uses prefix marker for reliable detection
 * Also checks for legacy encrypted data (without prefix) for backward compatibility
 */
function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }
  
  // New format: Check for encryption prefix
  if (value.startsWith(ENCRYPTED_PREFIX)) {
    return true
  }
  
  // Legacy format: Check if it appears to be base64-encoded encrypted data
  // This maintains backward compatibility with existing encrypted tokens
  if (value.length > 60) {
    const base64Regex = /^[A-Za-z0-9+/=]+$/
    if (base64Regex.test(value)) {
      // Likely legacy encrypted data (base64, long enough to be encrypted)
      return true
    }
  }
  
  return false
}

/**
 * Encrypt a token if encryption is enabled
 * Adds prefix marker to clearly identify encrypted values
 */
async function encryptToken(token: string): Promise<string> {
  if (!token) {
    return token
  }
  
  // Skip if already encrypted (with prefix)
  if (token.startsWith(ENCRYPTED_PREFIX)) {
    return token
  }
  
  try {
    const encryptionService = new EncryptionService()
    const encryptionKey = getEncryptionKey()
    const encrypted = await encryptionService.encrypt(token, encryptionKey)
    // Add prefix marker to identify encrypted values
    return `${ENCRYPTED_PREFIX}${encrypted}`
  } catch (error) {
    console.error('[HMRCSettings] Error encrypting token:', error)
    // If encryption fails, return original token (shouldn't happen, but fail gracefully)
    return token
  }
}

/**
 * Decrypt a token if it's encrypted, otherwise return as-is (backward compatibility)
 */
async function decryptToken(encryptedToken: string | undefined): Promise<string | undefined> {
  if (!encryptedToken) {
    return encryptedToken
  }
  
  // Legacy format: Try to decrypt if it looks encrypted (backward compatibility)
  if (isEncrypted(encryptedToken)) {
    try {
      const encryptionService = new EncryptionService()
      const encryptionKey = getEncryptionKey()
      const decrypted = await encryptionService.decrypt(encryptedToken, encryptionKey)
      return decrypted
    } catch (error) {
      // If decryption fails, it might be:
      // 1. Plain text token (backward compatibility)
      // 2. Wrong encryption key
      // 3. Invalid encrypted format
      // For backward compatibility, return as-is if decryption fails
      console.warn(
        '[HMRCSettings] Failed to decrypt legacy format, assuming plain text (backward compatibility):',
        error instanceof Error ? error.message : 'Unknown error'
      )
      return encryptedToken
    }
  }
  
  // Doesn't appear to be encrypted, return as-is (plain text token)
  return encryptedToken
}

/**
 * Fetch HMRC settings with hierarchy fallback (subsite → site → company)
 * Returns the first found settings and indicates where they were found
 */
export async function fetchHMRCSettings(
  companyId: string,
  siteId: string | null,
  subsiteId?: string | null
): Promise<{ settings: HMRCSettings | null; foundAt: "subsite" | "site" | "company" | null }> {
  try {
    // Check hierarchy: subsite → site → company
    const paths: Array<{ path: string; level: "subsite" | "site" | "company" }> = []
    
    // 1. Check subsite level (if subsiteId provided)
    if (subsiteId && siteId) {
      paths.push({
        path: getHMRCSettingsPath(companyId, siteId, subsiteId, "subsite"),
        level: "subsite"
      })
    }
    
    // 2. Check site level (if siteId provided)
    if (siteId) {
      paths.push({
        path: getHMRCSettingsPath(companyId, siteId, null, "site"),
        level: "site"
      })
    }
    
    // 3. Check company level
    paths.push({
      path: getHMRCSettingsPath(companyId, null, null, "company"),
      level: "company"
    })
    
    // Try each path in order
    for (const { path, level } of paths) {
      const settingsRef = ref(db, path)
      const snapshot = await get(settingsRef)
      
      if (snapshot.exists()) {
        const settings = snapshot.val() as HMRCSettings
        // Ensure the foundAt field is set
        if (!settings.configuredAt) {
          settings.configuredAt = level
        }
        
        // Decrypt tokens if they are encrypted (backward compatible with plain text)
        if (settings.hmrcAccessToken) {
          try {
            const decrypted = await decryptToken(settings.hmrcAccessToken)
            if (decrypted) {
              settings.hmrcAccessToken = decrypted
            } else {
              console.warn('[HMRCSettings] Failed to decrypt access token, using as-is (may be plain text)')
            }
          } catch (error) {
            console.error('[HMRCSettings] Error decrypting access token:', error)
            // If decryption fails, assume it's plain text (backward compatibility)
            // Don't throw - allow caller to use the token as-is
          }
        }
        if (settings.hmrcRefreshToken) {
          try {
            const decrypted = await decryptToken(settings.hmrcRefreshToken)
            if (decrypted) {
              settings.hmrcRefreshToken = decrypted
            } else {
              console.warn('[HMRCSettings] Failed to decrypt refresh token, using as-is (may be plain text)')
            }
          } catch (error) {
            console.error('[HMRCSettings] Error decrypting refresh token:', error)
            // If decryption fails, assume it's plain text (backward compatibility)
            // Don't throw - allow caller to use the token as-is
          }
        }
        
        return { settings, foundAt: level }
      }
    }
    
    return { settings: null, foundAt: null }
  } catch (error) {
    console.error('Error fetching HMRC settings:', error)
    throw error
  }
}

/**
 * Create or update HMRC settings at specified level
 * Note: If tokens are included in settings, they will be encrypted before storing
 */
export async function saveHMRCSettings(
  companyId: string,
  siteId: string | null,
  subsiteId: string | null,
  level: "company" | "site" | "subsite",
  settings: Partial<HMRCSettings>
): Promise<void> {
  try {
    const path = getHMRCSettingsPath(companyId, siteId, subsiteId, level)
    const settingsRef = ref(db, path)
    const existing = await get(settingsRef)
    
    // Encrypt tokens if they are provided in settings
    const updatedSettings: Partial<HMRCSettings> = {
      ...settings,
      level,
      configuredAt: level,
      updatedAt: Date.now()
    }
    
    // Encrypt tokens if they are being updated
    if (updatedSettings.hmrcAccessToken && typeof updatedSettings.hmrcAccessToken === 'string') {
      // Only encrypt if it's not already encrypted (avoid double encryption)
      if (!isEncrypted(updatedSettings.hmrcAccessToken)) {
        updatedSettings.hmrcAccessToken = await encryptToken(updatedSettings.hmrcAccessToken)
      }
    }
    
    if (updatedSettings.hmrcRefreshToken && typeof updatedSettings.hmrcRefreshToken === 'string') {
      // Only encrypt if it's not already encrypted (avoid double encryption)
      if (!isEncrypted(updatedSettings.hmrcRefreshToken)) {
        updatedSettings.hmrcRefreshToken = await encryptToken(updatedSettings.hmrcRefreshToken)
      }
    }
    
    if (existing.exists()) {
      await update(settingsRef, updatedSettings)
    } else {
      await set(settingsRef, {
        ...updatedSettings,
        createdAt: Date.now()
      })
    }
  } catch (error) {
    console.error('Error saving HMRC settings:', error)
    throw error
  }
}

/**
 * Update OAuth tokens after authorization
 * Uses hierarchy to find where settings are stored
 */
export async function updateHMRCTokens(
  companyId: string,
  siteId: string | null,
  subsiteId: string | null,
  tokens: {
    accessToken: string
    refreshToken: string
    expiresIn: number
  }
): Promise<void> {
  try {
    // Find where settings are stored
    const { settings, foundAt } = await fetchHMRCSettings(companyId, siteId, subsiteId)
    
    if (!settings || !foundAt) {
      throw new Error('HMRC settings not found. Please configure HMRC settings first.')
    }
    
    // Update tokens at the same level where settings are stored
    const path = getHMRCSettingsPath(companyId, siteId, subsiteId, foundAt)
    const settingsRef = ref(db, path)
    
    const expiryTime = Date.now() + (tokens.expiresIn * 1000)
    
    // Encrypt tokens before storing (compliance with HMRC GDPR requirements)
    const encryptedAccessToken = await encryptToken(tokens.accessToken)
    const encryptedRefreshToken = await encryptToken(tokens.refreshToken)
    
    await update(settingsRef, {
      hmrcAccessToken: encryptedAccessToken,
      hmrcRefreshToken: encryptedRefreshToken,
      hmrcTokenExpiry: expiryTime,
      lastHMRCAuthDate: Date.now(),
      updatedAt: Date.now()
    })
    
    console.log('[HMRCSettings] Tokens encrypted and stored successfully')
  } catch (error) {
    console.error('Error updating HMRC tokens:', error)
    throw error
  }
}

