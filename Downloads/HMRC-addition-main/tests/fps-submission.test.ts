/**
 * FPS Submission Tests
 *
 * Tests for HMRC FPS (Full Payment Submission) submission via HMRCAPIClient
 *
 * Run with: npx ts-node tests/fps-submission.test.ts
 * Or: npx tsx tests/fps-submission.test.ts
 */
 
// Setup Node.js crypto for Web Crypto API compatibility
import { webcrypto } from 'crypto';
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = webcrypto;
}
 
import { HMRCAPIClient } from '../src/backend/services/hmrc/HMRCAPIClient';
import { RTIXMLGenerator } from '../src/backend/services/hmrc/RTIXMLGenerator';
import { FraudPreventionService } from '../src/backend/services/hmrc/FraudPreventionService';
import { FPSSubmissionData, FPSSubmissionResult } from '../src/backend/services/hmrc/types';
import { HMRCSettings } from '../src/backend/interfaces/Company';
import { Payroll, Employee } from '../src/backend/interfaces/HRs';
 
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
 
function createMockEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    departmentId: 'dept001',
    hireDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
    status: 'active',
    createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
    nationalInsuranceNumber: 'AB123456C',
    taxCode: '1257L',
    taxCodeBasis: 'cumulative',
    niCategory: 'A',
    employmentType: 'full_time',
    ...overrides,
  } as Employee;
}
 
function createMockPayroll(employee: Employee, overrides: Partial<Payroll> = {}): Payroll & { employee: Employee } {
  return {
    id: 'payroll001',
    employeeId: employee.id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    periodId: 'period001',
    periodStartDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
    periodEndDate: Date.now(),
    payPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    payPeriodEnd: new Date().toISOString(),
    taxYear: '2024-25',
    taxPeriod: 4,
    periodType: 'monthly',
    regularHours: 160,
    overtimeHours: 10,
    totalHours: 170,
    hoursWorked: 170,
    hourlyRate: 15,
    regularPay: 2400,
    overtimePay: 225,
    bonuses: 0,
    grossPay: 2625,
    totalGross: 2625,
    taxableGrossPay: 2625,
    niableGrossPay: 2625,
    pensionableGrossPay: 2625,
    taxCode: employee.taxCode || '1257L',
    taxCodeBasis: 'cumulative',
    taxDeductions: 315,
    taxPaidYTD: 1260,
    niCategory: employee.niCategory || 'A',
    employeeNIDeductions: 178.50,
    employerNIContributions: 246.15,
    employeeNIPaidYTD: 714,
    employerNIPaidYTD: 984.60,
    studentLoanPlan: 'none',
    studentLoanDeductions: 0,
    hasPostgraduateLoan: false,
    postgraduateLoanDeductions: 0,
    employeePensionDeductions: 131.25,
    employerPensionContributions: 78.75,
    employeePensionPaidYTD: 525,
    employerPensionPaidYTD: 315,
    deductions: {
      tax: 315,
      nationalInsurance: 178.50,
      pension: 131.25,
      studentLoan: 0,
      other: 0,
    },
    totalDeductions: 624.75,
    netPay: 2000.25,
    totalNet: 2000.25,
    ytdData: {
      grossPayYTD: 10500,
      taxablePayYTD: 10500,
      taxPaidYTD: 1260,
      niablePayYTD: 10500,
      employeeNIPaidYTD: 714,
      employerNIPaidYTD: 984.60,
      pensionablePayYTD: 10500,
      employeePensionYTD: 525,
      employerPensionYTD: 315,
    },
    status: 'approved',
    paymentMethod: 'bank_transfer',
    paymentDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    employee: employee,
    ...overrides,
  } as Payroll & { employee: Employee };
}
 
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
 
function createFPSSubmissionData(payroll: Payroll & { employee: Employee }): FPSSubmissionData {
  return {
    payrollRecords: [payroll],
    employerPAYEReference: '123/AB45678',
    accountsOfficeReference: '123PA00012345',
    taxYear: '2024-25',
    periodNumber: 4,
    periodType: 'monthly',
    paymentDate: new Date().toISOString(),
    submissionDate: new Date().toISOString(),
  };
}
 
// =====================================================
// AUTHENTICATION TESTS
// =====================================================
 
async function testRejectSubmissionWithoutOAuthToken(): Promise<void> {
  const client = new HMRCAPIClient();
  const employee = createMockEmployee();
  const payroll = createMockPayroll(employee);
  const settings = createMockHMRCSettings({ hmrcAccessToken: undefined });
  const data = createFPSSubmissionData(payroll);
 
  const result = await client.submitFPS(data, settings, 'company001', 'user001');
 
  assertEqual(result.success, false, 'Should fail without OAuth token');
  assertEqual(result.status, 'rejected', 'Status should be rejected');
  assertTrue(result.errors !== undefined && result.errors.length > 0, 'Should have errors');
  assertContains(result.errors![0].code, 'AUTH', 'Error code should be AUTH related');
}
 
// =====================================================
// SUBMISSION TESTS
// =====================================================
 
async function testSubmitFPSViaFirebaseFunctionsProxy(): Promise<void> {
  const client = new HMRCAPIClient();
  const employee = createMockEmployee();
  const payroll = createMockPayroll(employee);
  const settings = createMockHMRCSettings();
  const data = createFPSSubmissionData(payroll);
 
  mockFetch({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      submissionId: 'FPS-12345',
      correlationId: 'corr-67890',
      status: 'accepted',
      submittedAt: Date.now(),
    })
  });
 
  const result = await client.submitFPS(data, settings, 'company001', 'user001');
 
  assertEqual(result.success, true, 'Should succeed');
  assertEqual(result.status, 'accepted', 'Status should be accepted');
  assertEqual(result.submissionId, 'FPS-12345', 'Should have submission ID');
 
  // Verify the fetch was called
  assertTrue(mockFetchCalls.length > 0, 'Should make fetch call');
  assertContains(mockFetchCalls[0].url, 'submitRTI', 'Should call submitRTI endpoint');
}
 
async function testIncludeFraudPreventionHeaders(): Promise<void> {
  const client = new HMRCAPIClient();
  const employee = createMockEmployee();
  const payroll = createMockPayroll(employee);
  const settings = createMockHMRCSettings();
  const data = createFPSSubmissionData(payroll);
 
  mockFetch({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      submissionId: 'FPS-12345',
      status: 'accepted',
      submittedAt: Date.now(),
    })
  });
 
  await client.submitFPS(data, settings, 'company001', 'user001');
 
  // Check the request body includes fraud prevention headers
  assertTrue(mockFetchCalls.length > 0, 'Should make fetch call');
  const body = JSON.parse(mockFetchCalls[0].options.body as string);
  assertTrue(body.fraudPreventionHeaders !== undefined, 'Should include fraud prevention headers');
  assertTrue(body.fraudPreventionHeaders['Gov-Client-Connection-Method'] !== undefined, 'Should have connection method');
}
 
async function testHandleNetworkErrors(): Promise<void> {
  const client = new HMRCAPIClient();
  const employee = createMockEmployee();
  const payroll = createMockPayroll(employee);
  const settings = createMockHMRCSettings();
  const data = createFPSSubmissionData(payroll);
 
  // Mock network error
  (global as any).fetch = async () => {
    throw new Error('Network error');
  };
 
  const result = await client.submitFPS(data, settings, 'company001', 'user001');
 
  assertEqual(result.success, false, 'Should fail on network error');
  assertEqual(result.status, 'rejected', 'Status should be rejected');
  assertTrue(result.errors !== undefined && result.errors.length > 0, 'Should have errors');
}
 
async function testHandleHMRCAPIRejection(): Promise<void> {
  const client = new HMRCAPIClient();
  const employee = createMockEmployee();
  const payroll = createMockPayroll(employee);
  const settings = createMockHMRCSettings();
  const data = createFPSSubmissionData(payroll);
 
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
 
  const result = await client.submitFPS(data, settings, 'company001', 'user001');
 
  assertEqual(result.success, false, 'Should fail on HMRC rejection');
  assertEqual(result.status, 'rejected', 'Status should be rejected');
}
 
async function testValidateXMLBeforeSubmission(): Promise<void> {
  const client = new HMRCAPIClient();
  const employee = createMockEmployee({ nationalInsuranceNumber: undefined });
  const payroll = createMockPayroll(employee);
  const settings = createMockHMRCSettings();
  const data = createFPSSubmissionData(payroll);
 
  // The submission should fail during XML generation due to missing NI
  const result = await client.submitFPS(data, settings, 'company001', 'user001');
 
  assertEqual(result.success, false, 'Should fail validation');
}
 
async function testOnlySubmitViaServerSideProxy(): Promise<void> {
  const client = new HMRCAPIClient();
  const employee = createMockEmployee();
  const payroll = createMockPayroll(employee);
  const settings = createMockHMRCSettings();
  const data = createFPSSubmissionData(payroll);
 
  mockFetch({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      submissionId: 'FPS-12345',
      status: 'accepted',
      submittedAt: Date.now(),
    })
  });
 
  await client.submitFPS(data, settings, 'company001', 'user001');
 
  // Verify the fetch was made to Firebase Functions, not directly to HMRC
  assertTrue(mockFetchCalls.length > 0, 'Should make fetch call');
  assertContains(mockFetchCalls[0].url, 'cloudfunctions.net', 'Should call Firebase Functions');
  assertTrue(!mockFetchCalls[0].url.includes('api.service.hmrc.gov.uk'), 'Should NOT call HMRC directly');
}
 
async function testCorrectHMRCAPIEndpointSandbox(): Promise<void> {
  const client = new HMRCAPIClient();
  const employee = createMockEmployee();
  const payroll = createMockPayroll(employee);
  const settings = createMockHMRCSettings({ hmrcEnvironment: 'sandbox' });
  const data = createFPSSubmissionData(payroll);
 
  mockFetch({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      submissionId: 'FPS-12345',
      status: 'accepted',
      submittedAt: Date.now(),
    })
  });
 
  await client.submitFPS(data, settings, 'company001', 'user001');
 
  // Check the request body includes sandbox environment
  assertTrue(mockFetchCalls.length > 0, 'Should make fetch call');
  const body = JSON.parse(mockFetchCalls[0].options.body as string);
  assertEqual(body.environment, 'sandbox', 'Should use sandbox environment');
}
 
async function testCorrectHMRCAPIEndpointProduction(): Promise<void> {
  const client = new HMRCAPIClient();
  const employee = createMockEmployee();
  const payroll = createMockPayroll(employee);
  const settings = createMockHMRCSettings({ hmrcEnvironment: 'production' });
  const data = createFPSSubmissionData(payroll);
 
  mockFetch({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      submissionId: 'FPS-12345',
      status: 'accepted',
      submittedAt: Date.now(),
    })
  });
 
  await client.submitFPS(data, settings, 'company001', 'user001');
 
  // Check the request body includes production environment
  assertTrue(mockFetchCalls.length > 0, 'Should make fetch call');
  const body = JSON.parse(mockFetchCalls[0].options.body as string);
  assertEqual(body.environment, 'production', 'Should use production environment');
}
 
async function testIncludeXMLPayloadInSubmission(): Promise<void> {
  const client = new HMRCAPIClient();
  const employee = createMockEmployee();
  const payroll = createMockPayroll(employee);
  const settings = createMockHMRCSettings();
  const data = createFPSSubmissionData(payroll);
 
  mockFetch({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      submissionId: 'FPS-12345',
      status: 'accepted',
      submittedAt: Date.now(),
    })
  });
 
  await client.submitFPS(data, settings, 'company001', 'user001');
 
  // Check the request body includes XML payload
  assertTrue(mockFetchCalls.length > 0, 'Should make fetch call');
  const body = JSON.parse(mockFetchCalls[0].options.body as string);
  assertTrue(body.xmlPayload !== undefined, 'Should include XML payload');
  assertContains(body.xmlPayload, '<?xml', 'XML payload should start with declaration');
  assertContains(body.xmlPayload, 'FullPaymentSubmission', 'XML should be FPS');
}
 
async function testIncludeCompanyAndSiteInformation(): Promise<void> {
  const client = new HMRCAPIClient();
  const employee = createMockEmployee();
  const payroll = createMockPayroll(employee);
  const settings = createMockHMRCSettings();
  const data = createFPSSubmissionData(payroll);
 
  mockFetch({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      submissionId: 'FPS-12345',
      status: 'accepted',
      submittedAt: Date.now(),
    })
  });
 
  await client.submitFPS(data, settings, 'company001', 'user001', 'site001', 'subsite001');
 
  // Check the request body includes company and site info
  assertTrue(mockFetchCalls.length > 0, 'Should make fetch call');
  const body = JSON.parse(mockFetchCalls[0].options.body as string);
  assertEqual(body.companyId, 'company001', 'Should include company ID');
  assertEqual(body.siteId, 'site001', 'Should include site ID');
  assertEqual(body.subsiteId, 'subsite001', 'Should include subsite ID');
}
 
async function testIncludeAllRequiredHMRCHeaders(): Promise<void> {
  const client = new HMRCAPIClient();
  const employee = createMockEmployee();
  const payroll = createMockPayroll(employee);
  const settings = createMockHMRCSettings();
  const data = createFPSSubmissionData(payroll);
 
  mockFetch({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      submissionId: 'FPS-12345',
      status: 'accepted',
      submittedAt: Date.now(),
    })
  });
 
  await client.submitFPS(data, settings, 'company001', 'user001');
 
  // Check the request body includes all required HMRC headers
  assertTrue(mockFetchCalls.length > 0, 'Should make fetch call');
  const body = JSON.parse(mockFetchCalls[0].options.body as string);
 
  // Required fraud prevention headers
  const headers = body.fraudPreventionHeaders;
  assertTrue(headers['Gov-Client-Connection-Method'] !== undefined, 'Should have connection method');
  assertTrue(headers['Gov-Client-Device-ID'] !== undefined, 'Should have device ID');
  assertTrue(headers['Gov-Client-User-IDs'] !== undefined, 'Should have user IDs');
  assertTrue(headers['Gov-Client-Timezone'] !== undefined, 'Should have timezone');
 
  // Required submission fields
  assertTrue(body.accessToken !== undefined, 'Should have access token');
  assertTrue(body.employerPAYEReference !== undefined, 'Should have PAYE reference');
  assertTrue(body.accountsOfficeReference !== undefined, 'Should have AO reference');
}
 
// =====================================================
// RUN ALL TESTS
// =====================================================
 
async function runAllTests(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('FPS SUBMISSION TEST SUITE');
  console.log('='.repeat(60) + '\n');
 
  console.log('--- Authentication Tests ---');
  await runTest('Reject submission without OAuth token', testRejectSubmissionWithoutOAuthToken);
 
  console.log('\n--- Submission Tests ---');
  await runTest('Submit FPS via Firebase Functions proxy', testSubmitFPSViaFirebaseFunctionsProxy);
  await runTest('Include fraud prevention headers', testIncludeFraudPreventionHeaders);
  await runTest('Handle network errors', testHandleNetworkErrors);
  await runTest('Handle HMRC API rejection', testHandleHMRCAPIRejection);
  await runTest('Validate XML before submission', testValidateXMLBeforeSubmission);
  await runTest('Only submit via server-side proxy', testOnlySubmitViaServerSideProxy);
  await runTest('Use correct HMRC API endpoint (sandbox)', testCorrectHMRCAPIEndpointSandbox);
  await runTest('Use correct HMRC API endpoint (production)', testCorrectHMRCAPIEndpointProduction);
  await runTest('Include XML payload in submission', testIncludeXMLPayloadInSubmission);
  await runTest('Include company and site information', testIncludeCompanyAndSiteInformation);
  await runTest('Include all required HMRC headers', testIncludeAllRequiredHMRCHeaders);
 
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
 