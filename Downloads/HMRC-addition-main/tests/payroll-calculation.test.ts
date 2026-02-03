/**
 * Payroll Calculation Tests
 *
 * Tests for UK PAYE payroll calculation engine
 * - Tax calculation (all tax codes)
 * - National Insurance (all categories)
 * - Student Loans
 * - Pension auto-enrolment
 *
 * Run with: npx ts-node tests/payroll-calculation.test.ts
 * Or: npx tsx tests/payroll-calculation.test.ts
 */
 
// Setup Node.js crypto for Web Crypto API compatibility
import { webcrypto } from 'crypto';
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = webcrypto;
}
 
import { PayrollEngine, createDefaultYTD, getDefaultTaxYearConfig } from '../src/backend/services/payroll/PayrollEngine';
import { TaxCalculationEngine } from '../src/backend/services/payroll/TaxCalculation';
import { NICalculationEngine } from '../src/backend/services/payroll/NICalculation';
import { StudentLoanCalculationEngine } from '../src/backend/services/payroll/StudentLoanCalculation';
import { PensionCalculationEngine } from '../src/backend/services/payroll/PensionCalculation';
import { PayrollCalculationInput, EmployeeYTDData } from '../src/backend/services/payroll/types';
import { Employee } from '../src/backend/interfaces/HRs';
import { TaxYearConfiguration } from '../src/backend/interfaces/Company';
 
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
 
function assertApproxEqual(actual: number, expected: number, tolerance: number, message: string): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}: Expected approximately ${expected}, got ${actual} (tolerance: ${tolerance})`);
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
    dateOfBirth: Date.now() - 35 * 365 * 24 * 60 * 60 * 1000, // 35 years old
    autoEnrolmentStatus: 'enrolled',
    pensionContributionPercentage: 5,
    ...overrides,
  } as Employee;
}
 
function createPayrollInput(
  employee: Employee,
  grossPay: number,
  periodNumber: number,
  ytdData?: EmployeeYTDData,
  overrides: Partial<PayrollCalculationInput> = {}
): PayrollCalculationInput {
  return {
    employee,
    grossPay,
    periodNumber,
    periodType: 'monthly',
    payPeriodStart: Date.now() - 30 * 24 * 60 * 60 * 1000,
    payPeriodEnd: Date.now(),
    taxYearConfig: getDefaultTaxYearConfig(),
    employeeYTD: ytdData || createDefaultYTD(),
    ...overrides,
  };
}
 
// =====================================================
// COMPLETE PAYROLL CALCULATION TESTS
// =====================================================
 
async function testCompletePayrollCalculation(): Promise<void> {
  const engine = new PayrollEngine();
  const employee = createMockEmployee();
  const input = createPayrollInput(employee, 3000, 1);
 
  const result = engine.calculatePayroll(input);
 
  assertTrue(result !== undefined, 'Should return a result');
  assertTrue(result.grossPayBeforeDeductions === 3000, 'Gross pay should match');
  assertTrue(result.netPay < result.grossPayBeforeDeductions, 'Net pay should be less than gross');
  assertTrue(result.totalDeductions > 0, 'Should have deductions');
}
 
async function testNetPayCalculation(): Promise<void> {
  const engine = new PayrollEngine();
  const employee = createMockEmployee();
  const input = createPayrollInput(employee, 3000, 1);
 
  const result = engine.calculatePayroll(input);
 
  // Net pay = Gross - Tax - NI - Pension
  const expectedNetPay = result.grossPayBeforeDeductions - result.totalDeductions;
  assertApproxEqual(result.netPay, expectedNetPay, 0.01, 'Net pay calculation should be correct');
}
 
async function testYTDFiguresUpdate(): Promise<void> {
  const engine = new PayrollEngine();
  const employee = createMockEmployee();
 
  // Start with some YTD values
  const initialYTD: EmployeeYTDData = {
    grossPayYTD: 6000,
    taxablePayYTD: 6000,
    taxPaidYTD: 500,
    niablePayYTD: 6000,
    employeeNIPaidYTD: 300,
    employerNIPaidYTD: 400,
    pensionablePayYTD: 6000,
    employeePensionYTD: 180,
    employerPensionYTD: 108,
    studentLoanPlan1YTD: 0,
    studentLoanPlan2YTD: 0,
    studentLoanPlan4YTD: 0,
    postgraduateLoanYTD: 0,
  };
 
  const input = createPayrollInput(employee, 3000, 3, initialYTD);
  const result = engine.calculatePayroll(input);
 
  // Check YTD values are updated
  assertTrue(result.updatedYTD.grossPayYTD > initialYTD.grossPayYTD, 'Gross YTD should increase');
  assertTrue(result.updatedYTD.taxPaidYTD >= initialYTD.taxPaidYTD, 'Tax YTD should not decrease');
}
 
// =====================================================
// TAX CALCULATION TESTS
// =====================================================
 
async function testStandardTaxCalculation(): Promise<void> {
  const engine = new TaxCalculationEngine();
  const employee = createMockEmployee({ taxCode: '1257L', taxCodeBasis: 'cumulative' });
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculateTax(employee, 3000, 1, 'monthly', config, ytd);
 
  assertTrue(result !== undefined, 'Should return a result');
  assertEqual(result.taxCode, '1257L', 'Tax code should match');
  assertTrue(result.taxDueThisPeriod >= 0, 'Tax should not be negative');
}
 
async function testBasicRateTaxCode(): Promise<void> {
  const engine = new TaxCalculationEngine();
  const employee = createMockEmployee({ taxCode: 'BR' });
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculateTax(employee, 2000, 1, 'monthly', config, ytd);
 
  assertEqual(result.taxCode, 'BR', 'Tax code should be BR');
  // BR is 20% flat rate
  assertApproxEqual(result.taxDueThisPeriod, 400, 1, 'Tax should be 20% of gross');
}
 
async function testHigherRateTaxCode(): Promise<void> {
  const engine = new TaxCalculationEngine();
  const employee = createMockEmployee({ taxCode: 'D0' });
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculateTax(employee, 2000, 1, 'monthly', config, ytd);
 
  assertEqual(result.taxCode, 'D0', 'Tax code should be D0');
  // D0 is 40% flat rate
  assertApproxEqual(result.taxDueThisPeriod, 800, 1, 'Tax should be 40% of gross');
}
 
async function testAdditionalRateTaxCode(): Promise<void> {
  const engine = new TaxCalculationEngine();
  const employee = createMockEmployee({ taxCode: 'D1' });
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculateTax(employee, 2000, 1, 'monthly', config, ytd);
 
  assertEqual(result.taxCode, 'D1', 'Tax code should be D1');
  // D1 is 45% flat rate
  assertApproxEqual(result.taxDueThisPeriod, 900, 1, 'Tax should be 45% of gross');
}
 
async function testNoTaxCode(): Promise<void> {
  const engine = new TaxCalculationEngine();
  const employee = createMockEmployee({ taxCode: 'NT' });
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculateTax(employee, 2000, 1, 'monthly', config, ytd);
 
  assertEqual(result.taxCode, 'NT', 'Tax code should be NT');
  assertEqual(result.taxDueThisPeriod, 0, 'Tax should be zero for NT code');
}
 
async function testScottishTaxCode(): Promise<void> {
  const engine = new TaxCalculationEngine();
  const employee = createMockEmployee({ taxCode: 'S1257L' });
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculateTax(employee, 3000, 1, 'monthly', config, ytd);
 
  // Scottish codes start with S
  assertTrue(result.taxCode.startsWith('S') || result.calculation.includes('Scottish'), 'Should use Scottish rates');
}
 
async function testWelshTaxCode(): Promise<void> {
  const engine = new TaxCalculationEngine();
  const employee = createMockEmployee({ taxCode: 'C1257L' });
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculateTax(employee, 3000, 1, 'monthly', config, ytd);
 
  // Welsh codes start with C
  assertTrue(result.taxCode.startsWith('C') || result.calculation.includes('Welsh'), 'Should use Welsh rates');
}
 
// =====================================================
// NATIONAL INSURANCE TESTS
// =====================================================
 
async function testNICategoryA(): Promise<void> {
  const engine = new NICalculationEngine();
  const employee = createMockEmployee({ niCategory: 'A' });
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculateNI(employee, 3000, 1, 'monthly', config, ytd);
 
  assertEqual(result.niCategory, 'A', 'NI category should be A');
  assertTrue(result.employeeNIThisPeriod > 0, 'Employee NI should be calculated');
  assertTrue(result.employerNIThisPeriod > 0, 'Employer NI should be calculated');
}
 
async function testNICategoryB(): Promise<void> {
  const engine = new NICalculationEngine();
  const employee = createMockEmployee({ niCategory: 'B' });
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculateNI(employee, 3000, 1, 'monthly', config, ytd);
 
  assertEqual(result.niCategory, 'B', 'NI category should be B');
  // Category B has reduced rates
  assertTrue(result.employeeNIThisPeriod >= 0, 'Employee NI should be calculated');
}
 
async function testNICategoryC(): Promise<void> {
  const engine = new NICalculationEngine();
  const employee = createMockEmployee({ niCategory: 'C' }); // Over state pension age
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculateNI(employee, 3000, 1, 'monthly', config, ytd);
 
  assertEqual(result.niCategory, 'C', 'NI category should be C');
  assertEqual(result.employeeNIThisPeriod, 0, 'Employee NI should be zero for category C');
  assertEqual(result.employerNIThisPeriod, 0, 'Employer NI should be zero for category C');
}
 
async function testNICategoryH(): Promise<void> {
  // Apprentice under 25
  const engine = new NICalculationEngine();
  const employee = createMockEmployee({
    niCategory: 'H',
    dateOfBirth: Date.now() - 22 * 365 * 24 * 60 * 60 * 1000, // 22 years old
  });
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculateNI(employee, 3000, 1, 'monthly', config, ytd);
 
  assertEqual(result.niCategory, 'H', 'NI category should be H');
  assertTrue(result.employeeNIThisPeriod >= 0, 'Employee NI should be calculated');
}
 
async function testDirectorNI(): Promise<void> {
  const engine = new NICalculationEngine();
  const employee = createMockEmployee({
    isDirector: true,
    directorNICalculationMethod: 'annual',
  });
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculateNI(employee, 5000, 1, 'monthly', config, ytd);
 
  assertTrue(result.isDirector, 'Should be marked as director');
  assertEqual(result.calculationMethod, 'annual', 'Should use annual calculation method');
}
 
// =====================================================
// STUDENT LOAN TESTS
// =====================================================
 
async function testNoStudentLoan(): Promise<void> {
  const engine = new StudentLoanCalculationEngine();
  const employee = createMockEmployee({ studentLoanPlan: 'none' });
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculateStudentLoan(employee, 3000, 'monthly', config, ytd);
 
  assertEqual(result.hasStudentLoan, false, 'Should not have student loan');
  assertEqual(result.totalDeduction, 0, 'Deduction should be zero');
}
 
async function testStudentLoanPlan1(): Promise<void> {
  const engine = new StudentLoanCalculationEngine();
  const employee = createMockEmployee({ studentLoanPlan: 'plan1' });
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculateStudentLoan(employee, 3000, 'monthly', config, ytd);
 
  assertEqual(result.hasStudentLoan, true, 'Should have student loan');
  assertTrue(result.plans.length > 0, 'Should have loan plans');
  assertEqual(result.plans[0].plan, 'plan1', 'Should be plan 1');
}
 
async function testStudentLoanPlan2(): Promise<void> {
  const engine = new StudentLoanCalculationEngine();
  const employee = createMockEmployee({ studentLoanPlan: 'plan2' });
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculateStudentLoan(employee, 3000, 'monthly', config, ytd);
 
  assertEqual(result.hasStudentLoan, true, 'Should have student loan');
  assertEqual(result.plans[0].plan, 'plan2', 'Should be plan 2');
}
 
async function testStudentLoanPlan4(): Promise<void> {
  const engine = new StudentLoanCalculationEngine();
  const employee = createMockEmployee({ studentLoanPlan: 'plan4' }); // Scotland
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculateStudentLoan(employee, 3000, 'monthly', config, ytd);
 
  assertEqual(result.hasStudentLoan, true, 'Should have student loan');
  assertEqual(result.plans[0].plan, 'plan4', 'Should be plan 4');
}
 
async function testPostgraduateLoan(): Promise<void> {
  const engine = new StudentLoanCalculationEngine();
  const employee = createMockEmployee({
    studentLoanPlan: 'none',
    hasPostgraduateLoan: true,
  });
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculateStudentLoan(employee, 3000, 'monthly', config, ytd);
 
  assertEqual(result.hasStudentLoan, true, 'Should have postgraduate loan');
  assertTrue(result.plans.some(p => p.plan === 'postgraduate'), 'Should have postgraduate plan');
}
 
// =====================================================
// PENSION CALCULATION TESTS
// =====================================================
 
async function testPensionEnrolled(): Promise<void> {
  const engine = new PensionCalculationEngine();
  const employee = createMockEmployee({
    autoEnrolmentStatus: 'enrolled',
    pensionContributionPercentage: 5,
  });
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculatePension(employee, 3000, 'monthly', config, ytd);
 
  assertTrue(result.isEnrolled, 'Should be enrolled');
  assertTrue(result.employeeContribution > 0, 'Employee contribution should be positive');
  assertTrue(result.employerContribution > 0, 'Employer contribution should be positive');
}
 
async function testPensionNotEnrolled(): Promise<void> {
  const engine = new PensionCalculationEngine();
  const employee = createMockEmployee({
    autoEnrolmentStatus: 'opted_out',
  });
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculatePension(employee, 3000, 'monthly', config, ytd);
 
  assertEqual(result.isEnrolled, false, 'Should not be enrolled');
  assertEqual(result.employeeContribution, 0, 'Employee contribution should be zero');
}
 
async function testPensionQualifyingEarnings(): Promise<void> {
  const engine = new PensionCalculationEngine();
  const employee = createMockEmployee({
    autoEnrolmentStatus: 'enrolled',
    pensionContributionPercentage: 5,
  });
  const config = getDefaultTaxYearConfig();
  const ytd = createDefaultYTD();
 
  const result = engine.calculatePension(employee, 3000, 'monthly', config, ytd);
 
  // Qualifying earnings are between lower and upper limits
  assertTrue(result.qualifyingEarnings > 0, 'Should have qualifying earnings');
  assertTrue(result.qualifyingEarnings <= 3000, 'Qualifying earnings should not exceed gross');
}
 
// =====================================================
// EDGE CASE TESTS
// =====================================================
 
async function testZeroGrossPay(): Promise<void> {
  const engine = new PayrollEngine();
  const employee = createMockEmployee();
  const input = createPayrollInput(employee, 0, 1);
 
  const result = engine.calculatePayroll(input);
 
  assertEqual(result.grossPayBeforeDeductions, 0, 'Gross should be zero');
  assertEqual(result.netPay, 0, 'Net pay should be zero');
}
 
async function testHighGrossPay(): Promise<void> {
  const engine = new PayrollEngine();
  const employee = createMockEmployee();
  const input = createPayrollInput(employee, 50000, 1);
 
  const result = engine.calculatePayroll(input);
 
  assertTrue(result.totalDeductions > 0, 'Should have deductions');
  assertTrue(result.netPay < result.grossPayBeforeDeductions, 'Net should be less than gross');
  assertTrue(result.netPay > 0, 'Net pay should be positive');
}
 
async function testValidationErrors(): Promise<void> {
  const engine = new PayrollEngine();
  const employee = createMockEmployee({
    nationalInsuranceNumber: 'invalid',
  });
  const input = createPayrollInput(employee, 3000, 1);
 
  const validation = engine.validateInput(input);
 
  assertTrue(!validation.valid, 'Should fail validation');
  assertTrue(validation.errors.length > 0, 'Should have errors');
}
 
async function testValidationWarnings(): Promise<void> {
  const engine = new PayrollEngine();
  const employee = createMockEmployee({
    taxCode: undefined,
    niCategory: undefined,
  });
  const input = createPayrollInput(employee, 3000, 1);
 
  const validation = engine.validateInput(input);
 
  // Should have warnings about missing tax code and NI category
  assertTrue(validation.warnings.length > 0, 'Should have warnings');
}
 
// =====================================================
// RUN ALL TESTS
// =====================================================
 
async function runAllTests(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('PAYROLL CALCULATION TEST SUITE');
  console.log('='.repeat(60) + '\n');
 
  console.log('--- Complete Payroll Calculation Tests ---');
  await runTest('Complete payroll calculation', testCompletePayrollCalculation);
  await runTest('Net pay calculation', testNetPayCalculation);
  await runTest('YTD figures update', testYTDFiguresUpdate);
 
  console.log('\n--- Tax Calculation Tests ---');
  await runTest('Standard tax calculation (1257L)', testStandardTaxCalculation);
  await runTest('Basic rate tax code (BR)', testBasicRateTaxCode);
  await runTest('Higher rate tax code (D0)', testHigherRateTaxCode);
  await runTest('Additional rate tax code (D1)', testAdditionalRateTaxCode);
  await runTest('No tax code (NT)', testNoTaxCode);
  await runTest('Scottish tax code (S1257L)', testScottishTaxCode);
  await runTest('Welsh tax code (C1257L)', testWelshTaxCode);
 
  console.log('\n--- National Insurance Tests ---');
  await runTest('NI Category A (standard)', testNICategoryA);
  await runTest('NI Category B (married women)', testNICategoryB);
  await runTest('NI Category C (over pension age)', testNICategoryC);
  await runTest('NI Category H (apprentice)', testNICategoryH);
  await runTest('Director NI (annual method)', testDirectorNI);
 
  console.log('\n--- Student Loan Tests ---');
  await runTest('No student loan', testNoStudentLoan);
  await runTest('Student loan Plan 1', testStudentLoanPlan1);
  await runTest('Student loan Plan 2', testStudentLoanPlan2);
  await runTest('Student loan Plan 4 (Scotland)', testStudentLoanPlan4);
  await runTest('Postgraduate loan', testPostgraduateLoan);
 
  console.log('\n--- Pension Calculation Tests ---');
  await runTest('Pension enrolled', testPensionEnrolled);
  await runTest('Pension not enrolled', testPensionNotEnrolled);
  await runTest('Pension qualifying earnings', testPensionQualifyingEarnings);
 
  console.log('\n--- Edge Case Tests ---');
  await runTest('Zero gross pay', testZeroGrossPay);
  await runTest('High gross pay', testHighGrossPay);
  await runTest('Validation errors', testValidationErrors);
  await runTest('Validation warnings', testValidationWarnings);
 
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