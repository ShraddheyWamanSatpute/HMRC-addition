/**
 * Centralized Encryption Key Management
 * 
 * Provides a single source of truth for encryption key retrieval
 * to avoid code duplication and ensure consistency across the codebase.
 * 
 * SECURITY: This module handles encryption key retrieval from environment variables.
 * Keys should NEVER be hardcoded or committed to version control.
 */

/**
 * Check if running in production environment
 * Exported for use in other modules that need environment-specific behavior
 * 
 * @returns true if running in production, false otherwise
 */
export function isProductionEnvironment(): boolean {
  return (
    (typeof import.meta !== 'undefined' && import.meta.env && 
     (import.meta.env.MODE === 'production' || import.meta.env.PROD === true)) ||
    (typeof process !== 'undefined' && process.env && 
     process.env.NODE_ENV === 'production')
  );
}

/**
 * Validate an encryption key meets security requirements
 * 
 * @param key - Key to validate
 * @returns Validation result with details
 */
export function validateEncryptionKey(key: string | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!key) {
    return { valid: false, error: 'No encryption key provided' };
  }
  
  if (key.length < 32) {
    return { 
      valid: false, 
      error: `Key too short: ${key.length} characters (minimum 32)` 
    };
  }
  
  // Optional: Check for weak patterns
  if (/^(.)\1+$/.test(key)) {
    return { valid: false, error: 'Key contains repeated characters only' };
  }
  
  return { valid: true };
}

// Cached key for performance (avoids repeated environment variable lookups)
let cachedKey: string | null = null;

/**
 * Clear cached encryption key
 * Useful for testing or key rotation scenarios
 */
export function clearKeyCache(): void {
  cachedKey = null;
}

/**
 * Get encryption key from environment variable
 * CRITICAL: In production, encryption will FAIL if no key is configured
 * Fallback key is ONLY allowed in development mode for testing
 * 
 * @returns Encryption key string (minimum 32 characters)
 * @throws Error in production if no valid key is configured
 */
export function getEncryptionKey(): string {
  // Return cached key if available (avoids repeated env lookups)
  if (cachedKey !== null) {
    return cachedKey;
  }
  // Try Vite environment variables first (browser/client-side)
  let envKey: string | undefined
  let keySource: string = 'unknown'
  
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_HMRC_ENCRYPTION_KEY) {
      envKey = import.meta.env.VITE_HMRC_ENCRYPTION_KEY
      keySource = 'VITE_HMRC_ENCRYPTION_KEY'
    } else if (import.meta.env.VITE_EMPLOYEE_DATA_ENCRYPTION_KEY) {
      envKey = import.meta.env.VITE_EMPLOYEE_DATA_ENCRYPTION_KEY
      keySource = 'VITE_EMPLOYEE_DATA_ENCRYPTION_KEY'
    }
  }
  
  // Fallback to Node.js environment variables (server-side/testing)
  if (!envKey && typeof process !== 'undefined' && process.env) {
    if (process.env.VITE_HMRC_ENCRYPTION_KEY) {
      envKey = process.env.VITE_HMRC_ENCRYPTION_KEY
      keySource = 'process.env.VITE_HMRC_ENCRYPTION_KEY'
    } else if (process.env.VITE_EMPLOYEE_DATA_ENCRYPTION_KEY) {
      envKey = process.env.VITE_EMPLOYEE_DATA_ENCRYPTION_KEY
      keySource = 'process.env.VITE_EMPLOYEE_DATA_ENCRYPTION_KEY'
    } else if (process.env.EMPLOYEE_DATA_ENCRYPTION_KEY) {
      envKey = process.env.EMPLOYEE_DATA_ENCRYPTION_KEY
      keySource = 'process.env.EMPLOYEE_DATA_ENCRYPTION_KEY'
    } else if (process.env.HMRC_ENCRYPTION_KEY) {
      envKey = process.env.HMRC_ENCRYPTION_KEY
      keySource = 'process.env.HMRC_ENCRYPTION_KEY'
    }
  }
  
  // Validate key if found
  const validation = validateEncryptionKey(envKey)
  if (validation.valid && envKey) {
    // Cache the valid key
    cachedKey = envKey
    
    // Debug logging (only in development)
    const isProduction = isProductionEnvironment()
    if (!isProduction) {
      console.debug(`[EncryptionKeyManager] Using key from: ${keySource}`)
    }
    
    return envKey
  }
  
  // Check if we're in production
  const isProduction = isProductionEnvironment()
  
  // In production, encryption MUST fail if no key is configured
  if (isProduction) {
    if (!envKey) {
      throw new Error(
        '[EncryptionKeyManager] CRITICAL SECURITY ERROR: No encryption key configured in production. ' +
        'Set VITE_HMRC_ENCRYPTION_KEY or VITE_EMPLOYEE_DATA_ENCRYPTION_KEY environment variable. ' +
        'Encryption cannot proceed without a valid key.'
      )
    } else {
      // Use validation error message if available
      throw new Error(
        `[EncryptionKeyManager] CRITICAL SECURITY ERROR: Invalid encryption key. ${validation.error || 'Key validation failed'}. ` +
        'Set a proper encryption key (minimum 32 characters) in production.'
      )
    }
  }
  
  // Only allow fallback key in development mode
  const fallbackKey = 'encryption-key-fallback-min-32-characters-dev-only'
  
  if (!envKey) {
    console.warn(
      '[EncryptionKeyManager] ⚠️  DEV MODE: VITE_HMRC_ENCRYPTION_KEY or VITE_EMPLOYEE_DATA_ENCRYPTION_KEY not set. ' +
      'Using fallback key (DEV ONLY - NOT SECURE). ' +
      'Set VITE_HMRC_ENCRYPTION_KEY environment variable for production use.'
    )
  } else {
    // Use validation error message if available
    console.warn(
      `[EncryptionKeyManager] ⚠️  DEV MODE: Invalid encryption key. ${validation.error || 'Key validation failed'}. ` +
      'Using fallback key (DEV ONLY - NOT SECURE). ' +
      'Please set a proper encryption key (minimum 32 characters).'
    )
  }
  
  // Cache the fallback key
  cachedKey = fallbackKey
  return fallbackKey
}

