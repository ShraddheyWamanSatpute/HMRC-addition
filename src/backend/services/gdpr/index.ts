/**
 * GDPR Compliance Services Index
 *
 * UK GDPR and HMRC compliant services for:
 * - Consent management
 * - Data breach incident tracking
 * - Audit trail logging
 *
 * References:
 * - ICO GDPR Guidance: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/
 * - HMRC API Requirements: https://developer.service.hmrc.gov.uk/
 */

// Services
export { ConsentService, consentService } from './ConsentService';
export { DataBreachService, dataBreachService } from './DataBreachService';
export { AuditTrailService, auditTrailService } from './AuditTrailService';

// Types
export type {
  // Consent
  ConsentRecord,
  ConsentPurpose,
  LawfulBasis,
  // Data Breach
  DataBreachIncident,
  BreachSeverity,
  BreachStatus,
  // Audit
  AuditLogEntry,
  AuditAction,
  // Retention
  DataRetentionPolicy,
  // DSAR
  DataSubjectAccessRequest,
  // Privacy Impact
  PrivacyImpactAssessment,
} from './types';
