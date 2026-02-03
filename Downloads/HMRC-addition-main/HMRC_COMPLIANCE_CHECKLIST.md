# HMRC Payroll Compliance Checklist

**Project:** 1Stop Hospitality Software  
**Assessment Date:** October 23, 2025

## Overall Status: ❌ NOT COMPLIANT

**CRITICAL WARNING:** This system is NOT suitable for real-world UK payroll operations and must not be used until critical compliance features are implemented.

---

## Quick Summary

| Category | Status | Critical Issues |
|----------|--------|----------------|
| Employee Data | 🔴 NON-COMPLIANT | Missing tax code, NI category, starter declaration, student loan plan |
| Tax Calculation | 🔴 NON-COMPLIANT | Hardcoded rates, no cumulative calculation, wrong thresholds |
| NI Calculation | 🔴 NON-COMPLIANT | Single rate only, no category support, wrong for directors |
| Student Loans | 🔴 NOT IMPLEMENTED | No deductions for any plan type |
| HMRC RTI | 🔴 NOT IMPLEMENTED | No FPS/EPS submission capability |
| Payslips | 🔴 NOT COMPLIANT | Missing statutory required fields |
| Year-End | 🔴 NOT IMPLEMENTED | No P60, P45, P11D generation |
| Pensions | 🟡 PARTIAL | Basic deduction only, not auto-enrolment compliant |
| Statutory Pay | 🔴 NOT IMPLEMENTED | No SSP, SMP, SPP, etc. |
| Audit Trail | 🟠 INSUFFICIENT | Basic logging only |
| Data Security | 🟠 BASIC | No field encryption, limited access control |
| GDPR | 🟡 PARTIAL | Basic compliance, missing SAR automation |

---

## Employee Data Fields Checklist

### ✅ Present Fields
- [x] First Name, Last Name, Middle Name
- [x] National Insurance Number (field exists, but no validation)
- [x] Date of Birth
- [x] Address
- [x] Email, Phone
- [x] Hire Date
- [x] Employment Type
- [x] Salary/Hourly Rate
- [x] Bank Details

### ❌ Missing Critical Fields
- [ ] **Tax Code** (e.g., 1257L, BR, D0)
- [ ] Tax Code Basis (cumulative/week1month1)
- [ ] NI Category Letter (A, B, C, F, H, I, J, L, M, S, V, Z)
- [ ] Starter Declaration (A, B, C)
- [ ] Student Loan Plan (1, 2, 4, Postgraduate)
- [ ] Director Status
- [ ] Payment Frequency in Tax Year
- [ ] Irregular Employment Indicator
- [ ] P45 Data Capture (for new starters)
- [ ] Pension Opt-Out Status
- [ ] Auto-Enrolment Date
- [ ] Works/Payroll Number

---

## Tax Calculation Checklist

### ❌ Current Implementation Issues
- [ ] Hardcoded personal allowance (£1,048) - should be £1,047.50 for 2024/25
- [ ] Single tax rate (20%) - missing 40% and 45% rates
- [ ] No tax code processing
- [ ] No cumulative tax calculation
- [ ] No year-to-date tracking
- [ ] No Week 1/Month 1 (emergency tax) support
- [ ] No Scottish tax rates (19%, 20%, 21%, 42%, 47%)
- [ ] No Welsh tax rates
- [ ] No BR/D0/D1/K/NT tax codes

### ✅ Required Implementation
- [ ] Configurable tax bands and rates
- [ ] Cumulative tax calculation throughout tax year
- [ ] Tax code parsing and validation
- [ ] Support for all tax code types
- [ ] Year-to-date tax tracking
- [ ] Scottish and Welsh tax support
- [ ] Tax period tracking

---

## National Insurance Checklist

### ❌ Current Implementation Issues
- [ ] Single NI rate (12%) for all earnings
- [ ] No upper earnings limit consideration (should be 2% above £4,189/month)
- [ ] No NI category support (only standard calculation)
- [ ] Wrong calculation for directors (should be annual method)
- [ ] No employer NI calculation

### ✅ Required Implementation
- [ ] NI category A (standard)
- [ ] NI category B (married women reduced rate)
- [ ] NI category C (over state pension age - 0%)
- [ ] NI categories F, H, I, J, L, M, S, V, Z
- [ ] Director annual NI calculation method
- [ ] Employer NI calculation (13.8% above secondary threshold)
- [ ] Employment Allowance support

---

## Student Loan Deductions Checklist

### ❌ NOT IMPLEMENTED
- [ ] Plan 1: 9% over £22,015 annually
- [ ] Plan 2: 9% over £27,295 annually
- [ ] Plan 4: 9% over £27,660 annually
- [ ] Postgraduate Loan: 6% over £21,000 annually
- [ ] Support for multiple loan plans simultaneously
- [ ] Year-to-date tracking per plan

---

## HMRC RTI Submissions Checklist

### ❌ FPS (Full Payment Submission) - NOT IMPLEMENTED
- [ ] FPS XML generation
- [ ] Submit FPS after every payroll run
- [ ] Include all required employee data
- [ ] Track submission status
- [ ] Handle HMRC errors
- [ ] Resubmission capability
- [ ] Submission audit trail

### ❌ EPS (Employer Payment Summary) - NOT IMPLEMENTED
- [ ] EPS XML generation
- [ ] No payment periods reporting
- [ ] Statutory payment recovery
- [ ] Employment Allowance claims
- [ ] CIS deductions (if applicable)
- [ ] Apprenticeship Levy reporting

### ❌ HMRC Gateway Integration - NOT IMPLEMENTED
- [ ] OAuth 2.0 authentication
- [ ] Sandbox environment access
- [ ] Production environment access
- [ ] Fraud prevention headers (mandatory)
- [ ] API credentials management
- [ ] SSL/TLS certificate handling

### ❌ Fraud Prevention Headers - NOT IMPLEMENTED
All of these are MANDATORY:
- [ ] Gov-Client-Connection-Method
- [ ] Gov-Client-Device-ID
- [ ] Gov-Client-User-IDs
- [ ] Gov-Client-Timezone
- [ ] Gov-Client-Local-IPs
- [ ] Gov-Client-Screens
- [ ] Gov-Client-Window-Size
- [ ] Gov-Client-Browser-Plugins
- [ ] Gov-Client-Browser-JS-User-Agent
- [ ] Gov-Client-Browser-Do-Not-Track
- [ ] Gov-Client-Multi-Factor

---

## Payslip Requirements Checklist

### ✅ Present
- [x] Gross pay
- [x] Net pay
- [x] Employee name

### ❌ Missing Statutory Requirements
- [ ] Pay date
- [ ] Tax period number (e.g., "Month 6" or "Week 24")
- [ ] Tax code
- [ ] NI number
- [ ] NI category letter
- [ ] Number of hours worked (if pay varies by hours)
- [ ] Employer name and address
- [ ] Itemized variable deductions
- [ ] Fixed deductions total
- [ ] Year-to-date gross pay
- [ ] Year-to-date tax
- [ ] Year-to-date NI
- [ ] Year-to-date pension
- [ ] PDF generation
- [ ] Email delivery
- [ ] Secure archival storage

---

## Year-End Processing Checklist

### ❌ P60 - NOT IMPLEMENTED
- [ ] P60 generation (due 31 May)
- [ ] Tax year summary
- [ ] Total pay for year
- [ ] Total tax for year
- [ ] Total NI for year
- [ ] Employer and employee details
- [ ] Distribution to all employees employed on 5 April

### ❌ P45 - NOT IMPLEMENTED
- [ ] P45 generation when employee leaves
- [ ] Parts 1A, 2, 3
- [ ] Part 1A submission to HMRC (via final FPS)
- [ ] Parts 2 and 3 to employee
- [ ] Pay and tax to leaving date

### ❌ P11D - NOT IMPLEMENTED
- [ ] Benefits in kind tracking
- [ ] P11D form generation (due 6 July)
- [ ] P11D(b) employer NI calculation
- [ ] Employee copy distribution

### ❌ Year-End Reconciliation - NOT IMPLEMENTED
- [ ] Reconcile FPS submissions with payments
- [ ] Reconcile tax paid to HMRC
- [ ] Reconcile NI paid to HMRC
- [ ] Reconcile P60 totals

---

## Pension Auto-Enrolment Checklist

### 🟡 Current Implementation (NON-COMPLIANT)
- [x] Basic pension deduction (5% of gross pay)

### ❌ Missing Auto-Enrolment Requirements
- [ ] Qualifying earnings calculation (£6,240 - £50,270)
- [ ] Age criteria check (22 to State Pension age)
- [ ] Earnings threshold check (£10,000/year minimum)
- [ ] Automatic enrolment on eligibility
- [ ] Postponement period support (up to 3 months)
- [ ] Opt-out period tracking (1 month)
- [ ] Re-enrolment every 3 years
- [ ] Employer contribution calculation and tracking (3%)
- [ ] Pension scheme reference (PSTR)
- [ ] Integration with pension providers

### ❌ Pension Provider Integration - NOT IMPLEMENTED
- [ ] NEST file generation/API
- [ ] NOW: Pensions API
- [ ] The People's Pension API
- [ ] Smart Pension API
- [ ] Generic CSV export
- [ ] Contribution reconciliation

---

## Statutory Payments Checklist

### ❌ ALL NOT IMPLEMENTED
- [ ] Statutory Sick Pay (SSP) - £116.75/week
- [ ] Statutory Maternity Pay (SMP) - 90% for 6 weeks, then £184.03 for 33 weeks
- [ ] Statutory Paternity Pay (SPP) - £184.03/week for 2 weeks
- [ ] Statutory Adoption Pay (SAP)
- [ ] Shared Parental Pay (ShPP)
- [ ] Statutory Parental Bereavement Pay (SPBP)
- [ ] Recovery via EPS
- [ ] Sickness tracking
- [ ] Maternity/paternity leave tracking
- [ ] Qualifying criteria checks

---

## Hospitality-Specific Features Checklist

### 🟡 Partial Implementation
- [x] Tronc field in employee data
- [x] Service charge allocation logic exists

### ❌ Missing Tronc/Tips Compliance
- [ ] Separate tronc from salary in payroll
- [ ] Independent troncmaster setup
- [ ] NI exemption for tronc (if via independent scheme)
- [ ] HMRC tronc scheme registration
- [ ] Card tips vs cash tips tracking
- [ ] Service charge distribution reports
- [ ] Tronc allocation transparency

### ❌ Holiday Pay - NOT IMPLEMENTED
- [ ] 12.07% holiday pay accrual for hourly workers
- [ ] Holiday pay tracking
- [ ] Payment on termination
- [ ] Carry-over rules
- [ ] Statutory minimum compliance (28 days)

---

## Audit Trail & Compliance Checklist

### ⚠️ Basic Logging Only
- [x] CreatedAt/UpdatedAt timestamps
- [ ] Detailed payroll run logs (who, when, parameters, calculations)
- [ ] Employee record change history
- [ ] Tax code change audit
- [ ] Salary change authorization tracking
- [ ] Bank detail change logs
- [ ] HMRC submission logs (request/response)
- [ ] Data access logs (who viewed what, when)
- [ ] Correction/adjustment logs
- [ ] Authorization workflow logs

### ❌ Data Retention - NOT IMPLEMENTED
- [ ] 6-year retention policy for payroll records
- [ ] Automated archival after 6 years
- [ ] Secure deletion after retention period
- [ ] Retention register
- [ ] Regular retention reviews

---

## Security & GDPR Checklist

### ✅ Present
- [x] Firebase authentication
- [x] HTTPS encryption
- [x] Role-based permissions (basic)

### ❌ Missing Security Features
- [ ] Field-level encryption (NI numbers, bank details, salary)
- [ ] Multi-factor authentication (MFA) for payroll access
- [ ] IP whitelisting for payroll operations
- [ ] Session timeout enforcement
- [ ] Separate encryption keys for sensitive fields
- [ ] Key rotation policy

### ❌ Missing GDPR Features
- [ ] Subject Access Request (SAR) automation
- [ ] Data portability (employee data export)
- [ ] Right to rectification workflow
- [ ] Data breach detection and notification
- [ ] Privacy policy display
- [ ] Consent tracking
- [ ] Automated data deletion post-retention period

### ❌ Access Control Enhancement Needed
- [ ] Separation of duties (maker/checker)
- [ ] Field-level permissions
- [ ] Authorization limits
- [ ] Detailed access logs

---

## Banking Integration Checklist

### 🟡 Basic Bank Details Storage
- [x] Bank account number storage
- [x] Sort code storage

### ❌ Payment Processing - NOT IMPLEMENTED
- [ ] BACS payment file generation (Standard 18 format)
- [ ] Automated BACS submission scheduling
- [ ] Payment confirmation tracking
- [ ] Failed payment handling
- [ ] Bank statement reconciliation
- [ ] HMRC payment file generation
- [ ] Open Banking integration (optional)

---

## Reporting Checklist

### ✅ Basic Analytics
- [x] Some HR dashboard analytics

### ❌ Missing Statutory Reports
- [ ] P32 (Employer Payment Record) - monthly
- [ ] P35 (End of Year Summary) - annual
- [ ] P11 (Deductions Working Sheet) - per employee

### ❌ Missing Management Reports
- [ ] Payroll cost by department
- [ ] Payroll cost by location
- [ ] Headcount reports
- [ ] Average salary analysis
- [ ] Overtime analysis
- [ ] Statutory payment costs
- [ ] Pension contribution summary
- [ ] Tax/NI reconciliation reports

---

## Testing Checklist

### ❌ NOT STARTED
- [ ] Unit tests for tax calculations
- [ ] Unit tests for NI calculations
- [ ] Unit tests for student loan calculations
- [ ] Integration tests for HMRC submissions
- [ ] End-to-end payroll run tests
- [ ] Tax year-end testing
- [ ] Edge case testing (Week 53, directors, multiple jobs, etc.)
- [ ] Security testing
- [ ] Penetration testing
- [ ] HMRC sandbox testing
- [ ] User acceptance testing (UAT)
- [ ] Performance testing

---

## Configuration Checklist

### ❌ HMRC Settings - NOT CONFIGURED
- [ ] Employer PAYE reference
- [ ] Accounts Office Reference
- [ ] HMRC Office Number
- [ ] OAuth client credentials
- [ ] Sandbox vs production environment setting
- [ ] Apprenticeship Levy settings
- [ ] Employment Allowance claim status
- [ ] Tronc operator registration

### ❌ Tax Rate Configuration - HARDCODED
- [ ] Configurable tax year rates
- [ ] Personal allowance configuration
- [ ] Tax band configuration (England, Scotland, Wales)
- [ ] NI threshold configuration
- [ ] Student loan threshold configuration
- [ ] Statutory payment rates configuration
- [ ] Pension auto-enrolment limits configuration
- [ ] Annual rate update process

---

## Documentation Checklist

### ❌ NOT FOUND
- [ ] Payroll operator manual
- [ ] HMRC submission guide
- [ ] Year-end process documentation
- [ ] Employee self-service guide
- [ ] Compliance checklist for operators
- [ ] Business continuity plan
- [ ] Disaster recovery procedures
- [ ] Monthly/quarterly/annual task lists
- [ ] Error resolution guides
- [ ] Training materials

---

## Third-Party Integration Options

If building a compliant system is too complex, consider:

### UK Payroll API Providers
- [ ] **Xero Payroll** - £10-15/employee/month
- [ ] **BrightPay Connect** - £4-6/employee/month
- [ ] **Sage Payroll** - Custom pricing
- [ ] **Staffology** - £5-8/employee/month
- [ ] **QuickBooks Payroll** - £5-10/employee/month

### Integration Benefits
- ✅ Immediate HMRC compliance
- ✅ Automatic tax/NI updates
- ✅ Professional support
- ✅ Lower development cost
- ✅ Faster time to market
- ✅ Reduced liability

---

## Development Effort Estimate

### Custom Development (Full Compliance)
- **Timeline:** 24 weeks (6 months)
- **Team:** 2 senior developers
- **Cost:** £75,000 - £90,000
- **Ongoing:** Annual tax rate updates, compliance monitoring

### Third-Party Integration
- **Timeline:** 6-8 weeks
- **Team:** 1 developer
- **Cost:** £15,000 - £25,000 upfront
- **Ongoing:** £5-15/employee/month (~£7,200/year for 60 employees)

---

## Priority Action Items

### 🔴 CRITICAL - DO IMMEDIATELY
1. **Stop using this system for production payroll** (if currently in use)
2. Engage external payroll provider for current needs
3. Decide: Build vs. Buy (custom development vs. third-party integration)
4. Hire payroll compliance consultant
5. Register with HMRC Developer Hub (if building)

### 🟠 HIGH - DO WITHIN 1 MONTH
6. Implement NI number validation
7. Add tax code field to employee data
8. Add student loan plan field
9. Implement field-level encryption for sensitive data
10. Create detailed audit logging

### 🟡 MEDIUM - DO WITHIN 3 MONTHS
11. Implement correct tax calculation engine (backend)
12. Implement correct NI calculation engine
13. Implement year-to-date tracking
14. Implement statutory payslip generation
15. Begin HMRC RTI integration (if building)

---

## Risk Level Summary

| Risk | Level |
|------|-------|
| **Using current system for real payroll** | 🔴 CRITICAL - Will result in HMRC penalties |
| **Incorrect employee payments** | 🔴 CRITICAL - Legal liability |
| **Data breach** | 🟠 HIGH - Inadequate encryption |
| **GDPR non-compliance** | 🟠 HIGH - Missing data subject rights |
| **Year-end failure** | 🟠 HIGH - No P60/P45 capability |
| **Pension non-compliance** | 🟡 MEDIUM - Basic implementation only |

---

## Final Recommendation

### ⚠️ DO NOT USE FOR PRODUCTION PAYROLL

**This system requires substantial development to achieve HMRC compliance.**

### Recommended Path:

**Immediate (Now):**
→ Use established payroll provider (Xero, BrightPay, etc.)

**Short-term (3-6 months):**
→ Decide between full custom development or API integration
→ If custom: Complete critical compliance features (Phases 1-4)
→ If integration: Implement third-party payroll API

**Long-term (6-12 months):**
→ If custom: Complete all compliance features, extensive testing
→ If integration: Add custom hospitality features on top of compliant base

---

**Assessment Completed:** October 23, 2025  
**Assessor:** AI Code Analyst  
**Next Review:** After implementation of critical features  

---

*This checklist is based on UK payroll compliance requirements as of October 2025. Requirements may change. Always verify current HMRC guidance.*

