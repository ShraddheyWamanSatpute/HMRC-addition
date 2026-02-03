/**
 * EPS Submission Tests
 *
 * Tests for HMRC EPS (Employer Payment Summary) submission via HMRCAPIClient
 *
 * Run with: npx ts-node tests/eps-submission.test.ts
 * Or: npx tsx tests/eps-submission.test.ts
 */
 
// Setup Node.js crypto for Web Crypto API compatibility
import { webcrypto } from 'crypto';
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = webcrypto;
}
 
import { HMRCAPIClient } from '../src/backend/services/hmrc/HMRCAPIClient';
import { RTIXMLGenerator } from '../src/backend/services/hmrc/RTIXMLGenerator';
import { EPSSubmissionData, EPSSubmissionResult } from '../src/backend/services/hmrc/types';
import { HMRCSettings } from '../src/backend/interfaces/Company';
 
// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  duration?: number;
}
 
const results: TestResult[] = [];
 
// Mock fetch for testing
let mockFetchCalls: { url: string; options: RequestInit }[] = [];
let mockFetchResponse: { ok: boolean; status: number; json: () => Promise<any> } | null = null;
 
// Save original fetch
const originalFetch = (global as any).fetch;
 
function mockFetch(response: { ok: boolean; status: number; json: () => Promise<any> }) {
  mockFetchCalls = [];
  mockFetchResponse = response;
  (global as any).fetch = async (url: string, options: RequestInit) => {
    mockFetchCalls.push({ url, options });
    return mockFetchResponse;
  };
}
 
function resetFetch() {
  mockFetchCalls = [];
  (global as any).fetch = originalFetch;
}
 
// Helper function to run a test
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    results.push({
      name,
      passed: true,
      details: 'Test passed',
      duration: Date.now() - start,
    });
    console.log(`✅ PASS: ${name} (${Date.now() - start}ms)`);
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      details: error.message || String(error),
      duration: Date.now() - start,
    });
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
  } finally {
    resetFetch();
  }
}
 
// Helper assertions
function assertEqual(actual: any, expected: any, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: Expected "${expected}", got "${actual}"`);
  }
}
 
function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}
 
function assertContains(str: string, substring: string, message: string): void {
  if (!str.includes(substring)) {
    throw new Error(`${message}: String does not contain "${substring}"`);
  }
}
 
// =====================================================
// TEST DATA FACTORIES
// =====================================================
 
function createMockHMRCSettings(overrides: Partial<HMRCSettings> = {}): HMRCSettings {
  return {
    employerPAYEReference: '123/AB45678',
    accountsOfficeReference: '123PA00012345',
    hmrcOfficeNumber: '123',
    hmrcEnvironment: 'sandbox',
    hmrcAccessToken: 'test_access_token',
    hmrcRefreshToken: 'test_refresh_token',
    hmrcTokenExpiry: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    isApprenticeshipLevyPayer: false,
    apprenticeshipLevyAllowance: 15000,
    apprenticeshipLevyRate: 0.005,
    claimsEmploymentAllowance: false,
    employmentAllowanceAmount: 5000,
    employmentAllowanceUsed: 0,
    connectedCompanies: [],
    hmrcPaymentDay: 22,
    hmrcPaymentMethod: 'bank_transfer',
    isRegisteredTroncOperator: false,
    currentTaxYear: '2024-25',
    fiscalYearEnd: '05-04',
    autoSubmitFPS: false,
    requireFPSApproval: true,
    fpsSubmissionLeadTime: 3,
    useSandboxForTesting: true,
    autoEnrolmentPostponement: 0,
    postponementLetterSent: false,
    yearEndRemindersSent: false,
    notifyBeforeFPSDeadline: true,
    notifyBeforePaymentDeadline: true,
    notificationLeadDays: 3,
    payrollRetentionYears: 6,
    autoArchiveOldRecords: false,
    createdAt: Date.now(),
    ...overrides,
  } as HMRCSettings;
}
 
function createEPSSubmissionData(overrides: Partial<EPSSubmissionData> = {}): EPSSubmissionData {
  return {
    employerPAYEReference: '123/AB45678',
    accountsOfficeReference: '123PA00012345',
    taxYear: '2024-25',
    periodNumber: 4,
    periodType: 'monthly',
    noPaymentForPeriod: true,
    submissionDate: new Date().toISOString(),
    ...overrides,
  };
}
 
// =====================================================
// AUTHENTICATION TESTS
// =====================================================
 
async function testRejectSubmissionWithoutOAuthToken(): Promise<void> {
  const client = new HMRCAPIClient();
  const settings = createMockHMRCSettings({ hmrcAccessToken: undefined });
  const data = createEPSSubmissionData();
 
  const result = await client.submitEPS(data, settings, 'company001', 'user001');
 
  assertEqual(result.success, false, 'Should fail without OAuth token');
  assertEqual(result.status, 'rejected', 'Status should be rejected');
  assertTrue(result.errors !== undefined && result.errors.length > 0, 'Should have errors');
  assertContains(result.errors![0].code, 'AUTH', 'Error code should be AUTH related');
}
 
// =====================================================
// SUBMISSION TESTS
// =====================================================
 
async function testSubmitEPSViaFirebaseFunctionsProxy(): Promise<void> {
  const client = new HMRCAPIClient();
  const settings = createMockHMRCSettings();
  const data = createEPSSubmissionData();
 
  mockFetch({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      submissionId: 'EPS-12345',
      correlationId: 'corr-67890',
      status: 'accepted',
      submittedAt: Date.now(),
    })
  });
 
  const result = await client.submitEPS(data, settings, 'company001', 'user001');
 
  assertEqual(result.success, true, 'Should succeed');
  assertEqual(result.status, 'accepted', 'Status should be accepted');
  assertEqual(result.submissionId, 'EPS-12345', 'Should have submission ID');
 
  // Verify the fetch was called
  assertTrue(mockFetchCalls.length > 0, 'Should make fetch call');
  assertContains(mockFetchCalls[0].url, 'submitRTI', 'Should call submitRTI endpoint');
}
 
async function testIncludeXMLPayloadInSubmission(): Promise<void> {
  const client = new HMRCAPIClient();
  const settings = createMockHMRCSettings();
  const data = createEPSSubmissionData();
 
  mockFetch({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      submissionId: 'EPS-12345',
      status: 'accepted',
      submittedAt: Date.now(),
    })
  });
 
  await client.submitEPS(data, settings, 'company001', 'user001');
 
  // Check the request body includes XML payload
  assertTrue(mockFetchCalls.length > 0, 'Should make fetch call');
  const body = JSON.parse(mockFetchCalls[0].options.body as string);
  assertTrue(body.xmlPayload !== undefined, 'Should include XML payload');
  assertContains(body.xmlPayload, '<?xml', 'XML payload should start with declaration');
  assertContains(body.xmlPayload, 'EmployerPaymentSummary', 'XML should be EPS');
}
 
async function testValidateXMLBeforeSubmission(): Promise<void> {
  const client = new HMRCAPIClient();
  const settings = createMockHMRCSettings();
  // Create valid EPS data - should pass validation
  const data = createEPSSubmissionData();
 
  mockFetch({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      submissionId: 'EPS-12345',
      status: 'accepted',
      submittedAt: Date.now(),
    })
  });
 
  const result = await client.submitEPS(data, settings, 'company001', 'user001');
 
  // Should succeed with valid data
  assertEqual(result.success, true, 'Should pass validation with valid data');
}
 
async function testIncludeFraudPreventionHeaders(): Promise<void> {
  const client = new HMRCAPIClient();
  const settings = createMockHMRCSettings();
  const data = createEPSSubmissionData();
 
  mockFetch({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      submissionId: 'EPS-12345',
      status: 'accepted',
      submittedAt: Date.now(),
    })
  });
 
  await client.submitEPS(data, settings, 'company001', 'user001');
 
  // Check the request body includes fraud prevention headers
  assertTrue(mockFetchCalls.length > 0, 'Should make fetch call');
  const body = JSON.parse(mockFetchCalls[0].options.body as string);
  assertTrue(body.fraudPreventionHeaders !== undefined, 'Should include fraud prevention headers');
  assertTrue(body.fraudPreventionHeaders['Gov-Client-Connection-Method'] !== undefined, 'Should have connection method');
}
 
async function testUseCorrectEnvironmentEndpoint(): Promise<void> {
  const client = new HMRCAPIClient();
 
  // Test sandbox
  let settings = createMockHMRCSettings({ hmrcEnvironment: 'sandbox' });
  let data = createEPSSubmissionData();
 
  mockFetch({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      submissionId: 'EPS-12345',
      status: 'accepted',
      submittedAt: Date.now(),
    })
  });
 
  await client.submitEPS(data, settings, 'company001', 'user001');
 
  assertTrue(mockFetchCalls.length > 0, 'Should make fetch call');
  let body = JSON.parse(mockFetchCalls[0].options.body as string);
  assertEqual(body.environment, 'sandbox', 'Should use sandbox environment');
 
  // Test production
  resetFetch();
  settings = createMockHMRCSettings({ hmrcEnvironment: 'production' });
  data = createEPSSubmissionData();
 
  mockFetch({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      submissionId: 'EPS-12345',
      status: 'accepted',
      submittedAt: Date.now(),
    })
  });
 
  await client.submitEPS(data, settings, 'company001', 'user001');
 
  assertTrue(mockFetchCalls.length > 0, 'Should make fetch call');
  body = JSON.parse(mockFetchCalls[0].options.body as string);
  assertEqual(body.environment, 'production', 'Should use production environment');
}
 
async function testIncludePeriodInformation(): Promise<void> {
  const generator = new RTIXMLGenerator();
  const data = createEPSSubmissionData({
    periodNumber: 7,
    periodType: 'monthly',
  });
 
  const xml = generator.generateEPS(data);
 
  // Check period information is included
  assertContains(xml, '<TaxYear>2024-25</TaxYear>', 'Should have tax year');
  // EPS uses PayId for period number
  assertContains(xml, '<PayId>7</PayId>', 'Should have period number');
}
 
async function testStatutoryPayRecoveryInformation(): Promise<void> {
  const generator = new RTIXMLGenerator();
  const data = createEPSSubmissionData({
    noPaymentForPeriod: false,
    statutoryPayRecovery: {
      smp: 500.00,
      spp: 250.00,
    },
  });
 
  const xml = generator.generateEPS(data);
 
  // Check statutory pay recovery is included
  assertContains(xml, '<StatutoryPayRecovery>', 'Should have statutory pay recovery section');
  assertContains(xml, '<SMP>500.00</SMP>', 'Should have SMP amount');
  assertContains(xml, '<SPP>250.00</SPP>', 'Should have SPP amount');
}
 
async function testHandleHMRCAPIRejection(): Promise<void> {
  const client = new HMRCAPIClient();
  const settings = createMockHMRCSettings();
  const data = createEPSSubmissionData();
 
  mockFetch({
    ok: false,
    status: 400,
    json: async () => ({
      success: false,
      status: 'rejected',
      errors: [{
        code: 'INVALID_PAYLOAD',
        message: 'Invalid XML payload'
      }]
    })
  });
 
  const result = await client.submitEPS(data, settings, 'company001', 'user001');
 
  assertEqual(result.success, false, 'Should fail on HMRC rejection');
  assertEqual(result.status, 'rejected', 'Status should be rejected');
}
 
async function testHandleNetworkErrors(): Promise<void> {
  const client = new HMRCAPIClient();
  const settings = createMockHMRCSettings();
  const data = createEPSSubmissionData();
 
  // Mock network error
  (global as any).fetch = async () => {
    throw new Error('Network error');
  };
 
  const result = await client.submitEPS(data, settings, 'company001', 'user001');
 
  assertEqual(result.success, false, 'Should fail on network error');
  assertEqual(result.status, 'rejected', 'Status should be rejected');
  assertTrue(result.errors !== undefined && result.errors.length > 0, 'Should have errors');
}
 
// =====================================================
// RUN ALL TESTS
// =====================================================
 
async function runAllTests(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('EPS SUBMISSION TEST SUITE');
  console.log('='.repeat(60) + '\n');
 
  console.log('--- Authentication Tests ---');
  await runTest('Reject submission without OAuth token', testRejectSubmissionWithoutOAuthToken);
 
  console.log('\n--- Submission Tests ---');
  await runTest('Submit EPS via Firebase Functions proxy', testSubmitEPSViaFirebaseFunctionsProxy);
  await runTest('Include XML payload in submission', testIncludeXMLPayloadInSubmission);
  await runTest('Validate XML before submission', testValidateXMLBeforeSubmission);
  await runTest('Include fraud prevention headers', testIncludeFraudPreventionHeaders);
  await runTest('Use correct environment endpoint', testUseCorrectEnvironmentEndpoint);
 
  console.log('\n--- XML Content Tests ---');
  await runTest('Include period information', testIncludePeriodInformation);
  await runTest('Include statutory pay recovery information', testStatutoryPayRecoveryInformation);
 
  console.log('\n--- Error Handling Tests ---');
  await runTest('Handle HMRC API rejection', testHandleHMRCAPIRejection);
  await runTest('Handle network errors', testHandleNetworkErrors);
 
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
 
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;
  const totalTime = results.reduce((acc, r) => acc + (r.duration || 0), 0);
 
  console.log(`\nTotal: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Total time: ${totalTime}ms`);
  console.log(`Pass rate: ${((passed / total) * 100).toFixed(1)}%`);
 
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.details}`);
      });
  } else {
    console.log('\n✅ All tests passed!');
  }
 
  console.log('\n' + '='.repeat(60));
 
  resetFetch();
 
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}
 
// Run tests
runAllTests().catch(console.error);