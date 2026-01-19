// Initialize admin first (lazy initialization)
import './admin';

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