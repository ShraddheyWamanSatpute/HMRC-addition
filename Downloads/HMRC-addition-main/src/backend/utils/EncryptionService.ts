/**
 * Encryption Service
 *
 * Provides encryption utilities for sensitive data in compliance with
 * UK GDPR and HMRC requirements.
 *
 * Security Features:
 * - AES-256-GCM encryption for data at rest
 * - Secure key derivation (PBKDF2) with random salt per encryption
 * - Random IV generation (12 bytes)
 * - Random salt generation (16 bytes) - prevents same key from producing same ciphertext
 * - No key storage alongside data
 *
 * Reference: ICO Encryption Guidance
 *
 * IMPORTANT: Encryption keys should be stored in:
 * - Firebase Secrets (for server-side)
 * - Never in client-side code or localStorage
 */

/**
 * Browser-compatible encryption using Web Crypto API
 */
export class EncryptionService {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  
  // Encryption format version
  // Version 1: salt (16) + IV (12) + ciphertext (legacy, no version byte)
  // Version 2: version (1) + salt (16) + IV (12) + ciphertext (current)
  private static readonly CURRENT_VERSION = 2;
  private static readonly VERSION_BYTE_LENGTH = 1;

  /**
   * Encrypt sensitive data
   *
   * @param plaintext - Data to encrypt
   * @param key - Encryption key (should come from secure source)
   * @returns Base64 encoded encrypted data with salt (16 bytes) + IV (12 bytes) + ciphertext
   */
  async encrypt(plaintext: string, key: string): Promise<string> {
    if (!plaintext || !key) {
      throw new Error('Plaintext and key are required');
    }

    // Generate random salt for each encryption (16 bytes)
    // This ensures the same password produces different keys for each encryption
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Derive a cryptographic key from the provided key using the random salt
    const cryptoKey = await this.deriveKey(key, salt);

    // Generate random IV (12 bytes for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encodedText = this.encoder.encode(plaintext);
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      cryptoKey,
      encodedText
    );

    // Combine: version (1) + salt (16) + IV (12) + ciphertext
    const versionByte = new Uint8Array([EncryptionService.CURRENT_VERSION]);
    const combined = new Uint8Array(
      EncryptionService.VERSION_BYTE_LENGTH + 
      salt.length + 
      iv.length + 
      encryptedBuffer.byteLength
    );
    combined.set(versionByte, 0);
    combined.set(salt, EncryptionService.VERSION_BYTE_LENGTH);
    combined.set(iv, EncryptionService.VERSION_BYTE_LENGTH + salt.length);
    combined.set(
      new Uint8Array(encryptedBuffer), 
      EncryptionService.VERSION_BYTE_LENGTH + salt.length + iv.length
    );

    // Return as base64
    return this.arrayBufferToBase64(combined.buffer);
  }

  /**
   * Decrypt encrypted data
   *
   * Supports multiple formats:
   * - Version 2 (current): version (1) + salt (16) + IV (12) + ciphertext
   * - Version 1 (legacy): salt (16) + IV (12) + ciphertext
   * - Version 0 (legacy): IV (12) + ciphertext (uses fixed salt)
   *
   * @param ciphertext - Base64 encoded encrypted data
   * @param key - Encryption key
   * @returns Decrypted plaintext
   */
  async decrypt(ciphertext: string, key: string): Promise<string> {
    if (!ciphertext || !key) {
      throw new Error('Ciphertext and key are required');
    }

    // Decode from base64
    const combined = new Uint8Array(this.base64ToArrayBuffer(ciphertext));

    let salt: Uint8Array;
    let iv: Uint8Array;
    let encryptedData: Uint8Array;
    let offset = 0;

    // Detect format version
    if (combined.length >= EncryptionService.VERSION_BYTE_LENGTH + 16 + 12) {
      // Check if first byte is a valid version number (1-255)
      const firstByte = combined[0];
      if (firstByte >= 1 && firstByte <= 255) {
        // Version 2: version byte present
        // Version detected but not used in decryption logic (for future extensibility)
        offset = EncryptionService.VERSION_BYTE_LENGTH;
        salt = new Uint8Array(combined.buffer, combined.byteOffset + offset, 16);
        offset += 16;
        iv = new Uint8Array(combined.buffer, combined.byteOffset + offset, 12);
        offset += 12;
        encryptedData = new Uint8Array(combined.buffer, combined.byteOffset + offset);
      } else if (combined.length >= 28) {
        // Version 1: salt (16) + IV (12) + ciphertext (no version byte)
        salt = new Uint8Array(combined.buffer, combined.byteOffset + 0, 16);
        iv = new Uint8Array(combined.buffer, combined.byteOffset + 16, 12);
        encryptedData = new Uint8Array(combined.buffer, combined.byteOffset + 28);
      } else {
        // Version 0: IV (12) + ciphertext (legacy, uses fixed salt)
        salt = this.encoder.encode('hmrc-compliance-salt-v1');
        iv = new Uint8Array(combined.buffer, combined.byteOffset + 0, 12);
        encryptedData = new Uint8Array(combined.buffer, combined.byteOffset + 12);
      }
    } else if (combined.length >= 12) {
      // Version 0: IV (12) + ciphertext (legacy, uses fixed salt)
      salt = this.encoder.encode('hmrc-compliance-salt-v1');
      iv = new Uint8Array(combined.buffer, combined.byteOffset + 0, 12);
      encryptedData = new Uint8Array(combined.buffer, combined.byteOffset + 12);
    } else {
      throw new Error('Invalid ciphertext format: too short');
    }

    // Derive the same cryptographic key using the salt
    const cryptoKey = await this.deriveKey(key, salt);

    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      cryptoKey,
      encryptedData as BufferSource
    );

    return this.decoder.decode(decryptedBuffer);
  }

  /**
   * Hash sensitive data (one-way, for comparison)
   *
   * @param data - Data to hash
   * @returns SHA-256 hash as hex string
   */
  async hash(data: string): Promise<string> {
    const encoded = this.encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    return this.arrayBufferToHex(hashBuffer);
  }

  /**
   * Derive encryption key from password/key using PBKDF2
   *
   * @param password - The encryption key/password
   * @param salt - Random salt (16 bytes) - must be the same for encryption and decryption
   * @returns Derived CryptoKey for AES-GCM encryption
   */
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Use the provided random salt (generated per encryption)
    // This ensures the same password produces different keys for each encryption
    // Security: 100,000 iterations of PBKDF2 with SHA-256
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Convert ArrayBuffer to hex string
   */
  private arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

/**
 * Sensitive Data Field Encryption Helper
 *
 * Provides utilities for encrypting specific sensitive fields
 * before storing in Firebase.
 *
 * SECURITY NOTE: The encryption key is stored in memory while the service is initialized.
 * For long-running processes, consider clearing the key after use using clearKey().
 * In browser environments, the key may persist in memory until garbage collection.
 */
export class SensitiveDataEncryption {
  private encryptionService: EncryptionService;
  private encryptionKey: string | null = null;

  constructor() {
    this.encryptionService = new EncryptionService();
  }

  /**
   * Initialize with encryption key
   * Key should be retrieved from a secure source (not hardcoded)
   *
   * @param key - Encryption key (minimum 32 characters)
   */
  initialize(key: string): void {
    if (!key || key.length < 32) {
      throw new Error('Encryption key must be at least 32 characters');
    }
    this.encryptionKey = key;
  }

  /**
   * Clear encryption key from memory
   * 
   * SECURITY: Call this method after encryption/decryption operations are complete
   * to minimize the time the key remains in memory. Note that JavaScript's garbage
   * collection may not immediately clear the memory, but this helps reduce exposure.
   * 
   * After clearing, you must call initialize() again before using encrypt/decrypt methods.
   */
  clearKey(): void {
    // Overwrite the key with null to help with garbage collection
    // Note: In JavaScript, we can't guarantee immediate memory clearing,
    // but this is the best practice we can follow
    this.encryptionKey = null;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.encryptionKey !== null;
  }

  /**
   * Encrypt a sensitive field value
   */
  async encryptField(value: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption service not initialized. Call initialize() first.');
    }
    return this.encryptionService.encrypt(value, this.encryptionKey);
  }

  /**
   * Decrypt a sensitive field value
   */
  async decryptField(encryptedValue: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption service not initialized. Call initialize() first.');
    }
    return this.encryptionService.decrypt(encryptedValue, this.encryptionKey);
  }

  /**
   * Encrypt sensitive fields in an object
   *
   * @param data - Object containing data
   * @param sensitiveFields - Array of field names to encrypt
   * @returns Object with specified fields encrypted
   */
  async encryptSensitiveFields<T extends Record<string, unknown>>(
    data: T,
    sensitiveFields: (keyof T)[]
  ): Promise<T> {
    if (!this.encryptionKey) {
      throw new Error('Encryption service not initialized');
    }

    const result = { ...data };

    for (const field of sensitiveFields) {
      const value = data[field];
      if (typeof value === 'string' && value.length > 0) {
        (result[field] as unknown) = await this.encryptField(value);
      }
    }

    return result;
  }

  /**
   * Decrypt sensitive fields in an object
   *
   * @param data - Object containing encrypted data
   * @param sensitiveFields - Array of field names to decrypt
   * @returns Object with specified fields decrypted
   */
  async decryptSensitiveFields<T extends Record<string, unknown>>(
    data: T,
    sensitiveFields: (keyof T)[]
  ): Promise<T> {
    if (!this.encryptionKey) {
      throw new Error('Encryption service not initialized');
    }

    const result = { ...data };

    for (const field of sensitiveFields) {
      const value = data[field];
      if (typeof value === 'string' && value.length > 0) {
        try {
          (result[field] as unknown) = await this.decryptField(value);
        } catch {
          // Field might not be encrypted, leave as is
          console.warn(`Failed to decrypt field ${String(field)}, may not be encrypted`);
        }
      }
    }

    return result;
  }

  /**
   * Hash a value (for comparison without storing plaintext)
   */
  async hashValue(value: string): Promise<string> {
    return this.encryptionService.hash(value);
  }
}

/**
 * Mask sensitive data for display/logging
 */
export class DataMasking {
  /**
   * Mask National Insurance number
   * Format: AB123456C -> AB****56C
   */
  static maskNINumber(ni: string): string {
    if (!ni || ni.length < 9) return '***';
    return ni.substring(0, 2) + '****' + ni.substring(6);
  }

  /**
   * Mask PAYE reference
   * Format: 123/AB45678 -> 123/***78
   */
  static maskPAYEReference(ref: string): string {
    if (!ref || ref.length < 4) return '***';
    const slashIndex = ref.indexOf('/');
    if (slashIndex === -1) return ref.substring(0, 3) + '***';
    return ref.substring(0, slashIndex + 1) + '***' + ref.slice(-2);
  }

  /**
   * Mask email address
   * Format: john.doe@example.com -> j***e@example.com
   */
  static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***@***.***';
    const maskedLocal = local.length > 2 ? local[0] + '***' + local[local.length - 1] : '***';
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Mask phone number
   * Format: 07123456789 -> 07***6789
   */
  static maskPhone(phone: string): string {
    if (!phone || phone.length < 6) return '***';
    return phone.substring(0, 2) + '***' + phone.slice(-4);
  }

  /**
   * Mask bank account number
   * Format: 12345678 -> ****5678
   */
  static maskBankAccount(account: string): string {
    if (!account || account.length < 4) return '****';
    return '****' + account.slice(-4);
  }

  /**
   * Mask sort code
   * Format: 12-34-56 -> **-**-56
   */
  static maskSortCode(sortCode: string): string {
    if (!sortCode || sortCode.length < 2) return '**-**-**';
    return '**-**-' + sortCode.slice(-2);
  }

  /**
   * Mask IP address
   * Format: 192.168.1.100 -> 192.168.xxx.xxx
   */
  static maskIPAddress(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    // IPv6 or invalid
    return ip.substring(0, 10) + '...';
  }

  /**
   * Mask address (keep city/postcode area only)
   * Format: "123 High Street, London, SW1A 1AA" -> "London, SW1A"
   */
  static maskAddress(address: string): string {
    if (!address) return '***';

    // Try to extract city and partial postcode
    const parts = address.split(',').map((p) => p.trim());
    if (parts.length >= 2) {
      const city = parts[parts.length - 2] || '';
      const postcode = parts[parts.length - 1] || '';
      const postcodeArea = postcode.split(' ')[0] || '***';
      return `${city}, ${postcodeArea}`;
    }

    return '***';
  }

  /**
   * Mask date of birth (show year only)
   * Format: 1990-05-15 -> 1990-**-**
   */
  static maskDateOfBirth(dob: string): string {
    if (!dob) return '****-**-**';
    const year = dob.substring(0, 4);
    return `${year}-**-**`;
  }
}

// Export singleton instances
export const encryptionService = new EncryptionService();
export const sensitiveDataEncryption = new SensitiveDataEncryption();
