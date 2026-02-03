"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exchangeHMRCToken = exports.sendEmailWithGmail = exports.sendTestEmail = exports.disconnectOAuth = exports.checkOAuthStatus = exports.oauthCallbackOutlook = exports.oauthOutlook = exports.oauthCallbackGmail = exports.oauthGoogle = void 0;
// Initialize admin first (lazy initialization)
require("./admin");
// Export all OAuth functions
var oauthGoogle_1 = require("./oauthGoogle");
Object.defineProperty(exports, "oauthGoogle", { enumerable: true, get: function () { return oauthGoogle_1.oauthGoogle; } });
Object.defineProperty(exports, "oauthCallbackGmail", { enumerable: true, get: function () { return oauthGoogle_1.oauthCallbackGmail; } });
var oauthOutlook_1 = require("./oauthOutlook");
Object.defineProperty(exports, "oauthOutlook", { enumerable: true, get: function () { return oauthOutlook_1.oauthOutlook; } });
Object.defineProperty(exports, "oauthCallbackOutlook", { enumerable: true, get: function () { return oauthOutlook_1.oauthCallbackOutlook; } });
var checkOAuthStatus_1 = require("./checkOAuthStatus");
Object.defineProperty(exports, "checkOAuthStatus", { enumerable: true, get: function () { return checkOAuthStatus_1.checkOAuthStatus; } });
Object.defineProperty(exports, "disconnectOAuth", { enumerable: true, get: function () { return checkOAuthStatus_1.disconnectOAuth; } });
var sendTestEmail_1 = require("./sendTestEmail");
Object.defineProperty(exports, "sendTestEmail", { enumerable: true, get: function () { return sendTestEmail_1.sendTestEmail; } });
var sendEmailWithGmail_1 = require("./sendEmailWithGmail");
Object.defineProperty(exports, "sendEmailWithGmail", { enumerable: true, get: function () { return sendEmailWithGmail_1.sendEmailWithGmail; } });
var hmrcOAuth_1 = require("./hmrcOAuth");
Object.defineProperty(exports, "exchangeHMRCToken", { enumerable: true, get: function () { return hmrcOAuth_1.exchangeHMRCToken; } });
//# sourceMappingURL=index.js.map