/**
 * HMRC API Client
 * Main service for submitting RTI submissions to HMRC
 *
 * IMPORTANT COMPLIANCE NOTE:
 * All HMRC API calls MUST go through Firebase Functions (server-side proxy).
 * HMRC APIs do not support CORS, and credentials must never be exposed client-side.
 *
 * Reference: HMRC Development Practices, ICO Encryption Guidance
 */

import { functionsApp } from '../Firebase'
import { HMRCAuthService } from './HMRCAuthService'
import { FraudPreventionService } from './FraudPreventionService'
import { RTIXMLGenerator } from './RTIXMLGenerator'
import {
  FPSSubmissionData,
  EPSSubmissionData,
  EYUSubmissionData,
  FPSSubmissionResult,
  EPSSubmissionResult,
  EYUSubmissionResult,
} from './types'
import { HMRCSettings } from '../../interfaces/Company'

// Firebase Functions base URL
// In production, this should be configured via environment variables
const FUNCTIONS_BASE_URL = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL ||
  'https://us-central1-stop-test-8025f.cloudfunctions.net'

interface RTISubmissionResponse {
  success: boolean
  submissionId?: string
  correlationId?: string
  status: 'accepted' | 'rejected' | 'pending'
  errors?: Array<{ code: string; message: string }>
  warnings?: string[]
  submittedAt: number
  responseBody?: unknown
}

export class HMRCAPIClient {
  private authService: HMRCAuthService
  private fraudPreventionService: FraudPreventionService
  private xmlGenerator: RTIXMLGenerator

  constructor() {
    this.authService = new HMRCAuthService()
    this.fraudPreventionService = new FraudPreventionService()
    this.xmlGenerator = new RTIXMLGenerator()
  }

  /**
   * Submit FPS (Full Payment Submission) via Firebase Functions proxy
   */
  async submitFPS(
    data: FPSSubmissionData,
    hmrcSettings: HMRCSettings,
    companyId: string,
    userId?: string,
    siteId?: string,
    subsiteId?: string
  ): Promise<FPSSubmissionResult> {
    try {
      // 1. Validate we have required settings
      if (!hmrcSettings.hmrcAccessToken) {
        return {
          success: false,
          status: 'rejected',
          errors: [{
            code: 'AUTH_REQUIRED',
            message: 'HMRC OAuth authorization required. Please complete the OAuth flow first.'
          }],
          submittedAt: Date.now()
        }
      }

      // 2. Generate FPS XML
      const xml = this.xmlGenerator.generateFPS(data)

      // 3. Validate XML locally before sending
      const validation = this.xmlGenerator.validateXML(xml)
      if (!validation.valid) {
        return {
          success: false,
          status: 'rejected',
          errors: validation.errors.map(msg => ({
            code: 'VALIDATION_ERROR',
            message: msg
          })),
          submittedAt: Date.now()
        }
      }

      // 4. Get fraud prevention headers (collected client-side)
      const fraudHeaders = this.fraudPreventionService.generateHeaders(userId)

      // 5. Submit via Firebase Functions proxy
      const result = await this.submitViaProxy({
        type: 'FPS',
        companyId,
        siteId,
        subsiteId,
        employerPAYEReference: hmrcSettings.employerPAYEReference,
        accountsOfficeReference: hmrcSettings.accountsOfficeReference,
        environment: hmrcSettings.hmrcEnvironment || 'sandbox',
        xmlPayload: xml,
        accessToken: hmrcSettings.hmrcAccessToken,
        fraudPreventionHeaders: fraudHeaders
      })

      return result as FPSSubmissionResult
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error submitting FPS:', errorMessage)
      return {
        success: false,
        status: 'rejected',
        errors: [{
          code: 'EXCEPTION',
          message: errorMessage || 'Unknown error during FPS submission'
        }],
        submittedAt: Date.now()
      }
    }
  }

  /**
   * Submit EPS (Employer Payment Summary) via Firebase Functions proxy
   */
  async submitEPS(
    data: EPSSubmissionData,
    hmrcSettings: HMRCSettings,
    companyId: string,
    userId?: string,
    siteId?: string,
    subsiteId?: string
  ): Promise<EPSSubmissionResult> {
    try {
      // 1. Validate we have required settings
      if (!hmrcSettings.hmrcAccessToken) {
        return {
          success: false,
          status: 'rejected',
          errors: [{
            code: 'AUTH_REQUIRED',
            message: 'HMRC OAuth authorization required. Please complete the OAuth flow first.'
          }],
          submittedAt: Date.now()
        }
      }

      // 2. Generate EPS XML
      const xml = this.xmlGenerator.generateEPS(data)

      // 3. Validate XML locally before sending
      const validation = this.xmlGenerator.validateXML(xml)
      if (!validation.valid) {
        return {
          success: false,
          status: 'rejected',
          errors: validation.errors.map(msg => ({
            code: 'VALIDATION_ERROR',
            message: msg
          })),
          submittedAt: Date.now()
        }
      }

      // 4. Get fraud prevention headers (collected client-side)
      const fraudHeaders = this.fraudPreventionService.generateHeaders(userId)

      // 5. Submit via Firebase Functions proxy
      const result = await this.submitViaProxy({
        type: 'EPS',
        companyId,
        siteId,
        subsiteId,
        employerPAYEReference: hmrcSettings.employerPAYEReference,
        accountsOfficeReference: hmrcSettings.accountsOfficeReference,
        environment: hmrcSettings.hmrcEnvironment || 'sandbox',
        xmlPayload: xml,
        accessToken: hmrcSettings.hmrcAccessToken,
        fraudPreventionHeaders: fraudHeaders
      })

      return result as EPSSubmissionResult
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error submitting EPS:', errorMessage)
      return {
        success: false,
        status: 'rejected',
        errors: [{
          code: 'EXCEPTION',
          message: errorMessage || 'Unknown error during EPS submission'
        }],
        submittedAt: Date.now()
      }
    }
  }

  /**
   * Submit EYU (Earlier Year Update) via Firebase Functions proxy
   */
  async submitEYU(
    data: EYUSubmissionData,
    hmrcSettings: HMRCSettings,
    companyId: string,
    userId?: string,
    siteId?: string,
    subsiteId?: string
  ): Promise<EYUSubmissionResult> {
    try {
      // 1. Validate we have required settings
      if (!hmrcSettings.hmrcAccessToken) {
        return {
          success: false,
          status: 'rejected',
          errors: [{
            code: 'AUTH_REQUIRED',
            message: 'HMRC OAuth authorization required. Please complete the OAuth flow first.'
          }],
          submittedAt: Date.now()
        }
      }

      // 2. Generate EYU XML
      const xml = this.xmlGenerator.generateEYU(data)

      // 3. Validate XML locally before sending
      const validation = this.xmlGenerator.validateXML(xml)
      if (!validation.valid) {
        return {
          success: false,
          status: 'rejected',
          errors: validation.errors.map(msg => ({
            code: 'VALIDATION_ERROR',
            message: msg
          })),
          submittedAt: Date.now()
        }
      }

      // 4. Get fraud prevention headers (collected client-side)
      const fraudHeaders = this.fraudPreventionService.generateHeaders(userId)

      // 5. Submit via Firebase Functions proxy
      const result = await this.submitViaProxy({
        type: 'EYU',
        companyId,
        siteId,
        subsiteId,
        employerPAYEReference: hmrcSettings.employerPAYEReference,
        accountsOfficeReference: hmrcSettings.accountsOfficeReference,
        environment: hmrcSettings.hmrcEnvironment || 'sandbox',
        xmlPayload: xml,
        accessToken: hmrcSettings.hmrcAccessToken,
        fraudPreventionHeaders: fraudHeaders
      })

      return result as EYUSubmissionResult
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error submitting EYU:', errorMessage)
      return {
        success: false,
        status: 'rejected',
        errors: [{
          code: 'EXCEPTION',
          message: errorMessage || 'Unknown error during EYU submission'
        }],
        submittedAt: Date.now()
      }
    }
  }

  /**
   * Check submission status via Firebase Functions proxy
   */
  async checkSubmissionStatus(
    submissionId: string,
    hmrcSettings: HMRCSettings,
    companyId: string,
    userId?: string
  ): Promise<unknown> {
    try {
      if (!hmrcSettings.hmrcAccessToken) {
        throw new Error('HMRC OAuth authorization required')
      }

      const response = await fetch(`${FUNCTIONS_BASE_URL}/checkRTIStatus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId,
          employerPAYEReference: hmrcSettings.employerPAYEReference,
          environment: hmrcSettings.hmrcEnvironment || 'sandbox',
          accessToken: hmrcSettings.hmrcAccessToken,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      return result.status
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error checking submission status:', errorMessage)
      throw error
    }
  }

  /**
   * Get HMRC OAuth authorization URL
   * Uses Firebase Functions to keep client ID server-side
   */
  async getAuthorizationUrl(
    redirectUri: string,
    environment: 'sandbox' | 'production' = 'sandbox',
    scope: string = 'write:paye-employer-paye-employer'
  ): Promise<{ authUrl: string; state: string }> {
    try {
      const response = await fetch(`${FUNCTIONS_BASE_URL}/getHMRCAuthUrl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redirectUri,
          environment,
          scope,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      return {
        authUrl: result.authUrl,
        state: result.state,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error getting HMRC auth URL:', errorMessage)
      throw error
    }
  }

  /**
   * Exchange authorization code for tokens via Firebase Functions
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    environment: 'sandbox' | 'production' = 'sandbox'
  ): Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
    scope: string
  }> {
    try {
      const response = await fetch(`${FUNCTIONS_BASE_URL}/exchangeHMRCToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          redirectUri,
          environment,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      return result.tokens
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error exchanging HMRC code for tokens:', errorMessage)
      throw error
    }
  }

  /**
   * Refresh access token via Firebase Functions
   */
  async refreshAccessToken(
    refreshToken: string,
    environment: 'sandbox' | 'production' = 'sandbox'
  ): Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
    scope: string
  }> {
    try {
      const response = await fetch(`${FUNCTIONS_BASE_URL}/refreshHMRCToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken,
          environment,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      return result.tokens
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error refreshing HMRC token:', errorMessage)
      throw error
    }
  }

  /**
   * Submit RTI via Firebase Functions proxy
   * This is the main method that routes all HMRC submissions through server-side
   */
  private async submitViaProxy(request: {
    type: 'FPS' | 'EPS' | 'EYU'
    companyId: string
    siteId?: string
    subsiteId?: string
    employerPAYEReference: string
    accountsOfficeReference: string
    environment: 'sandbox' | 'production'
    xmlPayload: string
    accessToken: string
    fraudPreventionHeaders: Record<string, string>
  }): Promise<RTISubmissionResponse> {
    const response = await fetch(`${FUNCTIONS_BASE_URL}/submitRTI`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    })

    const result = await response.json()

    if (!response.ok && !result.success) {
      return {
        success: false,
        status: 'rejected',
        errors: result.errors || [{
          code: 'PROXY_ERROR',
          message: result.error || `HTTP ${response.status}`
        }],
        submittedAt: Date.now()
      }
    }

    return result as RTISubmissionResponse
  }

  /**
   * Check if HMRC OAuth is configured and valid
   */
  async isOAuthConfigured(hmrcSettings: HMRCSettings): Promise<boolean> {
    if (!hmrcSettings.hmrcAccessToken) {
      return false
    }

    // Check if token is expired
    if (hmrcSettings.hmrcTokenExpiry) {
      const now = Math.floor(Date.now() / 1000)
      const bufferSeconds = 300 // 5 minutes buffer
      if (hmrcSettings.hmrcTokenExpiry <= now + bufferSeconds) {
        // Token expired or about to expire
        if (hmrcSettings.hmrcRefreshToken) {
          // Can refresh
          return true
        }
        return false
      }
    }

    return true
  }

  /**
   * Get valid access token, refreshing if needed
   */
  async getValidAccessToken(
    hmrcSettings: HMRCSettings,
    onTokenRefresh?: (newTokens: {
      access_token: string
      refresh_token: string
      expires_in: number
    }) => Promise<void>
  ): Promise<string> {
    if (!hmrcSettings.hmrcAccessToken) {
      throw new Error('HMRC OAuth not configured')
    }

    // Check if token is expired or about to expire
    if (hmrcSettings.hmrcTokenExpiry) {
      const now = Math.floor(Date.now() / 1000)
      const bufferSeconds = 300 // 5 minutes buffer

      if (hmrcSettings.hmrcTokenExpiry <= now + bufferSeconds) {
        // Need to refresh
        if (!hmrcSettings.hmrcRefreshToken) {
          throw new Error('Token expired and no refresh token available')
        }

        const newTokens = await this.refreshAccessToken(
          hmrcSettings.hmrcRefreshToken,
          hmrcSettings.hmrcEnvironment || 'sandbox'
        )

        // Notify caller of new tokens so they can save them
        if (onTokenRefresh) {
          await onTokenRefresh(newTokens)
        }

        return newTokens.access_token
      }
    }

    return hmrcSettings.hmrcAccessToken
  }
}
