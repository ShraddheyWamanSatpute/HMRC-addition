# HMRC Website Testing Guide

Complete guide to testing HMRC functionality (OAuth, RTI XML Generation, FPS Submission, EPS Submission, and Payroll Calculations) through the web interface.

---

## 🚀 Quick Start

### Step 1: Start the Development Server

```bash
# Start the main application
npm run dev

# Or if you need Firebase Functions emulator:
# (Windows)
.\start-dev-with-functions.ps1

# (Mac/Linux)
# Start Firebase Functions separately, then:
npm run dev
```

**Default URL:** `http://localhost:5173`

### Step 2: Log In to the Application

1. Navigate to `http://localhost:5173`
2. Log in with your account credentials
3. Make sure you have admin access to a company

---

## 📋 Testing Each Feature

### 1. ✅ Testing HMRC OAuth Connection

#### Location: HR → Settings → HMRC Integration Tab

**Steps:**

1. **Navigate to HMRC Settings:**
   - Click **HR** in the main menu
   - Click **Settings** (or go directly to HR Settings)
   - Select the **"HMRC Integration"** tab

2. **Configure Employer Information:**
   - Enter **PAYE Reference**: Format `123/AB45678` (e.g., `123/AB45678`)
   - Enter **Accounts Office Reference**: Format `123PA00012345` (e.g., `123PA00012345`)
   - The office number will be automatically extracted from the PAYE reference

3. **Set Environment:**
   - Select **Sandbox** (for testing) or **Production** (after conformance testing)
   - **Recommendation:** Always start with **Sandbox** for testing

4. **Connect to HMRC:**
   - Click the **"Connect to HMRC"** button
   - You'll be redirected to HMRC's authorization page
   - Log in with your Government Gateway credentials
   - Authorize the application
   - You'll be redirected back to the application
   - The connection status should show **"Connected"** ✅

5. **Verify Connection:**
   - Check the status chip at the top of the "HMRC Connection" card
   - Should display **"Connected"** with a green checkmark
   - Connection timestamp should be displayed

6. **Test Token Refresh:**
   - If the token expires, you'll see an **"Expired"** status
   - Click **"Refresh Token"** to renew the connection

**Expected Result:**
- ✅ OAuth tokens are stored securely
- ✅ Connection status shows "Connected"
- ✅ You can now submit RTI data to HMRC

---

### 2. ✅ Testing RTI XML Generation

#### Location: HR → Payroll Management → Create/Edit Payroll

**What's Being Tested:**
- XML generation for FPS (Full Payment Submission)
- XML generation for EPS (Employer Payment Summary)
- XML validation and formatting

**Steps:**

1. **Create a Payroll Run:**
   - Navigate to **HR** → **Payroll Management**
   - Click **"Create Payroll"** or **"Add Payroll"**
   - Fill in employee details:
     - Employee Name
     - National Insurance Number (e.g., `AB123456C`)
     - Tax Code (e.g., `1257L`)
     - NI Category (e.g., `A`)
     - Gross Pay
     - Payment Date
     - Period Number
     - Period Type (weekly/monthly/etc.)

2. **Complete Payroll Calculation:**
   - The system automatically calculates:
     - Tax deductions
     - National Insurance (Employee & Employer)
     - Student Loan deductions (if applicable)
     - Pension contributions
     - Net Pay
   - Review the calculations to verify accuracy

3. **Approve the Payroll:**
   - Click **"Approve"** on the payroll record
   - This marks it as ready for HMRC submission

**Behind the Scenes:**
- The system generates XML in the background
- XML is validated before being stored
- XML structure matches HMRC RTI requirements

**To View Generated XML:**
- Check the browser console (F12 → Console)
- XML generation logs will appear when processing payroll
- XML is generated when you submit to HMRC (next section)

**Expected Result:**
- ✅ Payroll calculations are correct
- ✅ All required fields are present
- ✅ XML will be generated correctly when submitting

---

### 3. ✅ Testing FPS (Full Payment Submission)

#### Location: HR → Settings → RTI Submission Tab

**Steps:**

1. **Navigate to RTI Submission:**
   - Go to **HR** → **Settings**
   - Click on the **"RTI Submission"** tab

2. **Select Payroll Records:**
   - You'll see a list of **approved payroll records**
   - Check the boxes next to the payrolls you want to submit
   - You can select multiple payrolls for batch submission
   - Or click **"Select All"** to select all approved payrolls

3. **Review Payroll Information:**
   - Each row shows:
     - Employee Name
     - Payment Period
     - Gross Pay
     - Net Pay
     - Status

4. **Submit FPS:**
   - Click the **"Submit FPS (X)"** button (where X is the number of selected payrolls)
   - The system will:
     - Generate XML for each selected payroll
     - Validate the XML
     - Submit to HMRC via Firebase Functions
     - Show submission status

5. **View Submission Status:**
   - A success message will appear if submission is successful
   - An error message will appear if there are issues
   - Check the submission history (if available) to see past submissions

**Expected Result:**
- ✅ Selected payrolls are submitted to HMRC
- ✅ XML is generated and validated
- ✅ Submission status is displayed
- ✅ Payroll records are marked as submitted

**Error Handling:**
- If XML validation fails, you'll see validation errors
- If OAuth token is expired, you'll be prompted to refresh
- If network error occurs, you'll see an error message

---

### 4. ✅ Testing EPS (Employer Payment Summary)

#### Location: HR → Settings → RTI Submission Tab

**Steps:**

1. **Navigate to RTI Submission:**
   - Go to **HR** → **Settings**
   - Click on the **"RTI Submission"** tab

2. **Open EPS Submission Dialog:**
   - Click the **"Submit EPS"** button
   - An EPS submission dialog will open

3. **Fill in EPS Details:**
   - **Period Number**: Enter the period number (1-12 for monthly)
   - **Period Type**: Select (Weekly/Monthly/Fortnightly/Four Weekly)
   - **Tax Year**: Should auto-populate (e.g., `2024-25`)
   - **No Payment for Period**: Check if there were no payments this period
   - **Employment Allowance**: 
     - Check if claiming Employment Allowance
     - Enter the amount (typically £5,000)
   - **Statutory Pay Recovery** (if applicable):
     - Statutory Maternity Pay (SMP)
     - Statutory Paternity Pay (SPP)
     - Statutory Adoption Pay (SAP)
   - **Apprenticeship Levy** (if applicable):
     - Enter levy amount
     - Enter allowance (typically £15,000)

4. **Submit EPS:**
   - Click **"Submit EPS"** button in the dialog
   - The system will:
     - Generate EPS XML
     - Validate the XML
     - Submit to HMRC
     - Show submission status

5. **View Submission Status:**
   - Success/error message will be displayed
   - Submission details will be logged

**Expected Result:**
- ✅ EPS XML is generated correctly
- ✅ EPS is submitted to HMRC
- ✅ Submission status is displayed
- ✅ Submission is recorded

---

### 5. ✅ Testing Payroll Calculations

#### Location: HR → Payroll Management → Create/Edit Payroll

**What's Being Tested:**
- Tax calculations (PAYE)
- National Insurance calculations (Employee & Employer)
- Student Loan deductions
- Pension calculations
- Year-to-Date (YTD) calculations

**Steps:**

1. **Create a Test Payroll:**
   - Navigate to **HR** → **Payroll Management**
   - Click **"Create Payroll"** or **"Add Payroll"**

2. **Enter Employee Information:**
   - **Employee**: Select an employee (or enter manually)
   - **Tax Code**: Enter (e.g., `1257L` for standard allowance)
   - **NI Category**: Select (typically `A` for standard employee)
   - **Student Loan**: Select plan if applicable (Plan 1, Plan 2, Plan 4)
   - **Pension**: Indicate if employee is enrolled

3. **Enter Payment Details:**
   - **Gross Pay**: Enter the gross pay amount (e.g., `2500.00`)
   - **Period Type**: Select (Weekly/Monthly/etc.)
   - **Period Number**: Enter (1-52 for weekly, 1-12 for monthly)
   - **Payment Date**: Select the payment date

4. **View Calculated Deductions:**
   - The system automatically calculates:
     - **Tax Deductions**: Based on tax code and tax year rates
     - **Employee NI**: Based on NI category and thresholds
     - **Employer NI**: Calculated separately
     - **Student Loan**: If applicable (9% of earnings above threshold)
     - **Pension**: Employee and employer contributions
     - **Total Deductions**: Sum of all deductions
     - **Net Pay**: Gross pay minus total deductions

5. **Verify Calculations:**
   - Check that tax calculations match HMRC rates
   - Verify NI calculations for the current tax year
   - Confirm student loan deductions (if applicable)
   - Review YTD figures (if this is not the first payroll)

6. **Test Different Scenarios:**
   - **Basic Rate Taxpayer**: Low gross pay (<£50,270 annually)
   - **Higher Rate Taxpayer**: High gross pay (£50,270-£125,140)
   - **Additional Rate Taxpayer**: Very high gross pay (>£125,140)
   - **Director NI**: Different NI calculation method
   - **Category C NI**: Over state pension age (no NI)
   - **Student Loans**: Different plans (1, 2, 4)
   - **Postgraduate Loans**: 6% deduction

**Expected Results:**
- ✅ Tax calculations match HMRC PAYE rates
- ✅ NI calculations are correct for the category
- ✅ Student loan deductions are accurate
- ✅ Pension calculations follow auto-enrolment rules
- ✅ YTD figures accumulate correctly
- ✅ Net pay calculation is correct

**Verification Tips:**
- Compare with HMRC's PAYE calculator
- Check against tax year rates (2024-25)
- Verify NI thresholds and rates
- Confirm student loan thresholds

---

## 🔍 Advanced Testing Scenarios

### Test XML Generation Directly

1. **Open Browser Console** (F12 → Console)
2. **Create/Approve a Payroll** (as above)
3. **Submit FPS** (as above)
4. **Check Console Logs** for XML generation output
5. **Verify XML Structure** matches HMRC schema

### Test Error Handling

1. **Submit without OAuth:**
   - Disconnect HMRC connection
   - Try to submit FPS
   - Should see "OAuth authorization required" error

2. **Submit Invalid Data:**
   - Create payroll with missing NI number
   - Try to submit
   - Should see validation errors

3. **Test Network Errors:**
   - Disconnect internet
   - Try to submit
   - Should see network error message

---

## 📊 Testing Checklist

### HMRC OAuth ✅
- [ ] Can configure PAYE reference
- [ ] Can configure Accounts Office reference
- [ ] Can connect to HMRC (Sandbox)
- [ ] Connection status displays correctly
- [ ] Can refresh expired tokens
- [ ] OAuth callback works correctly

### RTI XML Generation ✅
- [ ] XML is generated for FPS submissions
- [ ] XML is generated for EPS submissions
- [ ] XML includes all required fields
- [ ] XML is properly formatted
- [ ] XML special characters are escaped
- [ ] XML dates are formatted correctly (YYYY-MM-DD)

### FPS Submission ✅
- [ ] Can select multiple payroll records
- [ ] Can submit FPS batch
- [ ] Submission status is displayed
- [ ] Errors are handled gracefully
- [ ] Submitted payrolls are marked correctly

### EPS Submission ✅
- [ ] Can open EPS submission dialog
- [ ] Can enter EPS details
- [ ] Can submit EPS
- [ ] Submission status is displayed
- [ ] Employment Allowance is included correctly
- [ ] Statutory pay recovery is included correctly

### Payroll Calculations ✅
- [ ] Tax calculations are correct
- [ ] NI calculations are correct
- [ ] Student loan deductions are correct
- [ ] Pension calculations are correct
- [ ] YTD figures accumulate correctly
- [ ] Net pay is calculated correctly

---

## 🐛 Troubleshooting

### "HMRC settings not configured"
**Solution:** Go to HR → Settings → HMRC Integration tab and configure employer references

### "OAuth is not configured"
**Solution:** The platform administrator needs to set up HMRC API credentials in Firebase Secrets

### "Token expired"
**Solution:** Click "Refresh Token" button in HMRC Integration tab

### "XML validation failed"
**Solution:** Check that all required employee fields are filled (NI number, tax code, etc.)

### "Submission rejected by HMRC"
**Solution:** 
- Check the error message for details
- Verify all data is correct
- Ensure using Sandbox environment for testing
- Check that PAYE reference format is correct

### "Network error"
**Solution:**
- Check internet connection
- Verify Firebase Functions are running (if using emulator)
- Check browser console for detailed errors

---

## 📝 Notes

### Sandbox vs Production

- **Sandbox**: Use for testing (no real data submitted to HMRC)
- **Production**: Only use after HMRC conformance testing approval

### Test Data Requirements

For Sandbox testing, you can use:
- **PAYE Reference**: Any format like `123/AB45678`
- **Accounts Office Reference**: Any format like `123PA00012345`
- **Employee NI Numbers**: Any valid format (e.g., `AB123456C`)
- **Test OAuth**: HMRC Sandbox provides test credentials

### Data Validation

The system validates:
- PAYE reference format (`###/AB######`)
- Accounts Office reference format
- Employee NI number format
- Tax code format
- XML structure before submission

---

## ✅ Success Criteria

You've successfully tested HMRC functionality if:

1. ✅ Can connect to HMRC via OAuth
2. ✅ Can configure all HMRC settings
3. ✅ Can generate and view payroll calculations
4. ✅ Can submit FPS for approved payrolls
5. ✅ Can submit EPS with correct information
6. ✅ All calculations are accurate
7. ✅ Error handling works correctly
8. ✅ Submission status is displayed

---

## 🚀 Next Steps

1. **Complete HMRC Conformance Testing:**
   - Submit test data in Sandbox
   - Get approval from HMRC
   - Switch to Production environment

2. **Set Up Auto-Submission:**
   - Enable "Auto-submit FPS after payroll approval"
   - Configure submission lead time
   - Set up notifications

3. **Monitor Submissions:**
   - Check submission history regularly
   - Review any errors or warnings
   - Keep OAuth tokens refreshed

---

## 📚 Additional Resources

- **HMRC Developer Hub**: https://developer.service.hmrc.gov.uk/
- **RTI API Documentation**: Available in HMRC Developer Hub
- **PAYE Calculator**: https://www.gov.uk/estimate-income-tax
- **NI Rates**: Available on HMRC website

---

**Happy Testing! 🎉**

If you encounter any issues during testing, check the browser console (F12) for detailed error messages, or refer to the troubleshooting section above.

