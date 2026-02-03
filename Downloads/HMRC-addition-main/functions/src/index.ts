// Initialize admin first (lazy initialization)
import './admin';

/**
 * HMRC Configuration Validation
 * 
 * Note: Runtime validation is performed in each function call to ensure:
 * - Only ONE production application is configured (HMRC compliance requirement)
 * - Application name is logged for compliance auditing
 * - Configuration is validated on each use (not just at startup)
 * 
 * See: functions/src/hmrcOAuth.ts - validateSingleApplication()
 * See: functions/src/hmrcRTISubmission.ts - validateSingleApplication()
 * 
 * This ensures configuration is validated even if Functions container is reused
 * and prevents silent failures if configuration changes.
 */

// Export all OAuth functions
export { oauthGoogle, oauthCallbackGmail } from './oauthGoogle';
export { oauthOutlook, oauthCallbackOutlook } from './oauthOutlook';
export { checkOAuthStatus, disconnectOAuth } from './checkOAuthStatus';
export { sendTestEmail } from './sendTestEmail';
export { sendEmailWithGmail } from './sendEmailWithGmail';

// HMRC OAuth (token exchange and refresh)
export { exchangeHMRCToken, refreshHMRCToken } from './hmrcOAuth';

// HMRC RTI Submissions (server-side proxy for HMRC API)
// Required because HMRC APIs do not support CORS
export { submitRTI, checkRTIStatus, getHMRCAuthUrl } from './hmrcRTISubmission';