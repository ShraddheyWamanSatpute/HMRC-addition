/**
 * Data Breach Incident Service
 *
 * Manages data breach incidents in compliance with UK GDPR and HMRC requirements.
 * - Documents all breaches (required by ICO)
 * - Tracks ICO notification within 72 hours
 * - Tracks HMRC notification within 72 hours
 * - Manages user notification for high-risk breaches
 *
 * Reference: ICO Personal Data Breaches Guide
 */

import { ref, push, set, get, update, query, orderByChild } from 'firebase/database';
import { db } from '../Firebase';
import { DataBreachIncident, BreachSeverity, BreachStatus } from './types';
import { EncryptionService } from '../../utils/EncryptionService';
import { getEncryptionKey } from '../../utils/EncryptionKeyManager';

const HOURS_72_MS = 72 * 60 * 60 * 1000; // 72 hours in milliseconds

export class DataBreachService {
  private basePath: string;
  private encryptionService: EncryptionService;

  constructor() {
    this.basePath = 'compliance/dataBreaches';
    this.encryptionService = new EncryptionService();
  }

  /**
   * Report a new data breach incident
   * Encrypts sensitive fields (description, potentialConsequences) before storage
   */
  async reportBreach(
    companyId: string,
    detectedBy: string,
    incident: {
      title: string;
      description: string;
      severity: BreachSeverity;
      dataCategories: string[];
      estimatedRecordsAffected: number;
      riskToIndividuals: 'unlikely' | 'possible' | 'likely' | 'highly_likely';
      potentialConsequences: string[];
    }
  ): Promise<DataBreachIncident> {
    const breachRef = push(ref(db, `${this.basePath}/${companyId}`));
    const now = Date.now();

    // Encrypt sensitive breach details
    const encryptionKey = getEncryptionKey();
    const encryptedDescription = await this.encryptionService.encrypt(
      incident.description,
      encryptionKey
    );
    const encryptedConsequences = await Promise.all(
      incident.potentialConsequences.map((consequence) =>
        this.encryptionService.encrypt(consequence, encryptionKey)
      )
    );

    // Determine notification requirements based on severity, risk, and data sensitivity
    const requiresICONotification = this.assessICONotificationRequired(
      incident.severity,
      incident.riskToIndividuals,
      incident.estimatedRecordsAffected,
      incident.dataCategories
    );

    const requiresUserNotification = this.assessUserNotificationRequired(
      incident.riskToIndividuals,
      incident.potentialConsequences
    );

    // HMRC notification required if payroll/tax data is affected
    const requiresHMRCNotification = incident.dataCategories.some(
      (cat) =>
        cat.includes('payroll') ||
        cat.includes('tax') ||
        cat.includes('hmrc') ||
        cat.includes('paye') ||
        cat.includes('ni_number')
    );

    const record: DataBreachIncident = {
      id: breachRef.key!,
      companyId,
      detectedAt: now,
      detectedBy,
      reportedAt: now,
      reportedBy: detectedBy,
      title: incident.title,
      description: encryptedDescription, // Encrypted
      severity: incident.severity,
      status: 'detected',
      dataCategories: incident.dataCategories,
      estimatedRecordsAffected: incident.estimatedRecordsAffected,
      riskToIndividuals: incident.riskToIndividuals,
      potentialConsequences: encryptedConsequences, // Encrypted
      requiresICONotification,
      requiresUserNotification,
      requiresHMRCNotification,
      remediationActions: [],
      preventiveMeasures: [],
      containmentActions: [],
      createdAt: now,
    };

    await set(breachRef, record);

    // Log console warning for urgent breaches
    if (requiresICONotification || requiresHMRCNotification) {
      console.warn(
        `[DATA BREACH] Critical breach detected (ID: ${record.id}). ` +
        `ICO notification required: ${requiresICONotification}. ` +
        `HMRC notification required: ${requiresHMRCNotification}. ` +
        `72-hour deadline: ${new Date(now + HOURS_72_MS).toISOString()}`
      );
    }

    return record;
  }

  /**
   * Update breach status
   */
  async updateStatus(
    companyId: string,
    breachId: string,
    newStatus: BreachStatus,
    userId: string,
    notes?: string
  ): Promise<void> {
    const breachRef = ref(db, `${this.basePath}/${companyId}/${breachId}`);
    const snapshot = await get(breachRef);

    if (!snapshot.exists()) {
      throw new Error('Breach incident not found');
    }

    const updates: Partial<DataBreachIncident> = {
      status: newStatus,
      updatedAt: Date.now(),
    };

    if (newStatus === 'contained') {
      updates.containedAt = Date.now();
      updates.containedBy = userId;
    }

    if (newStatus === 'resolved') {
      updates.resolvedAt = Date.now();
      updates.resolvedBy = userId;
    }

    if (notes) {
      const current = snapshot.val() as DataBreachIncident;
      updates.remediationActions = [
        ...(current.remediationActions || []),
        `[${new Date().toISOString()}] ${notes}`,
      ];
    }

    await update(breachRef, updates);
  }

  /**
   * Record breach containment
   * Tracks when and how a breach was contained
   */
  async recordContainment(
    companyId: string,
    breachId: string,
    userId: string,
    containmentActions: string[]
  ): Promise<void> {
    const breachRef = ref(db, `${this.basePath}/${companyId}/${breachId}`);
    const snapshot = await get(breachRef);

    if (!snapshot.exists()) {
      throw new Error('Breach incident not found');
    }

    const current = snapshot.val() as DataBreachIncident;
    await update(breachRef, {
      status: 'contained',
      containedAt: Date.now(),
      containedBy: userId,
      containmentActions: [
        ...(current.containmentActions || []),
        ...containmentActions.map(
          (action) => `[${new Date().toISOString()}] ${action}`
        ),
      ],
      updatedAt: Date.now(),
    });
  }

  /**
   * Record ICO notification
   */
  async recordICONotification(
    companyId: string,
    breachId: string,
    userId: string,
    referenceNumber: string
  ): Promise<void> {
    const breachRef = ref(db, `${this.basePath}/${companyId}/${breachId}`);

    await update(breachRef, {
      status: 'notified_ico',
      icoNotifiedAt: Date.now(),
      icoNotifiedBy: userId,
      icoReferenceNumber: referenceNumber,
      updatedAt: Date.now(),
    });
  }

  /**
   * Record HMRC notification
   */
  async recordHMRCNotification(
    companyId: string,
    breachId: string,
    _userId: string,
    referenceNumber: string
  ): Promise<void> {
    const breachRef = ref(db, `${this.basePath}/${companyId}/${breachId}`);

    await update(breachRef, {
      hmrcNotifiedAt: Date.now(),
      hmrcReferenceNumber: referenceNumber,
      updatedAt: Date.now(),
    });
  }

  /**
   * Record user notification
   */
  async recordUserNotification(
    companyId: string,
    breachId: string,
    method: string
  ): Promise<void> {
    const breachRef = ref(db, `${this.basePath}/${companyId}/${breachId}`);

    await update(breachRef, {
      status: 'notified_users',
      usersNotifiedAt: Date.now(),
      notificationMethod: method,
      updatedAt: Date.now(),
    });
  }

  /**
   * Get breach incident by ID
   * Decrypts sensitive fields (description, potentialConsequences) before returning
   */
  async getBreach(
    companyId: string,
    breachId: string
  ): Promise<DataBreachIncident | null> {
    const breachRef = ref(db, `${this.basePath}/${companyId}/${breachId}`);
    const snapshot = await get(breachRef);

    if (!snapshot.exists()) return null;
    
    const breach = snapshot.val() as DataBreachIncident;
    
    // Decrypt sensitive fields
    const encryptionKey = getEncryptionKey();
    try {
      if (breach.description) {
        breach.description = await this.encryptionService.decrypt(
          breach.description,
          encryptionKey
        );
      }
      if (breach.potentialConsequences && Array.isArray(breach.potentialConsequences)) {
        breach.potentialConsequences = await Promise.all(
          breach.potentialConsequences.map((consequence: string) =>
            this.encryptionService.decrypt(consequence, encryptionKey).catch(() => consequence)
          )
        );
      }
    } catch (error) {
      console.error('[DataBreachService] Error decrypting breach data:', error);
      // Return breach with encrypted fields if decryption fails (backward compatibility)
    }
    
    return breach;
  }

  /**
   * Get all breach incidents for a company
   * Note: Returns breaches with encrypted sensitive fields
   * Use getBreach() for individual breach with decrypted fields
   */
  async getCompanyBreaches(companyId: string): Promise<DataBreachIncident[]> {
    const breachRef = ref(db, `${this.basePath}/${companyId}`);
    const breachQuery = query(breachRef, orderByChild('detectedAt'));
    const snapshot = await get(breachQuery);

    if (!snapshot.exists()) return [];

    const breaches: DataBreachIncident[] = [];
    snapshot.forEach((child) => {
      breaches.push(child.val() as DataBreachIncident);
    });

    return breaches.reverse(); // Most recent first
  }

  /**
   * Get breaches requiring urgent action (notification deadline approaching)
   */
  async getUrgentBreaches(companyId: string): Promise<DataBreachIncident[]> {
    const breaches = await this.getCompanyBreaches(companyId);
    const now = Date.now();

    return breaches.filter((breach) => {
      // Not yet resolved
      if (breach.status === 'resolved' || breach.status === 'closed') {
        return false;
      }

      // ICO notification required but not done
      if (
        breach.requiresICONotification &&
        !breach.icoNotifiedAt &&
        breach.detectedAt + HOURS_72_MS > now
      ) {
        return true;
      }

      // HMRC notification required but not done
      if (
        breach.requiresHMRCNotification &&
        !breach.hmrcNotifiedAt &&
        breach.detectedAt + HOURS_72_MS > now
      ) {
        return true;
      }

      return false;
    });
  }

  /**
   * Get breaches approaching notification deadline
   * Useful for sending alerts/reminders before the 72-hour deadline
   * 
   * @param companyId - Company ID
   * @param hoursRemaining - Hours before deadline to trigger warning (default: 24)
   * @returns Breaches that need notification within the specified hours
   */
  async getApproachingDeadlineBreaches(
    companyId: string,
    hoursRemaining: number = 24
  ): Promise<DataBreachIncident[]> {
    const breaches = await this.getCompanyBreaches(companyId);
    const now = Date.now();
    const warningThreshold = hoursRemaining * 60 * 60 * 1000;

    return breaches.filter((breach) => {
      // Exclude resolved or closed breaches
      if (breach.status === 'resolved' || breach.status === 'closed') {
        return false;
      }

      const deadline = breach.detectedAt + HOURS_72_MS;
      const timeRemaining = deadline - now;

      // Check if deadline is approaching (within warning threshold but not past)
      if (timeRemaining > 0 && timeRemaining <= warningThreshold) {
        // ICO notification required but not done
        if (breach.requiresICONotification && !breach.icoNotifiedAt) {
          return true;
        }

        // HMRC notification required but not done
        if (breach.requiresHMRCNotification && !breach.hmrcNotifiedAt) {
          return true;
        }
      }

      return false;
    });
  }

  /**
   * Get overdue breaches (past 72-hour deadline)
   */
  async getOverdueBreaches(companyId: string): Promise<DataBreachIncident[]> {
    const breaches = await this.getCompanyBreaches(companyId);
    const now = Date.now();

    return breaches.filter((breach) => {
      const deadline = breach.detectedAt + HOURS_72_MS;

      // ICO notification overdue
      if (
        breach.requiresICONotification &&
        !breach.icoNotifiedAt &&
        deadline < now
      ) {
        return true;
      }

      // HMRC notification overdue
      if (
        breach.requiresHMRCNotification &&
        !breach.hmrcNotifiedAt &&
        deadline < now
      ) {
        return true;
      }

      return false;
    });
  }

  /**
   * Add remediation action to breach record
   */
  async addRemediationAction(
    companyId: string,
    breachId: string,
    action: string
  ): Promise<void> {
    const breachRef = ref(db, `${this.basePath}/${companyId}/${breachId}`);
    const snapshot = await get(breachRef);

    if (!snapshot.exists()) {
      throw new Error('Breach incident not found');
    }

    const current = snapshot.val() as DataBreachIncident;
    await update(breachRef, {
      remediationActions: [
        ...(current.remediationActions || []),
        `[${new Date().toISOString()}] ${action}`,
      ],
      updatedAt: Date.now(),
    });
  }

  /**
   * Add preventive measure to breach record
   */
  async addPreventiveMeasure(
    companyId: string,
    breachId: string,
    measure: string
  ): Promise<void> {
    const breachRef = ref(db, `${this.basePath}/${companyId}/${breachId}`);
    const snapshot = await get(breachRef);

    if (!snapshot.exists()) {
      throw new Error('Breach incident not found');
    }

    const current = snapshot.val() as DataBreachIncident;
    await update(breachRef, {
      preventiveMeasures: [
        ...(current.preventiveMeasures || []),
        `[${new Date().toISOString()}] ${measure}`,
      ],
      updatedAt: Date.now(),
    });
  }

  /**
   * Document root cause analysis
   */
  async documentRootCause(
    companyId: string,
    breachId: string,
    rootCause: string
  ): Promise<void> {
    const breachRef = ref(db, `${this.basePath}/${companyId}/${breachId}`);

    await update(breachRef, {
      rootCause,
      updatedAt: Date.now(),
    });
  }

  /**
   * Assess if ICO notification is required
   * Based on ICO guidance: notify if "likely to result in a risk"
   * Considers data category sensitivity for more accurate assessment
   */
  private assessICONotificationRequired(
    severity: BreachSeverity,
    riskToIndividuals: string,
    recordsAffected: number,
    dataCategories: string[]
  ): boolean {
    // High/critical severity always requires notification
    if (severity === 'critical' || severity === 'high') {
      return true;
    }

    // Likely/highly likely risk to individuals requires notification
    if (riskToIndividuals === 'likely' || riskToIndividuals === 'highly_likely') {
      return true;
    }

    // Check data category sensitivity
    const highlySensitiveCategories = [
      'financial',
      'bank_details',
      'payment',
      'health',
      'medical',
      'biometric',
      'genetic',
      'criminal',
      'ni_number',
      'tax_code',
      'p45',
      'p60',
    ];

    const hasHighlySensitiveData = dataCategories.some((cat) =>
      highlySensitiveCategories.some((sensitive) =>
        cat.toLowerCase().includes(sensitive)
      )
    );

    // Highly sensitive data: lower threshold (10 records)
    if (hasHighlySensitiveData && recordsAffected >= 10) {
      return true;
    }

    // Less sensitive data: higher threshold (100 records)
    // ICO guidance: consider context - 100 records might be too low for non-sensitive data
    // but we keep it for safety, as context is hard to assess automatically
    if (recordsAffected >= 100) {
      return true;
    }

    return false;
  }

  /**
   * Assess if user notification is required
   * Based on high risk to rights and freedoms
   */
  private assessUserNotificationRequired(
    riskToIndividuals: string,
    consequences: string[]
  ): boolean {
    // High risk to individuals requires notification
    if (riskToIndividuals === 'likely' || riskToIndividuals === 'highly_likely') {
      return true;
    }

    // Severe consequences require notification
    const severeConsequences = [
      'identity_theft',
      'financial_loss',
      'discrimination',
      'reputational_damage',
    ];

    if (consequences.some((c) => severeConsequences.includes(c.toLowerCase()))) {
      return true;
    }

    return false;
  }

  /**
   * Get breach statistics for compliance reporting
   */
  async getBreachStatistics(companyId: string): Promise<{
    total: number;
    resolved: number;
    pending: number;
    icoNotified: number;
    hmrcNotified: number;
    overdue: number;
    bySeverity: Record<BreachSeverity, number>;
  }> {
    const breaches = await this.getCompanyBreaches(companyId);
    const overdueBreaches = await this.getOverdueBreaches(companyId);

    const stats = {
      total: breaches.length,
      resolved: 0,
      pending: 0,
      icoNotified: 0,
      hmrcNotified: 0,
      overdue: overdueBreaches.length,
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      } as Record<BreachSeverity, number>,
    };

    for (const breach of breaches) {
      if (breach.status === 'resolved' || breach.status === 'closed') {
        stats.resolved++;
      } else {
        stats.pending++;
      }

      if (breach.icoNotifiedAt) stats.icoNotified++;
      if (breach.hmrcNotifiedAt) stats.hmrcNotified++;
      stats.bySeverity[breach.severity]++;
    }

    return stats;
  }
}

// Export singleton instance
export const dataBreachService = new DataBreachService();
