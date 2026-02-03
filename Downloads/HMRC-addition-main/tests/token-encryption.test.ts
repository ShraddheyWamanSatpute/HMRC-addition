/**
 * Token Encryption Test Suite
 * Tests OAuth token encryption/decryption implementation
 * 
 * Run with: npx tsx tests/token-encryption.test.ts
 */

import { EncryptionService } from '../src/backend/utils/EncryptionService'

// Mock the encryption key function behavior
const ENCRYPTION_KEY = 'test-encryption-key-minimum-32-characters-long'

/**
 * Get encryption key (mimics the function in HMRCSettings.tsx)
 * Note: In browser, this would use import.meta.env, but in Node.js test, we use process.env
 */
function getEncryptionKey(): string {
  // For testing, use a consistent key
  // In actual implementation, this comes from import.meta.env.VITE_HMRC_ENCRYPTION_KEY
  const envKey = process.env.VITE_HMRC_ENCRYPTION_KEY || ENCRYPTION_KEY
  if (envKey && envKey.length >= 32) {
    return envKey
  }
  return ENCRYPTION_KEY
}

/**
 * Check if a string appears to be encrypted (mimics isEncrypted function)
 */
function isEncrypted(value: string): boolean {
  if (!value || value.length < 20) {
    return false
  }
  
  // Check if it's valid base64 first
  const base64Regex = /^[A-Za-z0-9+/=]+$/
  if (!base64Regex.test(value)) {
    return false
  }
  
  // Encrypted tokens are typically > 60 chars (IV + ciphertext)
  if (value.length > 60) {
    return true
  }
  
  return false
}

/**
 * Encrypt a token (mimics encryptToken function)
 */
async function encryptToken(token: string): Promise<string> {
  if (!token) {
    return token
  }
  
  try {
    const encryptionService = new EncryptionService()
    const encryptionKey = getEncryptionKey()
    return await encryptionService.encrypt(token, encryptionKey)
  } catch (error) {
    console.error('[Test] Error encrypting token:', error)
    throw error
  }
}

/**
 * Decrypt a token (mimics decryptToken function)
 */
async function decryptToken(encryptedToken: string): Promise<string> {
  if (!encryptedToken) {
    return encryptedToken
  }
  
  // Check if token appears to be base64 (encrypted tokens are base64)
  const base64Regex = /^[A-Za-z0-9+/=]+$/
  const looksLikeBase64 = base64Regex.test(encryptedToken) && encryptedToken.length >= 16
  
  // Try to decrypt if it looks encrypted OR if it's long enough to be encrypted
  // This handles backward compatibility - if decryption fails, return as-is
  if (isEncrypted(encryptedToken) || (looksLikeBase64 && encryptedToken.length >= 40)) {
    try {
      const encryptionService = new EncryptionService()
      const encryptionKey = getEncryptionKey()
      return await encryptionService.decrypt(encryptedToken, encryptionKey)
    } catch (error) {
      // If decryption fails, assume it's plain text (backward compatibility)
      console.warn('[Test] Failed to decrypt token, assuming plain text:', error instanceof Error ? error.message : 'Unknown error')
      return encryptedToken
    }
  }
  
  // Token doesn't look encrypted, return as-is (backward compatibility)
  return encryptedToken
}

/**
 * Test runner
 */
async function runTest(testName: string, testFn: () => Promise<void> | void): Promise<boolean> {
  try {
    await testFn()
    console.log(`✅ PASS: ${testName}`)
    return true
  } catch (error) {
    console.error(`❌ FAIL: ${testName}`)
    console.error('   Error:', error instanceof Error ? error.message : error)
    return false
  }
}

/**
 * Main test suite
 */
async function runAllTests() {
  console.log('='.repeat(60))
  console.log('Token Encryption Test Suite')
  console.log('='.repeat(60))
  console.log()

  let passed = 0
  let failed = 0

  // Test 1: Encrypt token
  const test1 = await runTest('Encrypt OAuth token', async () => {
    const originalToken = 'test_access_token_abc123xyz789'
    const encrypted = await encryptToken(originalToken)
    
    if (!encrypted || encrypted === originalToken) {
      throw new Error('Token was not encrypted')
    }
    
    if (encrypted.length <= originalToken.length) {
      throw new Error('Encrypted token should be longer than original')
    }
    
    // Debug: Check encrypted token length
    console.log(`   Original length: ${originalToken.length}`)
    console.log(`   Encrypted length: ${encrypted.length}`)
    console.log(`   Is encrypted detected: ${isEncrypted(encrypted)}`)
    
    // The isEncrypted check might fail if threshold is too high
    // Let's verify encryption works even if detection fails
    const decrypted = await decryptToken(encrypted)
    if (decrypted !== originalToken) {
      throw new Error(`Decryption failed. Expected: ${originalToken}, Got: ${decrypted}`)
    }
    
    console.log(`   Original: ${originalToken.substring(0, 20)}...`)
    console.log(`   Encrypted: ${encrypted.substring(0, 30)}...`)
  })
  passed += test1 ? 1 : 0
  failed += test1 ? 0 : 1

  // Test 2: Decrypt token
  const test2 = await runTest('Decrypt OAuth token', async () => {
    const originalToken = 'test_refresh_token_xyz789abc123'
    const encrypted = await encryptToken(originalToken)
    const decrypted = await decryptToken(encrypted)
    
    if (decrypted !== originalToken) {
      throw new Error(`Decryption failed. Expected: ${originalToken}, Got: ${decrypted}`)
    }
    
    console.log(`   Original: ${originalToken.substring(0, 20)}...`)
    console.log(`   Decrypted: ${decrypted.substring(0, 20)}...`)
  })
  passed += test2 ? 1 : 0
  failed += test2 ? 0 : 1

  // Test 3: Backward compatibility - plain text token
  const test3 = await runTest('Backward compatibility - plain text token', async () => {
    const plainTextToken = 'short_token_123'
    const result = await decryptToken(plainTextToken)
    
    if (result !== plainTextToken) {
      throw new Error(`Plain text token should remain unchanged. Expected: ${plainTextToken}, Got: ${result}`)
    }
    
    if (isEncrypted(plainTextToken)) {
      throw new Error('Plain text token should not be detected as encrypted')
    }
    
    console.log(`   Plain text token correctly handled: ${plainTextToken}`)
  })
  passed += test3 ? 1 : 0
  failed += test3 ? 0 : 1

  // Test 4: Encrypt empty token
  const test4 = await runTest('Handle empty token', async () => {
    const emptyToken = ''
    const encrypted = await encryptToken(emptyToken)
    const decrypted = await decryptToken(encrypted)
    
    if (encrypted !== emptyToken || decrypted !== emptyToken) {
      throw new Error('Empty token should remain empty')
    }
    
    console.log(`   Empty token correctly handled`)
  })
  passed += test4 ? 1 : 0
  failed += test4 ? 0 : 1

  // Test 5: Encrypt/decrypt multiple tokens
  const test5 = await runTest('Encrypt/decrypt multiple tokens', async () => {
    const tokens = [
      'access_token_1_abc123',
      'refresh_token_1_xyz789',
      'access_token_2_def456',
      'refresh_token_2_uvw012'
    ]
    
    for (const token of tokens) {
      const encrypted = await encryptToken(token)
      const decrypted = await decryptToken(encrypted)
      
      if (decrypted !== token) {
        throw new Error(`Token mismatch for ${token}: expected ${token}, got ${decrypted}`)
      }
    }
    
    console.log(`   Successfully encrypted/decrypted ${tokens.length} tokens`)
  })
  passed += test5 ? 1 : 0
  failed += test5 ? 0 : 1

  // Test 6: Different tokens produce different encrypted values
  const test6 = await runTest('Different tokens produce different encrypted values', async () => {
    const token1 = 'token_one_123'
    const token2 = 'token_two_456'
    
    const encrypted1 = await encryptToken(token1)
    const encrypted2 = await encryptToken(token2)
    
    if (encrypted1 === encrypted2) {
      throw new Error('Different tokens should produce different encrypted values')
    }
    
    // Verify both can be decrypted correctly
    const decrypted1 = await decryptToken(encrypted1)
    const decrypted2 = await decryptToken(encrypted2)
    
    // Debug if decryption fails
    if (decrypted1 !== token1) {
      console.log(`   Debug: token1 decryption failed. Expected: ${token1}, Got: ${decrypted1}`)
      throw new Error(`Decryption failed for token1: expected "${token1}", got "${decrypted1}"`)
    }
    
    if (decrypted2 !== token2) {
      console.log(`   Debug: token2 decryption failed. Expected: ${token2}, Got: ${decrypted2}`)
      throw new Error(`Decryption failed for token2: expected "${token2}", got "${decrypted2}"`)
    }
    
    console.log(`   Different tokens produce unique encrypted values`)
  })
  passed += test6 ? 1 : 0
  failed += test6 ? 0 : 1

  // Test 7: Real OAuth token format
  const test7 = await runTest('Encrypt real OAuth token format', async () => {
    // Simulate real OAuth tokens
    const accessToken = 'ya29.a0AfB_byA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6'
    const refreshToken = '1//0A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6'
    
    const encryptedAccess = await encryptToken(accessToken)
    const encryptedRefresh = await encryptToken(refreshToken)
    
    const decryptedAccess = await decryptToken(encryptedAccess)
    const decryptedRefresh = await decryptToken(encryptedRefresh)
    
    if (decryptedAccess !== accessToken || decryptedRefresh !== refreshToken) {
      throw new Error('Real OAuth token format encryption/decryption failed')
    }
    
    console.log(`   Access token encrypted/decrypted successfully`)
    console.log(`   Refresh token encrypted/decrypted successfully`)
  })
  passed += test7 ? 1 : 0
  failed += test7 ? 0 : 1

  // Test 8: isEncrypted detection
  const test8 = await runTest('isEncrypted detection', async () => {
    const plainText = 'short_token'
    const encrypted = await encryptToken('test_token_for_encryption_check')
    
    if (isEncrypted(plainText)) {
      throw new Error('Plain text token should not be detected as encrypted')
    }
    
    if (!isEncrypted(encrypted)) {
      throw new Error('Encrypted token should be detected as encrypted')
    }
    
    console.log(`   Plain text correctly identified as not encrypted`)
    console.log(`   Encrypted token correctly identified as encrypted`)
  })
  passed += test8 ? 1 : 0
  failed += test8 ? 0 : 1

  // Test 9: Error handling - invalid encrypted token
  const test9 = await runTest('Error handling - invalid encrypted token', async () => {
    // Try to decrypt an invalid base64 string that looks encrypted
    const invalidEncrypted = 'A'.repeat(250) // Long base64-like string
    const result = await decryptToken(invalidEncrypted)
    
    // Should return the original (backward compatibility) or throw error
    // The implementation should handle this gracefully
    if (!result) {
      throw new Error('Decrypt should return something even if decryption fails')
    }
    
    console.log(`   Invalid encrypted token handled gracefully (backward compatibility)`)
  })
  passed += test9 ? 1 : 0
  failed += test9 ? 0 : 1

  // Summary
  console.log()
  console.log('='.repeat(60))
  console.log('Test Results Summary')
  console.log('='.repeat(60))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`Total: ${passed + failed}`)
  console.log('='.repeat(60))

  if (failed === 0) {
    console.log()
    console.log('🎉 All tests passed! Token encryption is working correctly.')
    console.log()
    return true
  } else {
    console.log()
    console.log('⚠️  Some tests failed. Please review the errors above.')
    console.log()
    return false
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1)
    })
    .catch((error) => {
      console.error('Fatal error running tests:', error)
      process.exit(1)
    })
}

export { runAllTests }

