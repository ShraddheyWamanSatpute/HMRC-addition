# WCAG 2.1 AA Accessibility - Explanation & Status

## What is WCAG 2.1 AA?

**WCAG (Web Content Accessibility Guidelines) 2.1 Level AA** is an international standard for web accessibility developed by the W3C (World Wide Web Consortium). It ensures that websites and web applications are accessible to people with disabilities, including:

- Visual impairments (blindness, low vision, color blindness)
- Hearing impairments
- Motor/mobility impairments
- Cognitive disabilities
- Temporary disabilities (broken arm, situational limitations)

### WCAG 2.1 AA Compliance Requirements

WCAG 2.1 has 4 main principles (POUR):

#### 1. **Perceivable** - Users must be able to perceive the information
- Text alternatives for images (`alt` attributes)
- Captions for audio/video
- Content must be readable (contrast ratios ≥ 4.5:1)
- Text can be resized up to 200% without loss of functionality

#### 2. **Operable** - Interface components must be usable
- Keyboard accessible (all functionality via keyboard)
- No content that causes seizures (no flashing >3 times/second)
- Navigation aids (skip links, headings, landmarks)
- Sufficient time limits with options to extend

#### 3. **Understandable** - Information and UI must be understandable
- Readable text (level-A language defined)
- Predictable (consistent navigation, no unexpected changes)
- Input assistance (error identification, labels, suggestions)

#### 4. **Robust** - Content must be compatible with assistive technologies
- Valid HTML/CSS
- Proper ARIA attributes
- Screen reader compatibility
- Future-proof markup

### Level AA Specific Requirements

**Level AA** (the target level) includes:
- ✅ Color contrast ratio of 4.5:1 for normal text, 3:1 for large text
- ✅ Keyboard navigation for all interactive elements
- ✅ Visible focus indicators
- ✅ Headings in logical order (h1 → h2 → h3)
- ✅ Form labels associated with inputs
- ✅ ARIA labels for interactive elements without visible text
- ✅ Error messages that identify fields and describe errors
- ✅ Consistent navigation and identification

---

## Current Implementation Status: ⚠️ PARTIAL

### ✅ What's Implemented

Based on codebase analysis, the following accessibility features ARE present:

#### 1. **ARIA Labels** (Found in multiple components)
```tsx
// src/frontend/components/reusable/ReusableModal.tsx
aria-label={isMinimized ? 'restore' : 'minimize'}
aria-label={isFullscreen ? 'exit fullscreen' : 'fullscreen'}
aria-label="close"

// src/frontend/pages/pos/SalesCategoryManagement.tsx
<Table stickyHeader aria-label="sales categories table">

// src/frontend/components/reusable/WidgetSettingsDialog.tsx
aria-label="widget settings tabs"
aria-labelledby={`widget-settings-tab-${index}`}

// src/frontend/pages/tools/ExcelPdf.tsx
tabIndex={0}
aria-label={`${option.title}: ${option.description}`}
```

#### 2. **Tab Index Support**
```tsx
// Explicit tabIndex for keyboard navigation
tabIndex={0} // Makes element keyboard accessible
```

#### 3. **Role Attributes**
```tsx
// Proper semantic roles
role="tabpanel"
role="button"
```

#### 4. **Tab Panels with A11Y Props**
```tsx
// Consistent pattern across settings components
function a11yProps(index: number) {
  return {
    id: `tab-${index}`,
    "aria-controls": `tabpanel-${index}`,
  }
}
```

#### 5. **Keyboard Navigation**
- Calculator widget supports keyboard input
- Modal components support ESC key to close
- Tab navigation between elements

---

### ❌ What's Missing (Partial Compliance)

#### 1. **Inconsistent ARIA Labels**
- ❌ Not all interactive buttons have `aria-label`
- ❌ Not all icons have descriptive labels
- ❌ Some tables missing `aria-label` or `aria-describedby`

#### 2. **Missing Form Labels**
- ❌ Some form inputs may not have associated `<label>` elements
- ❌ Some inputs rely on placeholder text (not accessible to screen readers)

#### 3. **Color Contrast**
- ⚠️ Not verified - needs audit for:
  - Text on background colors
  - Button text
  - Link colors
  - Error/warning message colors

#### 4. **Focus Indicators**
- ⚠️ Not all interactive elements have visible focus states
- Some custom styled buttons may hide default focus

#### 5. **Image Alt Text**
- ⚠️ Icons and images may not have descriptive `alt` text
- Decorative images may need `alt=""`

#### 6. **Error Messages**
- ⚠️ Error messages may not be programmatically associated with form fields
- Missing `aria-invalid` and `aria-describedby` on error states

#### 7. **Skip Links**
- ❌ No skip to main content links
- ❌ No skip to navigation links

#### 8. **Heading Hierarchy**
- ⚠️ Not verified - needs audit for:
  - Logical h1 → h2 → h3 order
  - No skipping heading levels

#### 9. **Keyboard Traps**
- ⚠️ Modals and dialogs may not properly trap focus
- Focus may not return to trigger element when modal closes

#### 10. **Screen Reader Testing**
- ❌ No automated accessibility testing (aXe, WAVE, Lighthouse)
- ❌ Not tested with actual screen readers (NVDA, JAWS, VoiceOver)

---

## Why It's Marked as "PARTIAL"

The codebase shows **good intentions** with accessibility:
- Some components have proper ARIA attributes
- Keyboard navigation is partially supported
- Some patterns are consistent (tab panels)

However, it's **not consistently implemented** across all components:
- Missing labels and ARIA attributes in many places
- No systematic accessibility audit
- No automated accessibility testing
- Not verified to meet all WCAG 2.1 AA success criteria

---

## Recommendations to Achieve Full WCAG 2.1 AA Compliance

### HIGH Priority

1. **Audit Current Implementation**
   - Run Lighthouse accessibility audit
   - Use axe DevTools browser extension
   - Test with screen readers (NVDA, JAWS, VoiceOver)

2. **Add Missing ARIA Labels**
   - All interactive elements need descriptive labels
   - Icon buttons must have `aria-label`
   - Form inputs must have associated `<label>` or `aria-label`

3. **Improve Form Accessibility**
   - Ensure all inputs have associated labels
   - Add `aria-invalid="true"` on error states
   - Add `aria-describedby` linking errors to fields
   - Make error messages descriptive

4. **Color Contrast Audit**
   - Verify all text meets 4.5:1 contrast ratio
   - Large text (18pt+) meets 3:1 ratio
   - Use contrast checker tools

5. **Keyboard Navigation**
   - Ensure all interactive elements are keyboard accessible
   - Add visible focus indicators (outline or ring)
   - Implement focus traps in modals
   - Return focus after modal closes

### MEDIUM Priority

6. **Add Skip Links**
   ```tsx
   <a href="#main-content" className="skip-link">
     Skip to main content
   </a>
   ```

7. **Heading Hierarchy**
   - Audit all pages for proper h1 → h2 → h3 order
   - Ensure no skipping levels
   - Use semantic HTML (h1-h6) not styled divs

8. **Image Alt Text**
   - Add descriptive `alt` text to all informative images
   - Use `alt=""` for decorative images
   - Icons should have `aria-label` not `alt`

9. **Live Regions**
   - Add `aria-live` regions for dynamic content updates
   - Status messages, toast notifications

10. **Landmarks**
    - Use semantic HTML5 elements (`<main>`, `<nav>`, `<header>`, `<footer>`)
    - Add ARIA landmarks if semantic HTML not possible

### LOW Priority

11. **Automated Testing**
    - Set up jest-axe for unit tests
    - Add Lighthouse CI to build pipeline
    - Configure pa11y for automated audits

12. **Documentation**
    - Create accessibility guidelines for developers
    - Document keyboard shortcuts
    - Create accessibility checklist for PRs

---

## Testing Tools

### Automated Tools
- **Lighthouse** (Chrome DevTools) - Comprehensive audit
- **axe DevTools** (Browser extension) - Real-time checking
- **WAVE** (Browser extension) - Visual accessibility issues
- **pa11y** (CLI tool) - Command-line testing
- **jest-axe** - Unit test integration

### Manual Testing
- **NVDA** (Windows) - Free screen reader
- **JAWS** (Windows) - Commercial screen reader
- **VoiceOver** (macOS/iOS) - Built-in screen reader
- **TalkBack** (Android) - Built-in screen reader
- **Keyboard only navigation** - Tab through entire interface

---

## Compliance Checklist

Use this checklist to verify WCAG 2.1 AA compliance:

### Perceivable
- [ ] All images have alt text
- [ ] Color contrast meets 4.5:1 (normal text) or 3:1 (large text)
- [ ] Text can be resized to 200% without loss of functionality
- [ ] Audio/video has captions or transcripts

### Operable
- [ ] All functionality available via keyboard
- [ ] No keyboard traps
- [ ] Visible focus indicators on all interactive elements
- [ ] No content that flashes more than 3 times per second
- [ ] Sufficient time limits with options to extend
- [ ] Skip links for navigation

### Understandable
- [ ] Page language defined (`lang` attribute)
- [ ] Form labels associated with inputs
- [ ] Error messages identify field and describe error
- [ ] Consistent navigation and identification
- [ ] No unexpected context changes

### Robust
- [ ] Valid HTML markup
- [ ] Proper ARIA attributes where needed
- [ ] Screen reader compatible
- [ ] Semantic HTML used (`<main>`, `<nav>`, etc.)

---

## Conclusion

The codebase has a **foundation for accessibility** but needs systematic improvements to achieve full WCAG 2.1 AA compliance. The "PARTIAL" status reflects:

✅ **Positive:** Some components demonstrate good accessibility practices  
⚠️ **Incomplete:** Not consistently applied across all components  
❌ **Missing:** No automated testing or comprehensive audit

**Recommended Action:** Prioritize automated accessibility testing and systematic audit of all components.

