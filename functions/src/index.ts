// Initialize admin first (lazy initialization)
import './admin';

// Export all OAuth functions
export { oauthGoogle, oauthCallbackGmail } from './oauthGoogle';
export { oauthOutlook, oauthCallbackOutlook } from './oauthOutlook';
export { checkOAuthStatus, disconnectOAuth } from './checkOAuthStatus';
export { sendTestEmail } from './sendTestEmail';
export { sendEmailWithGmail } from './sendEmailWithGmail';
export { exchangeHMRCToken, refreshHMRCToken } from './hmrcOAuth';