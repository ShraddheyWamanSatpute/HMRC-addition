/**
 * GDPR Consent Management Service
 *
 * Manages consent records for data processing in compliance with UK GDPR.
 * Tracks lawful basis, consent given/withdrawn, and maintains audit trail.
 *
 * Reference: ICO Lawful Basis Guide
 */

import { ref, push, set, get, update, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '../Firebase';
import { ConsentRecord, LawfulBasis, ConsentPurpose } from './types';

export class ConsentService {
  private basePath: string;

  constructor() {
    this.basePath = 'compliance/consent';
  }

  /**
   * Record consent given by a user
   */
  async recordConsent(
    userId: string,
    companyId: string,
    purpose: ConsentPurpose,
    options: {
      lawfulBasis: LawfulBasis;
      policyVersion: string;
      method?: 'explicit' | 'implicit' | 'opt_in' | 'opt_out';
      expiresAt?: number;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<ConsentRecord> {
    const consentRef = push(ref(db, `${this.basePath}/${companyId}`));

    const record: ConsentRecord = {
      id: consentRef.key!,
      userId,
      companyId,
      purpose,
      lawfulBasis: options.lawfulBasis,
      consentGiven: true,
      consentTimestamp: Date.now(),
      method: options.method || 'explicit',
      version: options.policyVersion,
      ipAddress: options.ipAddress ? this.maskIpAddress(options.ipAddress) : undefined,
      userAgent: options.userAgent?.substring(0, 100),
      expiresAt: options.expiresAt,
      metadata: options.metadata,
    };

    await set(consentRef, record);
    return record;
  }

  /**
   * Withdraw previously given consent
   * Creates a new withdrawal audit record and updates the original consent record
   * This provides a clear audit trail of consent withdrawals
   */
  async withdrawConsent(
    companyId: string,
    consentId: string,
    userId: string,
    options?: {
      ipAddress?: string;
      userAgent?: string;
      reason?: string;
    }
  ): Promise<{ success: boolean; withdrawalRecordId: string }> {
    const consentRef = ref(db, `${this.basePath}/${companyId}/${consentId}`);
    const snapshot = await get(consentRef);

    if (!snapshot.exists()) {
      throw new Error('Consent record not found');
    }

    const record = snapshot.val() as ConsentRecord;

    // Verify the user owns this consent record
    if (record.userId !== userId) {
      throw new Error('Unauthorized: Cannot withdraw consent for another user');
    }

    // Check if consent is already withdrawn
    if (record.withdrawnTimestamp) {
      throw new Error('Consent has already been withdrawn');
    }

    const now = Date.now();

    // Create new withdrawal audit record
    const withdrawalRef = push(ref(db, `${this.basePath}/${companyId}`));
    const withdrawalRecord: ConsentRecord = {
      id: withdrawalRef.key!,
      userId,
      companyId,
      purpose: record.purpose,
      lawfulBasis: record.lawfulBasis,
      consentGiven: false,
      consentTimestamp: now,
      withdrawnTimestamp: now,
      method: 'explicit',
      version: record.version,
      ipAddress: options?.ipAddress ? this.maskIpAddress(options.ipAddress) : undefined,
      userAgent: options?.userAgent?.substring(0, 100),
      metadata: {
        withdrawnFrom: consentId,
        originalConsentTimestamp: record.consentTimestamp,
        originalConsentId: consentId,
        withdrawalReason: options?.reason,
        withdrawalMethod: 'explicit',
      },
    };

    await set(withdrawalRef, withdrawalRecord);

    // Update original consent record with withdrawal timestamp and reference
    await update(consentRef, {
      consentGiven: false,
      withdrawnTimestamp: now,
      withdrawalRecordId: withdrawalRef.key,
      updatedAt: now,
    });

    return {
      success: true,
      withdrawalRecordId: withdrawalRef.key!,
    };
  }

  /**
   * Check if user has given consent for a specific purpose
   * Returns the latest consent record for the purpose, checking expiry and withdrawal status
   */
  async hasConsent(
    userId: string,
    companyId: string,
    purpose: ConsentPurpose
  ): Promise<boolean> {
    const consents = await this.getUserConsents(userId, companyId);

    // Get all consents for this purpose, sorted by timestamp (newest first)
    const relevantConsents = consents
      .filter((c) => c.purpose === purpose)
      .sort((a, b) => b.consentTimestamp - a.consentTimestamp);

    // No consents found for this purpose
    if (relevantConsents.length === 0) {
      return false;
    }

    // Get the latest consent record
    const latestConsent = relevantConsents[0];

    // Check if consent was given and not withdrawn
    if (!latestConsent.consentGiven || latestConsent.withdrawnTimestamp) {
      return false;
    }

    // Check if consent has expired
    if (latestConsent.expiresAt && latestConsent.expiresAt < Date.now()) {
      return false;
    }

    return true;
  }

  /**
   * Get all consent records for a user
   */
  async getUserConsents(
    userId: string,
    companyId: string
  ): Promise<ConsentRecord[]> {
    const consentRef = ref(db, `${this.basePath}/${companyId}`);
    const consentQuery = query(consentRef, orderByChild('userId'), equalTo(userId));
    const snapshot = await get(consentQuery);

    if (!snapshot.exists()) return [];

    const records: ConsentRecord[] = [];
    snapshot.forEach((child) => {
      records.push(child.val() as ConsentRecord);
    });

    return records;
  }

  /**
   * Get the latest consent record for a specific purpose
   * Useful for checking consent status and expiry
   */
  async getLatestConsent(
    userId: string,
    companyId: string,
    purpose: ConsentPurpose
  ): Promise<ConsentRecord | null> {
    const consents = await this.getUserConsents(userId, companyId);

    // Get all consents for this purpose, sorted by timestamp (newest first)
    const relevantConsents = consents
      .filter((c) => c.purpose === purpose)
      .sort((a, b) => b.consentTimestamp - a.consentTimestamp);

    return relevantConsents.length > 0 ? relevantConsents[0] : null;
  }

  /**
   * Get consent record by ID
   */
  async getConsent(
    companyId: string,
    consentId: string
  ): Promise<ConsentRecord | null> {
    const consentRef = ref(db, `${this.basePath}/${companyId}/${consentId}`);
    const snapshot = await get(consentRef);

    if (!snapshot.exists()) return null;
    return snapshot.val() as ConsentRecord;
  }

  /**
   * Get all active consents for a company
   */
  async getCompanyConsents(companyId: string): Promise<ConsentRecord[]> {
    const consentRef = ref(db, `${this.basePath}/${companyId}`);
    const snapshot = await get(consentRef);

    if (!snapshot.exists()) return [];

    const records: ConsentRecord[] = [];
    snapshot.forEach((child) => {
      const record = child.val() as ConsentRecord;
      if (record.consentGiven && !record.withdrawnTimestamp) {
        records.push(record);
      }
    });

    return records;
  }

  /**
   * Get consents expiring soon (for renewal/refresh mechanism)
   * UK GDPR: Consent should be refreshed periodically
   * 
   * @param companyId - Company ID
   * @param daysBeforeExpiry - Number of days before expiry to flag (default: 30)
   * @returns Array of consent records that will expire within the specified days
   */
  async getExpiringSoonConsents(
    companyId: string,
    daysBeforeExpiry: number = 30
  ): Promise<ConsentRecord[]> {
    const consents = await this.getCompanyConsents(companyId);
    const now = Date.now();
    const threshold = now + daysBeforeExpiry * 24 * 60 * 60 * 1000;

    return consents.filter((c) => {
      // Must have an expiry date
      if (!c.expiresAt) {
        return false;
      }

      // Must not be already expired
      if (c.expiresAt <= now) {
        return false;
      }

      // Must be expiring within the threshold
      return c.expiresAt <= threshold;
    });
  }

  /**
   * Get expired consents that need renewal
   * 
   * @param companyId - Company ID
   * @returns Array of consent records that have expired
   */
  async getExpiredConsents(companyId: string): Promise<ConsentRecord[]> {
    const consents = await this.getCompanyConsents(companyId);
    const now = Date.now();

    return consents.filter((c) => {
      // Must have an expiry date and be expired
      return c.expiresAt !== undefined && c.expiresAt <= now;
    });
  }

  /**
   * Check consent required for HMRC submissions
   * Returns true if lawful basis is established (contract or legal obligation)
   * Uses the latest consent record for accurate assessment
   */
  async hasHMRCSubmissionBasis(
    userId: string,
    companyId: string
  ): Promise<{ valid: boolean; basis: LawfulBasis | null; record?: ConsentRecord }> {
    const consents = await this.getUserConsents(userId, companyId);

    // Get all HMRC submission consents, sorted by timestamp (newest first)
    const hmrcConsents = consents
      .filter((c) => c.purpose === 'hmrc_submission')
      .sort((a, b) => b.consentTimestamp - a.consentTimestamp);

    if (hmrcConsents.length === 0) {
      return { valid: false, basis: null };
    }

    // Get the latest consent record
    const latestConsent = hmrcConsents[0];

    // Check if consent was given, not withdrawn, and not expired
    if (!latestConsent.consentGiven || latestConsent.withdrawnTimestamp) {
      return { valid: false, basis: null };
    }

    // Check if consent has expired
    if (latestConsent.expiresAt && latestConsent.expiresAt < Date.now()) {
      return { valid: false, basis: null };
    }

    // For HMRC submissions, legal obligation or contract are valid bases
    if (
      latestConsent.lawfulBasis === 'legal_obligation' ||
      latestConsent.lawfulBasis === 'contract'
    ) {
      return { valid: true, basis: latestConsent.lawfulBasis, record: latestConsent };
    }

    return { valid: false, basis: null };
  }

  /**
   * Record lawful basis documentation (for non-consent bases)
   */
  async documentLawfulBasis(
    companyId: string,
    userId: string,
    purpose: ConsentPurpose,
    lawfulBasis: LawfulBasis,
    justification: string,
    policyVersion: string
  ): Promise<ConsentRecord> {
    const consentRef = push(ref(db, `${this.basePath}/${companyId}`));

    const record: ConsentRecord = {
      id: consentRef.key!,
      userId,
      companyId,
      purpose,
      lawfulBasis,
      consentGiven: true, // For contract/legal obligation, this represents acknowledgment
      consentTimestamp: Date.now(),
      method: 'implicit',
      version: policyVersion,
      metadata: {
        justification,
        documentedAt: Date.now(),
      },
    };

    await set(consentRef, record);
    return record;
  }

  /**
   * Mask IP address for GDPR compliance
   * Keeps first two octets, masks last two
   */
  private maskIpAddress(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    // IPv6 or invalid - return truncated
    return ip.substring(0, 10) + '...';
  }

  /**
   * Export consent records for DSAR (Data Subject Access Request)
   */
  async exportUserConsents(
    userId: string,
    companyId: string
  ): Promise<{ consents: ConsentRecord[]; exportedAt: number }> {
    const consents = await this.getUserConsents(userId, companyId);

    return {
      consents,
      exportedAt: Date.now(),
    };
  }

  /**
   * Delete all consent records for a user (Right to Erasure)
   * Note: Some records may need to be retained for legal compliance
   * Creates an audit log before deletion for compliance tracking
   */
  async deleteUserConsents(
    userId: string,
    companyId: string,
    options: {
      preserveLegalObligations?: boolean;
      reason?: string;
      deletedBy?: string;
    } = {}
  ): Promise<{ deleted: number; preserved: number; auditRecordId: string }> {
    const consents = await this.getUserConsents(userId, companyId);
    let deleted = 0;
    let preserved = 0;
    const deletedConsentIds: string[] = [];
    const preservedConsentIds: string[] = [];

    // First pass: identify what will be deleted vs preserved
    for (const consent of consents) {
      // If preserving legal obligations, don't delete those records
      if (
        options.preserveLegalObligations &&
        consent.lawfulBasis === 'legal_obligation'
      ) {
        preserved++;
        preservedConsentIds.push(consent.id);
        continue;
      }

      deleted++;
      deletedConsentIds.push(consent.id);
    }

    // Create audit record before deletion
    const auditRef = push(ref(db, `compliance/deletionAudit/${companyId}`));
    const auditRecord = {
      id: auditRef.key!,
      userId,
      companyId,
      deletedAt: Date.now(),
      deletedBy: options.deletedBy || userId,
      deletedCount: deleted,
      preservedCount: preserved,
      reason: options.reason || 'right_to_erasure',
      deletedConsentIds,
      preservedConsentIds,
      preserveLegalObligations: options.preserveLegalObligations || false,
      metadata: {
        totalConsents: consents.length,
        deletionMethod: 'right_to_erasure',
      },
    };

    await set(auditRef, auditRecord);

    // Second pass: perform actual deletion
    for (const consentId of deletedConsentIds) {
      const consentRef = ref(db, `${this.basePath}/${companyId}/${consentId}`);
      await set(consentRef, null);
    }

    return {
      deleted,
      preserved,
      auditRecordId: auditRef.key!,
    };
  }
}

// Export singleton instance
export const consentService = new ConsentService();
