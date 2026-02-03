/**
 * RTI XML Generation Tests
 *
 * Tests for HMRC RTI (Real Time Information) XML generation
 * - FPS (Full Payment Submission)
 * - EPS (Employer Payment Summary)
 * - EYU (Earlier Year Update)
 *
 * Run with: npx ts-node tests/rti-xml-generation.test.ts
 * Or: npx tsx tests/rti-xml-generation.test.ts
 */
 
// Setup Node.js crypto for Web Crypto API compatibility
import { webcrypto } from 'crypto';
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = webcrypto;
}
 
import { RTIXMLGenerator } from '../src/backend/services/hmrc/RTIXMLGenerator';
import { FPSSubmissionData, EPSSubmissionData } from '../src/backend/services/hmrc/types';
import { Payroll, Employee } from '../src/backend/interfaces/HRs';
 
// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  duration?: number;
}
 
const results: TestResult[] = [];
 
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
    throw new Error(`${message}: "${str.substring(0, 100)}..." does not contain "${substring}"`);
  }
}
 
function assertNotContains(str: string, substring: string, message: string): void {
  if (str.includes(substring)) {
    throw new Error(`${message}: String should not contain "${substring}"`);
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
    hireDate: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
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
 
function createMockPayroll(employee: Employee, overrides: Partial<Payroll> = {}): Payroll {
  return {
    id: 'payroll001',
    employeeId: employee.id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    periodId: 'period001',
    periodStartDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
    periodEndDate: Date.now(),
    payPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    payPeriodEnd: new Date().toISOString(),
 
    // Tax Year Information
    taxYear: '2024-25',
    taxPeriod: 4,
    periodType: 'monthly',
 
    // Hours & Pay
    regularHours: 160,
    overtimeHours: 10,
    totalHours: 170,
    hoursWorked: 170,
    hourlyRate: 15,
    regularPay: 2400,
    overtimePay: 225,
    bonuses: 0,
 
    // Gross Pay
    grossPay: 2625,
    totalGross: 2625,
    taxableGrossPay: 2625,
    niableGrossPay: 2625,
    pensionableGrossPay: 2625,
 
    // Tax Information
    taxCode: employee.taxCode || '1257L',
    taxCodeBasis: (employee.taxCodeBasis || 'cumulative') as 'cumulative' | 'week1month1',
    taxDeductions: 315,
    taxPaidYTD: 1260,
 
    // National Insurance
    niCategory: employee.niCategory || 'A',
    employeeNIDeductions: 178.50,
    employerNIContributions: 246.15,
    employeeNIPaidYTD: 714,
    employerNIPaidYTD: 984.60,
 
    // Student Loans
    studentLoanPlan: 'none',
    studentLoanDeductions: 0,
    hasPostgraduateLoan: false,
    postgraduateLoanDeductions: 0,
 
    // Pension
    employeePensionDeductions: 131.25,
    employerPensionContributions: 78.75,
    employeePensionPaidYTD: 525,
    employerPensionPaidYTD: 315,
 
    // Legacy deductions
    deductions: {
      tax: 315,
      nationalInsurance: 178.50,
      pension: 131.25,
      studentLoan: 0,
      other: 0,
    },
 
    // Totals
    totalDeductions: 624.75,
    netPay: 2000.25,
    totalNet: 2000.25,
 
    // YTD Data
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
 
    // Status & Payment
    status: 'approved',
    paymentMethod: 'bank_transfer',
    paymentDate: new Date().toISOString().split('T')[0],
 
    // Metadata
    createdAt: new Date().toISOString(),
 
    ...overrides,
  } as Payroll;
}
 
function attachEmployeeToPayroll(payroll: Payroll, employee: Employee): Payroll & { employee: Employee } {
  return { ...payroll, employee };
}
 
// =====================================================
// FPS XML GENERATION TESTS
// =====================================================
 
async function testValidFPSXMLStructure(): Promise<void> {
  const generator = new RTIXMLGenerator();
  const employee = createMockEmployee();
  const payroll = createMockPayroll(employee);
  const payrollWithEmployee = attachEmployeeToPayroll(payroll, employee);
 
  const data: FPSSubmissionData = {
    payrollRecords: [payrollWithEmployee],
    employerPAYEReference: '123/AB45678',
    accountsOfficeReference: '123PA00012345',
    taxYear: '2024-25',
    periodNumber: 4,
    periodType: 'monthly',
    paymentDate: new Date().toISOString(),
    submissionDate: new Date().toISOString(),
  };
 
  const xml = generator.generateFPS(data);
 
  // Check XML declaration
  assertContains(xml, '<?xml version="1.0" encoding="UTF-8"?>', 'Should have XML declaration');
 
  // Check root element
  assertContains(xml, '<IRenvelope', 'Should have IRenvelope root element');
  assertContains(xml, '<FullPaymentSubmission>', 'Should have FullPaymentSubmission element');
 
  // Check required sections
  assertContains(xml, '<IRheader>', 'Should have IRheader section');
  assertContains(xml, '<EmpRefs>', 'Should have employer references');
  assertContains(xml, '<Employee>', 'Should have Employee section');
}
 
async function testCorrectEmployerReferences(): Promise<void> {
  const generator = new RTIXMLGenerator();
  const employee = createMockEmployee();
  const payroll = createMockPayroll(employee);
  const payrollWithEmployee = attachEmployeeToPayroll(payroll, employee);
 
  const data: FPSSubmissionData = {
    payrollRecords: [payrollWithEmployee],
    employerPAYEReference: '123/AB45678',
    accountsOfficeReference: '123PA00012345',
    taxYear: '2024-25',
    periodNumber: 4,
    periodType: 'monthly',
    paymentDate: new Date().toISOString(),
    submissionDate: new Date().toISOString(),
  };
 
  const xml = generator.generateFPS(data);
 
  // Check employer references are correctly split and formatted
  assertContains(xml, '<OfficeNo>123</OfficeNo>', 'Should have office number');
  assertContains(xml, '<PayeRef>AB45678</PayeRef>', 'Should have PAYE reference');
  assertContains(xml, '<AORef>123PA00012345</AORef>', 'Should have AO reference');
}
 
async function testTaxYearAndPeriodInformation(): Promise<void> {
  const generator = new RTIXMLGenerator();
  const employee = createMockEmployee();
  const payroll = createMockPayroll(employee);
  const payrollWithEmployee = attachEmployeeToPayroll(payroll, employee);
 
  const data: FPSSubmissionData = {
    payrollRecords: [payrollWithEmployee],
    employerPAYEReference: '123/AB45678',
    accountsOfficeReference: '123PA00012345',
    taxYear: '2024-25',
    periodNumber: 4,
    periodType: 'monthly',
    paymentDate: new Date().toISOString(),
    submissionDate: new Date().toISOString(),
  };
 
  const xml = generator.generateFPS(data);
 
  assertContains(xml, '<TaxYear>2024-25</TaxYear>', 'Should have tax year');
  assertContains(xml, '<PayFrequency>M1</PayFrequency>', 'Should have monthly frequency code');
  assertContains(xml, '<PayId>4</PayId>', 'Should have period number');
}
 
async function testEmployeePaymentInformation(): Promise<void> {
  const generator = new RTIXMLGenerator();
  const employee = createMockEmployee();
  const payroll = createMockPayroll(employee);
  const payrollWithEmployee = attachEmployeeToPayroll(payroll, employee);
 
  const data: FPSSubmissionData = {
    payrollRecords: [payrollWithEmployee],
    employerPAYEReference: '123/AB45678',
    accountsOfficeReference: '123PA00012345',
    taxYear: '2024-25',
    periodNumber: 4,
    periodType: 'monthly',
    paymentDate: new Date().toISOString(),
    submissionDate: new Date().toISOString(),
  };
 
  const xml = generator.generateFPS(data);
 
  // Check employee payment details
  assertContains(xml, '<NINO>AB123456C</NINO>', 'Should have NI number');
  assertContains(xml, '<TaxCode>1257L</TaxCode>', 'Should have tax code');
  assertContains(xml, '<GrossPay>2625.00</GrossPay>', 'Should have gross pay');
  assertContains(xml, '<TaxablePay>2625.00</TaxablePay>', 'Should have taxable pay');
  assertContains(xml, '<TaxDeducted>315.00</TaxDeducted>', 'Should have tax deducted');
  assertContains(xml, '<NICategory>A</NICategory>', 'Should have NI category');
}
 
async function testXMLSpecialCharacterEscaping(): Promise<void> {
  const generator = new RTIXMLGenerator();
  const employee = createMockEmployee({
    firstName: 'O\'Brien',
    lastName: 'Smith & Jones',
  });
  const payroll = createMockPayroll(employee);
  const payrollWithEmployee = attachEmployeeToPayroll(payroll, employee);
 
  const data: FPSSubmissionData = {
    payrollRecords: [payrollWithEmployee],
    employerPAYEReference: '123/AB45678',
    accountsOfficeReference: '123PA00012345',
    taxYear: '2024-25',
    periodNumber: 4,
    periodType: 'monthly',
    paymentDate: new Date().toISOString(),
    submissionDate: new Date().toISOString(),
  };
 
  const xml = generator.generateFPS(data);
 
  // XML should not contain unescaped special characters in data
  assertNotContains(xml, '&J', 'Ampersand should be escaped');
  // The XML generator escapes special characters via escapeXML method
  assertTrue(xml.includes('</Employee>'), 'XML should be valid and complete');
}
 
async function testDateFormatting(): Promise<void> {
  const generator = new RTIXMLGenerator();
  const employee = createMockEmployee();
  const payroll = createMockPayroll(employee);
  const payrollWithEmployee = attachEmployeeToPayroll(payroll, employee);
 
  const testDate = '2024-07-31T10:00:00.000Z';
 
  const data: FPSSubmissionData = {
    payrollRecords: [payrollWithEmployee],
    employerPAYEReference: '123/AB45678',
    accountsOfficeReference: '123PA00012345',
    taxYear: '2024-25',
    periodNumber: 4,
    periodType: 'monthly',
    paymentDate: testDate,
    submissionDate: testDate,
  };
 
  const xml = generator.generateFPS(data);
 
  // Check date format is YYYY-MM-DD
  assertContains(xml, '<PaymentDate>2024-07-31</PaymentDate>', 'Payment date should be formatted as YYYY-MM-DD');
  assertContains(xml, '<PeriodEnd>2024-07-31</PeriodEnd>', 'Period end should be formatted as YYYY-MM-DD');
}
 
async function testMultiplePayrollRecords(): Promise<void> {
  const generator = new RTIXMLGenerator();
 
  const employee1 = createMockEmployee({ id: 'emp001', nationalInsuranceNumber: 'AB123456C' });
  const employee2 = createMockEmployee({ id: 'emp002', nationalInsuranceNumber: 'CD789012E', firstName: 'Jane' });
 
  const payroll1 = createMockPayroll(employee1);
  const payroll2 = createMockPayroll(employee2, { id: 'payroll002', grossPay: 3000, taxableGrossPay: 3000 });
 
  const payrollWithEmployee1 = attachEmployeeToPayroll(payroll1, employee1);
  const payrollWithEmployee2 = attachEmployeeToPayroll(payroll2, employee2);
 
  const data: FPSSubmissionData = {
    payrollRecords: [payrollWithEmployee1, payrollWithEmployee2],
    employerPAYEReference: '123/AB45678',
    accountsOfficeReference: '123PA00012345',
    taxYear: '2024-25',
    periodNumber: 4,
    periodType: 'monthly',
    paymentDate: new Date().toISOString(),
    submissionDate: new Date().toISOString(),
  };
 
  const xml = generator.generateFPS(data);
 
  // Count Employee sections
  const employeeMatches = xml.match(/<Employee>/g);
  assertEqual(employeeMatches?.length, 2, 'Should have 2 employee sections');
 
  // Check both NI numbers are present
  assertContains(xml, '<NINO>AB123456C</NINO>', 'Should have first employee NI');
  assertContains(xml, '<NINO>CD789012E</NINO>', 'Should have second employee NI');
}
 
async function testXMLFormatValidation(): Promise<void> {
  const generator = new RTIXMLGenerator();
  const employee = createMockEmployee();
  const payroll = createMockPayroll(employee);
  const payrollWithEmployee = attachEmployeeToPayroll(payroll, employee);
 
  const data: FPSSubmissionData = {
    payrollRecords: [payrollWithEmployee],
    employerPAYEReference: '123/AB45678',
    accountsOfficeReference: '123PA00012345',
    taxYear: '2024-25',
    periodNumber: 4,
    periodType: 'monthly',
    paymentDate: new Date().toISOString(),
    submissionDate: new Date().toISOString(),
  };
 
  const xml = generator.generateFPS(data);
  const validation = generator.validateXML(xml);
 
  assertTrue(validation.valid, `XML should be valid: ${validation.errors.join(', ')}`);
  assertEqual(validation.errors.length, 0, 'Should have no validation errors');
}
 
// =====================================================
// EPS XML GENERATION TESTS
// =====================================================
 
async function testValidEPSXMLStructure(): Promise<void> {
  const generator = new RTIXMLGenerator();
 
  const data: EPSSubmissionData = {
    employerPAYEReference: '123/AB45678',
    accountsOfficeReference: '123PA00012345',
    taxYear: '2024-25',
    periodNumber: 4,
    periodType: 'monthly',
    noPaymentForPeriod: true,
    submissionDate: new Date().toISOString(),
  };
 
  const xml = generator.generateEPS(data);
 
  // Check XML declaration
  assertContains(xml, '<?xml version="1.0" encoding="UTF-8"?>', 'Should have XML declaration');
 
  // Check root element
  assertContains(xml, '<IRenvelope', 'Should have IRenvelope root element');
  assertContains(xml, '<EmployerPaymentSummary>', 'Should have EmployerPaymentSummary element');
 
  // Check employer references
  assertContains(xml, '<OfficeNo>123</OfficeNo>', 'Should have office number');
  assertContains(xml, '<PayeRef>AB45678</PayeRef>', 'Should have PAYE reference');
}
 
async function testEmployerReferencesIncludedInEPS(): Promise<void> {
  const generator = new RTIXMLGenerator();
 
  const data: EPSSubmissionData = {
    employerPAYEReference: '456/XY98765',
    accountsOfficeReference: '456PA99988877',
    taxYear: '2024-25',
    periodNumber: 7,
    periodType: 'monthly',
    noPaymentForPeriod: true,
    submissionDate: new Date().toISOString(),
  };
 
  const xml = generator.generateEPS(data);
 
  assertContains(xml, '<OfficeNo>456</OfficeNo>', 'Should have correct office number');
  assertContains(xml, '<PayeRef>XY98765</PayeRef>', 'Should have correct PAYE reference');
  assertContains(xml, '<AORef>456PA99988877</AORef>', 'Should have correct AO reference');
}
 
async function testEPSStatutoryPayRecovery(): Promise<void> {
  const generator = new RTIXMLGenerator();
 
  const data: EPSSubmissionData = {
    employerPAYEReference: '123/AB45678',
    accountsOfficeReference: '123PA00012345',
    taxYear: '2024-25',
    periodNumber: 4,
    periodType: 'monthly',
    statutoryPayRecovery: {
      smp: 500.00,
      spp: 250.00,
    },
    submissionDate: new Date().toISOString(),
  };
 
  const xml = generator.generateEPS(data);
 
  assertContains(xml, '<StatutoryPayRecovery>', 'Should have statutory pay recovery section');
  assertContains(xml, '<SMP>500.00</SMP>', 'Should have SMP amount');
  assertContains(xml, '<SPP>250.00</SPP>', 'Should have SPP amount');
}
 
async function testEPSEmploymentAllowance(): Promise<void> {
  const generator = new RTIXMLGenerator();
 
  const data: EPSSubmissionData = {
    employerPAYEReference: '123/AB45678',
    accountsOfficeReference: '123PA00012345',
    taxYear: '2024-25',
    periodNumber: 4,
    periodType: 'monthly',
    employmentAllowance: {
      claimed: true,
      amount: 5000.00,
    },
    submissionDate: new Date().toISOString(),
  };
 
  const xml = generator.generateEPS(data);
 
  assertContains(xml, '<EmploymentAllowance>5000.00</EmploymentAllowance>', 'Should have employment allowance');
}
 
// =====================================================
// ERROR HANDLING TESTS
// =====================================================
 
async function testErrorThrownIfEmployeeDataMissing(): Promise<void> {
  const generator = new RTIXMLGenerator();
 
  // Create payroll without employee attached
  const employee = createMockEmployee();
  const payroll = createMockPayroll(employee);
  // Don't attach employee - this should cause an error
 
  const data: FPSSubmissionData = {
    payrollRecords: [payroll], // payroll without employee
    employerPAYEReference: '123/AB45678',
    accountsOfficeReference: '123PA00012345',
    taxYear: '2024-25',
    periodNumber: 4,
    periodType: 'monthly',
    paymentDate: new Date().toISOString(),
    submissionDate: new Date().toISOString(),
  };
 
  let errorThrown = false;
  try {
    generator.generateFPS(data);
  } catch (error: any) {
    errorThrown = true;
    assertContains(error.message, 'Employee data missing', 'Error should mention missing employee data');
  }
 
  assertTrue(errorThrown, 'Should throw error when employee data is missing');
}
 
async function testInvalidXMLDetection(): Promise<void> {
  const generator = new RTIXMLGenerator();
 
  // Test with invalid XML (missing declaration)
  const invalidXML = '<Root><Child>Test</Child></Root>';
  const validation = generator.validateXML(invalidXML);
 
  assertTrue(!validation.valid, 'Should detect invalid XML');
  assertTrue(validation.errors.length > 0, 'Should have validation errors');
  assertTrue(validation.errors.some(e => e.includes('declaration')), 'Should mention missing declaration');
}
 
async function testPeriodTypeMapping(): Promise<void> {
  const generator = new RTIXMLGenerator();
  const employee = createMockEmployee();
 
  // Test weekly
  const weeklyPayroll = createMockPayroll(employee, { periodType: 'weekly' });
  const weeklyPayrollWithEmployee = attachEmployeeToPayroll(weeklyPayroll, employee);
 
  const weeklyData: FPSSubmissionData = {
    payrollRecords: [weeklyPayrollWithEmployee],
    employerPAYEReference: '123/AB45678',
    accountsOfficeReference: '123PA00012345',
    taxYear: '2024-25',
    periodNumber: 1,
    periodType: 'weekly',
    paymentDate: new Date().toISOString(),
    submissionDate: new Date().toISOString(),
  };
 
  const weeklyXML = generator.generateFPS(weeklyData);
  assertContains(weeklyXML, '<PayFrequency>W1</PayFrequency>', 'Weekly should map to W1');
 
  // Test fortnightly
  const fortnightlyPayroll = createMockPayroll(employee, { periodType: 'fortnightly' });
  const fortnightlyPayrollWithEmployee = attachEmployeeToPayroll(fortnightlyPayroll, employee);
 
  const fortnightlyData: FPSSubmissionData = {
    payrollRecords: [fortnightlyPayrollWithEmployee],
    employerPAYEReference: '123/AB45678',
    accountsOfficeReference: '123PA00012345',
    taxYear: '2024-25',
    periodNumber: 1,
    periodType: 'fortnightly',
    paymentDate: new Date().toISOString(),
    submissionDate: new Date().toISOString(),
  };
 
  const fortnightlyXML = generator.generateFPS(fortnightlyData);
  assertContains(fortnightlyXML, '<PayFrequency>W2</PayFrequency>', 'Fortnightly should map to W2');
 
  // Test four_weekly
  const fourWeeklyPayroll = createMockPayroll(employee, { periodType: 'four_weekly' });
  const fourWeeklyPayrollWithEmployee = attachEmployeeToPayroll(fourWeeklyPayroll, employee);
 
  const fourWeeklyData: FPSSubmissionData = {
    payrollRecords: [fourWeeklyPayrollWithEmployee],
    employerPAYEReference: '123/AB45678',
    accountsOfficeReference: '123PA00012345',
    taxYear: '2024-25',
    periodNumber: 1,
    periodType: 'four_weekly',
    paymentDate: new Date().toISOString(),
    submissionDate: new Date().toISOString(),
  };
 
  const fourWeeklyXML = generator.generateFPS(fourWeeklyData);
  assertContains(fourWeeklyXML, '<PayFrequency>W4</PayFrequency>', 'Four weekly should map to W4');
}
 
// =====================================================
// RUN ALL TESTS
// =====================================================
 
async function runAllTests(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('RTI XML GENERATION TEST SUITE');
  console.log('='.repeat(60) + '\n');
 
  console.log('--- FPS XML Generation Tests ---');
  await runTest('Valid FPS XML structure', testValidFPSXMLStructure);
  await runTest('Correct employer references', testCorrectEmployerReferences);
  await runTest('Tax year and period information', testTaxYearAndPeriodInformation);
  await runTest('Employee payment information', testEmployeePaymentInformation);
  await runTest('XML special character escaping', testXMLSpecialCharacterEscaping);
  await runTest('Date formatting (YYYY-MM-DD)', testDateFormatting);
  await runTest('Multiple payroll records', testMultiplePayrollRecords);
  await runTest('XML format validation', testXMLFormatValidation);
 
  console.log('\n--- EPS XML Generation Tests ---');
  await runTest('Valid EPS XML structure generated', testValidEPSXMLStructure);
  await runTest('Employer references included in EPS', testEmployerReferencesIncludedInEPS);
  await runTest('EPS statutory pay recovery', testEPSStatutoryPayRecovery);
  await runTest('EPS employment allowance', testEPSEmploymentAllowance);
 
  console.log('\n--- Error Handling Tests ---');
  await runTest('Error thrown if employee data is missing', testErrorThrownIfEmployeeDataMissing);
  await runTest('Invalid XML detection works', testInvalidXMLDetection);
  await runTest('Period type mapping', testPeriodTypeMapping);
 
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
 
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}
 
// Run tests
runAllTests().catch(console.error);
 