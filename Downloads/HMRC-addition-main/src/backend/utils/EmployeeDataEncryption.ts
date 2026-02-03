/**
 * Employee Data Encryption Utilities
 * 
 * Encrypts sensitive employee data before storing in Firebase
 * and decrypts it when reading, to comply with HMRC GDPR requirements.
 * 
 * Sensitive Fields Encrypted:
 * - nationalInsuranceNumber
 * - bankDetails.accountNumber
 * - bankDetails.routingNumber
 * - taxCode
 * - salary
 * - p45Data (all fields)
 * 
 * Security Features:
 * - AES-256-GCM encryption
 * - Backward compatibility with plain text data
 * - Automatic detection of encrypted vs plain text
 */

import { EncryptionService } from './EncryptionService'
import { getEncryptionKey as getKey } from './EncryptionKeyManager'
import type { Employee } from '../interfaces/HRs'

/**
 * Encryption prefix marker to clearly identify encrypted values
 * This prevents false positives from base64-encoded plain text
 */
const ENCRYPTED_PREFIX = 'ENC:'

/**
 * Branded type for encrypted strings to provide compile-time type safety
 * This helps prevent accidentally using encrypted strings as plain text
 */
export type EncryptedString = string & { readonly __encrypted: unique symbol }

/**
 * Get encryption key from environment variable
 * Internal function - use encryptField/decryptField instead
 * @internal
 */
function getEncryptionKey(): string {
  // Use centralized key manager
  return getKey()
}

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
  // This maintains backward compatibility with existing encrypted data
  if (value.length >= 60) {
    const base64Regex = /^[A-Za-z0-9+/=]+$/
    if (base64Regex.test(value)) {
      // Likely legacy encrypted data (base64, long enough to be encrypted)
      return true
    }
  }
  
  return false
}

/**
 * Encrypt a sensitive field value
 * Adds prefix marker to clearly identify encrypted values
 * Returns EncryptedString type for compile-time safety
 */
async function encryptField(value: string | undefined | null): Promise<EncryptedString | undefined> {
  if (!value || typeof value !== 'string') {
    return value as EncryptedString | undefined
  }
  
  // Skip if already encrypted (with prefix)
  if (value.startsWith(ENCRYPTED_PREFIX)) {
    return value as EncryptedString
  }
  
  try {
    const encryptionService = new EncryptionService()
    const encryptionKey = getEncryptionKey()
    const encrypted = await encryptionService.encrypt(value, encryptionKey)
    // Add prefix marker to identify encrypted values
    return `${ENCRYPTED_PREFIX}${encrypted}` as EncryptedString
  } catch (error) {
    console.error('[EmployeeDataEncryption] Error encrypting field:', error)
    // If encryption fails, return original value (shouldn't happen, but fail gracefully)
    return value as EncryptedString
  }
}

/**
 * Decrypt a sensitive field value (with backward compatibility)
 * Handles both new format (with ENC: prefix) and legacy format (without prefix)
 * Accepts both EncryptedString and plain string for flexibility
 */
async function decryptField(encryptedValue: string | EncryptedString | undefined | null): Promise<string | undefined> {
  if (!encryptedValue || typeof encryptedValue !== 'string') {
    return encryptedValue as string | undefined
  }
  
  // New format: Check for encryption prefix
  if (encryptedValue.startsWith(ENCRYPTED_PREFIX)) {
    try {
      const encryptionService = new EncryptionService()
      const encryptionKey = getEncryptionKey()
      // Remove prefix before decrypting
      const ciphertext = encryptedValue.substring(ENCRYPTED_PREFIX.length)
      const decrypted = await encryptionService.decrypt(ciphertext, encryptionKey)
      return decrypted
    } catch (error) {
      // If decryption fails, log error but return original (shouldn't happen)
      console.error(
        '[EmployeeDataEncryption] Failed to decrypt prefixed value:',
        error instanceof Error ? error.message : 'Unknown error'
      )
      return encryptedValue
    }
  }
  
  // Legacy format: Try to decrypt if it looks encrypted (backward compatibility)
  if (isEncrypted(encryptedValue)) {
    try {
      const encryptionService = new EncryptionService()
      const encryptionKey = getEncryptionKey()
      const decrypted = await encryptionService.decrypt(encryptedValue, encryptionKey)
      return decrypted
    } catch (error) {
      // If decryption fails, assume it's plain text (backward compatibility)
      console.warn(
        '[EmployeeDataEncryption] Failed to decrypt legacy format, assuming plain text (backward compatibility):',
        error instanceof Error ? error.message : 'Unknown error'
      )
      return encryptedValue
    }
  }
  
  // Doesn't appear to be encrypted, return as-is (plain text)
  return encryptedValue
}

/**
 * Encrypt sensitive employee data fields before storing
 */
export async function encryptEmployeeData(employee: Partial<Employee> | Employee): Promise<Partial<Employee> | Employee> {
  const encrypted: Partial<Employee> = { ...employee }
  
  // Encrypt National Insurance Number
  if (encrypted.nationalInsuranceNumber) {
    encrypted.nationalInsuranceNumber = await encryptField(encrypted.nationalInsuranceNumber)
  }
  
  // Encrypt Bank Details
  if (encrypted.bankDetails) {
    const encryptedBankDetails = { ...encrypted.bankDetails }
    
    if (encryptedBankDetails.accountNumber) {
      encryptedBankDetails.accountNumber = await encryptField(encryptedBankDetails.accountNumber) || encryptedBankDetails.accountNumber
    }
    
    if (encryptedBankDetails.routingNumber) {
      encryptedBankDetails.routingNumber = await encryptField(encryptedBankDetails.routingNumber) || encryptedBankDetails.routingNumber
    }
    
    encrypted.bankDetails = encryptedBankDetails
  }
  
  // Encrypt Tax Code
  if (encrypted.taxCode) {
    encrypted.taxCode = await encryptField(encrypted.taxCode)
  }
  
  // Encrypt Salary (highly sensitive financial data)
  if (encrypted.salary !== undefined && encrypted.salary !== null) {
    const encryptedSalary = await encryptField(String(encrypted.salary))
    if (encryptedSalary) {
      // Store encrypted salary as string (will need to decrypt and parse when reading)
      (encrypted as any).salaryEncrypted = encryptedSalary
      // Remove original for security (encrypted version stored)
      delete encrypted.salary
    }
  }
  
  // Encrypt P45 Data (JSON)
  if (encrypted.p45Data) {
    try {
      const p45DataJson = JSON.stringify(encrypted.p45Data)
      const encryptedP45Json = await encryptField(p45DataJson)
      if (encryptedP45Json) {
        // Store encrypted JSON as string, will need to parse when decrypting
        (encrypted as any).p45DataEncrypted = encryptedP45Json
        // Remove original for security (encrypted version stored)
        delete encrypted.p45Data
      }
    } catch (error) {
      console.error('[EmployeeDataEncryption] Error encrypting P45 data:', error)
      // If encryption fails, leave as-is (shouldn't happen, but fail gracefully)
    }
  }
  
  return encrypted
}

/**
 * Decrypt sensitive employee data fields when reading
 */
export async function decryptEmployeeData(employee: Employee | Partial<Employee>): Promise<Employee | Partial<Employee>> {
  const decrypted: Partial<Employee> = { ...employee }
  
  // Decrypt National Insurance Number
  if (decrypted.nationalInsuranceNumber) {
    decrypted.nationalInsuranceNumber = await decryptField(decrypted.nationalInsuranceNumber) || decrypted.nationalInsuranceNumber
  }
  
  // Decrypt Bank Details
  if (decrypted.bankDetails) {
    const decryptedBankDetails = { ...decrypted.bankDetails }
    
    if (decryptedBankDetails.accountNumber) {
      decryptedBankDetails.accountNumber = await decryptField(decryptedBankDetails.accountNumber) || decryptedBankDetails.accountNumber
    }
    
    if (decryptedBankDetails.routingNumber) {
      decryptedBankDetails.routingNumber = await decryptField(decryptedBankDetails.routingNumber) || decryptedBankDetails.routingNumber
    }
    
    decrypted.bankDetails = decryptedBankDetails
  }
  
  // Decrypt Tax Code
  if (decrypted.taxCode) {
    decrypted.taxCode = await decryptField(decrypted.taxCode) || decrypted.taxCode
  }
  
  // Decrypt Salary
  // Check if salaryEncrypted exists (encrypted version) or salary exists (plain text)
  const salaryEncrypted = (decrypted as any).salaryEncrypted
  if (salaryEncrypted) {
    try {
      const decryptedSalaryStr = await decryptField(salaryEncrypted)
      if (decryptedSalaryStr) {
        const salaryValue = parseFloat(decryptedSalaryStr)
        if (!isNaN(salaryValue)) {
          decrypted.salary = salaryValue
          // Remove encrypted version after decryption
          delete (decrypted as any).salaryEncrypted
        } else {
          console.error('[EmployeeDataEncryption] Error parsing decrypted salary:', decryptedSalaryStr)
        }
      }
    } catch (error) {
      console.error('[EmployeeDataEncryption] Error decrypting salary:', error)
    }
  } else if (decrypted.salary !== undefined && decrypted.salary !== null) {
    // If salary exists in plain text, it might need migration
    // For now, leave it as-is (backward compatibility)
    // In future, could encrypt on next update
  }
  
  // Decrypt P45 Data
  // Check if p45Data exists or if p45DataEncrypted exists (encrypted version)
  const p45DataEncrypted = (decrypted as any).p45DataEncrypted
  if (p45DataEncrypted) {
    try {
      const decryptedP45Json = await decryptField(p45DataEncrypted)
      if (decryptedP45Json) {
        try {
          decrypted.p45Data = JSON.parse(decryptedP45Json)
          // Remove encrypted version after decryption
          delete (decrypted as any).p45DataEncrypted
        } catch (parseError) {
          console.error('[EmployeeDataEncryption] Error parsing decrypted P45 data:', parseError)
        }
      }
    } catch (error) {
      console.error('[EmployeeDataEncryption] Error decrypting P45 data:', error)
    }
  } else if (decrypted.p45Data) {
    // If p45Data exists in plain text, it might need migration
    // For now, leave it as-is (backward compatibility)
    // In future, could encrypt on next update
  }
  
  return decrypted as Employee
}

/**
 * Encrypt sensitive fields in an array of employees
 * Uses parallel processing for better performance with large arrays
 */
export async function encryptEmployeeDataArray(employees: (Employee | Partial<Employee>)[]): Promise<(Employee | Partial<Employee>)[]> {
  // Process all employees in parallel for better performance
  return Promise.all(employees.map(employee => encryptEmployeeData(employee)))
}

/**
 * Decrypt sensitive fields in an array of employees
 * Uses parallel processing for better performance with large arrays
 */
export async function decryptEmployeeDataArray(employees: (Employee | Partial<Employee>)[]): Promise<(Employee | Partial<Employee>)[]> {
  // Process all employees in parallel for better performance
  return Promise.all(employees.map(employee => decryptEmployeeData(employee)))
}

