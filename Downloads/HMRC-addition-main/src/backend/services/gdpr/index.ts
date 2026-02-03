/**
 * GDPR Compliance Services Index
 *
 * UK GDPR and HMRC compliant services for:
 * - Consent management
 * - Data breach incident tracking
 * - Audit trail logging
 * - Privacy policy management
 * - Data subject access requests (DSAR)
 * - Data retention policy management
 * - Security incident reporting
 *
 * References:
 * - ICO GDPR Guidance: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/
 * - HMRC API Requirements: https://developer.service.hmrc.gov.uk/
 * - ICO Data Subject Access Requests: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/right-of-access/
 */

// Core GDPR Services
export { ConsentService, consentService } from './ConsentService';
export { DataBreachService, dataBreachService } from './DataBreachService';
export { AuditTrailService, auditTrailService } from './AuditTrailService';

// Privacy Policy
export { PrivacyPolicyService, privacyPolicyService } from './PrivacyPolicy';
export type { PrivacyPolicySection, PrivacyPolicyData } from './PrivacyPolicy';

// Data Subject Access Requests (DSAR)
export { DSARService, dsarService } from './DSARService';
export type { DSARRequestType, DSARStatus, DSARRecord, DSARResponseData } from './DSARService';

// Data Retention
export { DataRetentionService, dataRetentionService, DEFAULT_RETENTION_POLICIES } from './DataRetentionService';
export type {
  DataCategory,
  RetentionAction,
  RetentionScheduleRecord,
  RetentionTrackedRecord,
  RetentionReviewTask,
} from './DataRetentionService';

// Security Incident Reporting
export { SecurityIncidentService, securityIncidentService } from './SecurityIncidentService';
export type {
  SecurityIncidentType,
  IncidentSeverity,
  IncidentStatus,
  SecurityIncidentReport,
  IncidentResponseAction,
} from './SecurityIncidentService';

// Core Types
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
