/**
 * Employee Data Encryption Test Suite
 * Tests encryption/decryption of sensitive employee data fields
 * 
 * Requirements Tested:
 * - National Insurance Number encryption
 * - Bank Details encryption (account number, routing number)
 * - Tax Code encryption
 * - P45 Data encryption
 * - Backward compatibility with plain text data
 * 
 * Run with: npx tsx tests/employee-data-encryption.test.ts
 */

import { encryptEmployeeData, decryptEmployeeData, encryptEmployeeDataArray, decryptEmployeeDataArray } from '../src/backend/utils/EmployeeDataEncryption'
import type { Employee } from '../src/backend/interfaces/HRs'

// Test configuration
const ENCRYPTION_KEY = 'test-encryption-key-minimum-32-characters-long'

/**
 * Get encryption key (mimics the function in EmployeeDataEncryption.ts)
 */
function getEncryptionKey(): string {
  return process.env.VITE_HMRC_ENCRYPTION_KEY || ENCRYPTION_KEY
}

/**
 * Test runner
 */
async function runTest(testName: string, testFn: () => Promise<void> | void): Promise<boolean> {
  try {
    await testFn()
    console.log(`✅ PASS: ${testName}`)
    return true
  } catch (error) {
    console.error(`❌ FAIL: ${testName}`)
    console.error('   Error:', error instanceof Error ? error.message : error)
    return false
  }
}

/**
 * Create a mock employee with sensitive data
 */
function createMockEmployee(): Employee {
  return {
    id: 'test-employee-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    departmentId: 'dept-1',
    hireDate: Date.now(),
    status: 'active',
    createdAt: Date.now(),
    // Sensitive fields
    nationalInsuranceNumber: 'AB123456C',
    bankDetails: {
      accountName: 'John Doe',
      accountNumber: '12345678',
      routingNumber: '12-34-56',
      bankName: 'Test Bank'
    },
    taxCode: '1257L',
    p45Data: {
      previousEmployerName: 'Previous Employer Ltd',
      previousEmployerPAYERef: '123/AB45678',
      leavingDate: Date.now() - 86400000,
      taxCodeAtLeaving: '1257L',
      payToDate: 50000,
      taxToDate: 10000
    }
  }
}

/**
 * Main test suite
 */
async function runAllTests() {
  console.log('='.repeat(60))
  console.log('Employee Data Encryption Test Suite')
  console.log('Tests encryption/decryption of sensitive employee data')
  console.log('='.repeat(60))

  let passed = 0
  let failed = 0

  // Test 1: Encrypt National Insurance Number
  const test1 = await runTest('Encrypt National Insurance Number', async () => {
    const employee = createMockEmployee()
    const encrypted = await encryptEmployeeData(employee)
    
    if (!encrypted.nationalInsuranceNumber || encrypted.nationalInsuranceNumber === employee.nationalInsuranceNumber) {
      throw new Error('NI number was not encrypted')
    }
    
    const decrypted = await decryptEmployeeData(encrypted as Employee)
    if (decrypted.nationalInsuranceNumber !== employee.nationalInsuranceNumber) {
      throw new Error(`NI number decryption failed. Expected: ${employee.nationalInsuranceNumber}, Got: ${decrypted.nationalInsuranceNumber}`)
    }
    
    console.log(`   Original: ${employee.nationalInsuranceNumber}`)
    console.log(`   Encrypted: ${encrypted.nationalInsuranceNumber.substring(0, 30)}...`)
    console.log(`   Decrypted: ${decrypted.nationalInsuranceNumber}`)
  })
  passed += test1 ? 1 : 0
  failed += test1 ? 0 : 1

  // Test 2: Encrypt Bank Account Number
  const test2 = await runTest('Encrypt Bank Account Number', async () => {
    const employee = createMockEmployee()
    const encrypted = await encryptEmployeeData(employee)
    
    if (!encrypted.bankDetails?.accountNumber || encrypted.bankDetails.accountNumber === employee.bankDetails?.accountNumber) {
      throw new Error('Account number was not encrypted')
    }
    
    const decrypted = await decryptEmployeeData(encrypted as Employee)
    if (decrypted.bankDetails?.accountNumber !== employee.bankDetails?.accountNumber) {
      throw new Error(`Account number decryption failed. Expected: ${employee.bankDetails?.accountNumber}, Got: ${decrypted.bankDetails?.accountNumber}`)
    }
    
    console.log(`   Original: ${employee.bankDetails?.accountNumber}`)
    console.log(`   Encrypted: ${encrypted.bankDetails?.accountNumber.substring(0, 30)}...`)
    console.log(`   Decrypted: ${decrypted.bankDetails?.accountNumber}`)
  })
  passed += test2 ? 1 : 0
  failed += test2 ? 0 : 1

  // Test 3: Encrypt Bank Routing Number
  const test3 = await runTest('Encrypt Bank Routing Number', async () => {
    const employee = createMockEmployee()
    const encrypted = await encryptEmployeeData(employee)
    
    if (!encrypted.bankDetails?.routingNumber || encrypted.bankDetails.routingNumber === employee.bankDetails?.routingNumber) {
      throw new Error('Routing number was not encrypted')
    }
    
    const decrypted = await decryptEmployeeData(encrypted as Employee)
    if (decrypted.bankDetails?.routingNumber !== employee.bankDetails?.routingNumber) {
      throw new Error(`Routing number decryption failed. Expected: ${employee.bankDetails?.routingNumber}, Got: ${decrypted.bankDetails?.routingNumber}`)
    }
    
    console.log(`   Original: ${employee.bankDetails?.routingNumber}`)
    console.log(`   Encrypted: ${encrypted.bankDetails?.routingNumber.substring(0, 30)}...`)
    console.log(`   Decrypted: ${decrypted.bankDetails?.routingNumber}`)
  })
  passed += test3 ? 1 : 0
  failed += test3 ? 0 : 1

  // Test 4: Encrypt Tax Code
  const test4 = await runTest('Encrypt Tax Code', async () => {
    const employee = createMockEmployee()
    const encrypted = await encryptEmployeeData(employee)
    
    if (!encrypted.taxCode || encrypted.taxCode === employee.taxCode) {
      throw new Error('Tax code was not encrypted')
    }
    
    const decrypted = await decryptEmployeeData(encrypted as Employee)
    if (decrypted.taxCode !== employee.taxCode) {
      throw new Error(`Tax code decryption failed. Expected: ${employee.taxCode}, Got: ${decrypted.taxCode}`)
    }
    
    console.log(`   Original: ${employee.taxCode}`)
    console.log(`   Encrypted: ${encrypted.taxCode.substring(0, 30)}...`)
    console.log(`   Decrypted: ${decrypted.taxCode}`)
  })
  passed += test4 ? 1 : 0
  failed += test4 ? 0 : 1

  // Test 5: Encrypt P45 Data
  const test5 = await runTest('Encrypt P45 Data', async () => {
    const employee = createMockEmployee()
    const encrypted = await encryptEmployeeData(employee)
    
    // P45 data should be stored as encrypted JSON string
    const p45Encrypted = (encrypted as any).p45DataEncrypted
    if (!p45Encrypted) {
      throw new Error('P45 data was not encrypted')
    }
    
    // Original p45Data should be removed
    if (encrypted.p45Data) {
      throw new Error('Original P45 data should be removed after encryption')
    }
    
    const decrypted = await decryptEmployeeData(encrypted as Employee)
    if (!decrypted.p45Data) {
      throw new Error('P45 data was not decrypted')
    }
    
    if (JSON.stringify(decrypted.p45Data) !== JSON.stringify(employee.p45Data)) {
      throw new Error('P45 data decryption failed - data mismatch')
    }
    
    console.log(`   Original: ${JSON.stringify(employee.p45Data).substring(0, 50)}...`)
    console.log(`   Encrypted: ${p45Encrypted.substring(0, 30)}...`)
    console.log(`   Decrypted: ${JSON.stringify(decrypted.p45Data).substring(0, 50)}...`)
  })
  passed += test5 ? 1 : 0
  failed += test5 ? 0 : 1

  // Test 6: Encrypt Employee with All Sensitive Fields
  const test6 = await runTest('Encrypt Employee with All Sensitive Fields', async () => {
    const employee = createMockEmployee()
    const encrypted = await encryptEmployeeData(employee)
    
    // Verify all sensitive fields are encrypted
    const hasEncryptedNI = encrypted.nationalInsuranceNumber && encrypted.nationalInsuranceNumber !== employee.nationalInsuranceNumber
    const hasEncryptedAccount = encrypted.bankDetails?.accountNumber && encrypted.bankDetails.accountNumber !== employee.bankDetails?.accountNumber
    const hasEncryptedRouting = encrypted.bankDetails?.routingNumber && encrypted.bankDetails.routingNumber !== employee.bankDetails?.routingNumber
    const hasEncryptedTaxCode = encrypted.taxCode && encrypted.taxCode !== employee.taxCode
    const hasEncryptedP45 = !!(encrypted as any).p45DataEncrypted
    
    if (!hasEncryptedNI || !hasEncryptedAccount || !hasEncryptedRouting || !hasEncryptedTaxCode || !hasEncryptedP45) {
      throw new Error('Not all sensitive fields were encrypted')
    }
    
    // Decrypt and verify
    const decrypted = await decryptEmployeeData(encrypted as Employee)
    
    if (decrypted.nationalInsuranceNumber !== employee.nationalInsuranceNumber ||
        decrypted.bankDetails?.accountNumber !== employee.bankDetails?.accountNumber ||
        decrypted.bankDetails?.routingNumber !== employee.bankDetails?.routingNumber ||
        decrypted.taxCode !== employee.taxCode ||
        JSON.stringify(decrypted.p45Data) !== JSON.stringify(employee.p45Data)) {
      throw new Error('Decryption failed - some fields do not match')
    }
    
    console.log(`   All sensitive fields encrypted and decrypted successfully`)
  })
  passed += test6 ? 1 : 0
  failed += test6 ? 0 : 1

  // Test 7: Non-Sensitive Fields Not Encrypted
  const test7 = await runTest('Non-Sensitive Fields Not Encrypted', async () => {
    const employee = createMockEmployee()
    const encrypted = await encryptEmployeeData(employee)
    
    // Non-sensitive fields should remain unchanged
    if (encrypted.firstName !== employee.firstName ||
        encrypted.lastName !== employee.lastName ||
        encrypted.email !== employee.email ||
        encrypted.departmentId !== employee.departmentId ||
        encrypted.bankDetails?.accountName !== employee.bankDetails?.accountName ||
        encrypted.bankDetails?.bankName !== employee.bankDetails?.bankName) {
      throw new Error('Non-sensitive fields were modified during encryption')
    }
    
    console.log(`   Non-sensitive fields remain unchanged ✅`)
  })
  passed += test7 ? 1 : 0
  failed += test7 ? 0 : 1

  // Test 8: Backward Compatibility - Plain Text Data
  const test8 = await runTest('Backward Compatibility - Plain Text Data', async () => {
    // Create employee with plain text (simulating existing data)
    const employee = createMockEmployee()
    
    // Decrypt should handle plain text gracefully
    const decrypted = await decryptEmployeeData(employee)
    
    // Plain text data should remain unchanged
    if (decrypted.nationalInsuranceNumber !== employee.nationalInsuranceNumber ||
        decrypted.bankDetails?.accountNumber !== employee.bankDetails?.accountNumber ||
        decrypted.bankDetails?.routingNumber !== employee.bankDetails?.routingNumber ||
        decrypted.taxCode !== employee.taxCode) {
      throw new Error('Plain text data was modified during decryption attempt')
    }
    
    console.log(`   Plain text data handled correctly (backward compatibility) ✅`)
  })
  passed += test8 ? 1 : 0
  failed += test8 ? 0 : 1

  // Test 9: Encrypt/Decrypt Employee Array
  const test9 = await runTest('Encrypt/Decrypt Employee Array', async () => {
    const employees = [
      createMockEmployee(),
      { ...createMockEmployee(), id: 'test-employee-2', nationalInsuranceNumber: 'CD789012D' },
      { ...createMockEmployee(), id: 'test-employee-3', taxCode: 'BR' }
    ]
    
    const encrypted = await encryptEmployeeDataArray(employees)
    const decrypted = await decryptEmployeeDataArray(encrypted as Employee[])
    
    if (decrypted.length !== employees.length) {
      throw new Error(`Array length mismatch. Expected: ${employees.length}, Got: ${decrypted.length}`)
    }
    
    for (let i = 0; i < employees.length; i++) {
      const original = employees[i]
      const dec = decrypted[i]
      
      if (dec.nationalInsuranceNumber !== original.nationalInsuranceNumber ||
          dec.taxCode !== original.taxCode) {
        throw new Error(`Employee ${i} decryption failed`)
      }
    }
    
    console.log(`   Successfully encrypted/decrypted ${employees.length} employees`)
  })
  passed += test9 ? 1 : 0
  failed += test9 ? 0 : 1

  // Test 10: Partial Employee Update (Only Some Fields)
  const test10 = await runTest('Partial Employee Update (Only Some Fields)', async () => {
    // Simulate updating only nationalInsuranceNumber
    const partialUpdate: Partial<Employee> = {
      nationalInsuranceNumber: 'EF345678G'
    }
    
    const encrypted = await encryptEmployeeData(partialUpdate)
    
    if (!encrypted.nationalInsuranceNumber || encrypted.nationalInsuranceNumber === partialUpdate.nationalInsuranceNumber) {
      throw new Error('Partial update NI number was not encrypted')
    }
    
    const decrypted = await decryptEmployeeData(encrypted as Employee)
    if (decrypted.nationalInsuranceNumber !== partialUpdate.nationalInsuranceNumber) {
      throw new Error('Partial update decryption failed')
    }
    
    console.log(`   Partial update encrypted/decrypted successfully`)
  })
  passed += test10 ? 1 : 0
  failed += test10 ? 0 : 1

  // Test 11: Employee Without Sensitive Data
  const test11 = await runTest('Employee Without Sensitive Data', async () => {
    const employee: Employee = {
      id: 'test-employee-4',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      departmentId: 'dept-1',
      hireDate: Date.now(),
      status: 'active',
      createdAt: Date.now()
      // No sensitive fields
    }
    
    const encrypted = await encryptEmployeeData(employee)
    const decrypted = await decryptEmployeeData(encrypted as Employee)
    
    // Should work without errors even if no sensitive data
    if (JSON.stringify(decrypted) !== JSON.stringify(employee)) {
      throw new Error('Employee without sensitive data was modified')
    }
    
    console.log(`   Employee without sensitive data handled correctly`)
  })
  passed += test11 ? 1 : 0
  failed += test11 ? 0 : 1

  // Test 12: Different Employees Produce Different Encrypted Values
  const test12 = await runTest('Different Employees Produce Different Encrypted Values', async () => {
    const employee1 = createMockEmployee()
    const employee2 = { ...createMockEmployee(), id: 'test-employee-5', nationalInsuranceNumber: 'GH901234H' }
    
    const encrypted1 = await encryptEmployeeData(employee1)
    const encrypted2 = await encryptEmployeeData(employee2)
    
    // Same field in different employees should produce different encrypted values (different IV)
    if (encrypted1.nationalInsuranceNumber === encrypted2.nationalInsuranceNumber) {
      throw new Error('Different NI numbers produced same encrypted value')
    }
    
    // Verify both can be decrypted correctly
    const decrypted1 = await decryptEmployeeData(encrypted1 as Employee)
    const decrypted2 = await decryptEmployeeData(encrypted2 as Employee)
    
    if (decrypted1.nationalInsuranceNumber !== employee1.nationalInsuranceNumber ||
        decrypted2.nationalInsuranceNumber !== employee2.nationalInsuranceNumber) {
      throw new Error('Decryption failed for different employees')
    }
    
    console.log(`   Different employees produce unique encrypted values ✅`)
  })
  passed += test12 ? 1 : 0
  failed += test12 ? 0 : 1

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('TEST RESULTS SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`Total: ${passed + failed}`)
  console.log('='.repeat(60))

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Employee data encryption is working correctly.')
    console.log()
    return true
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.')
    console.log()
    return false
  }
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1)
    })
    .catch((error) => {
      console.error('Fatal error running tests:', error)
      process.exit(1)
    })
}

export { runAllTests }

