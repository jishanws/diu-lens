# DIU Lens — Frontend Audit Report

**Date**: 2026-06-15
**Scope**: `apps/web` — all pages, components, features, styles, and configuration
**Standard**: [frontend-quality-standard.md](file:///Users/jishan/Code/diu-lens/docs/frontend-quality-standard.md)

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 5 |
| 🟠 High | 11 |
| 🟡 Medium | 12 |
| ⚪ Low | 6 |

The application demonstrates strong engineering in several areas: robust API error handling with exhaustive response parsing, type-safe runtime validation of all backend payloads, well-structured multi-step registration flow, and solid mobile menu implementation. However, there are critical gaps in security headers, accessibility infrastructure, and admin session management that must be addressed for a production university-scale biometric system.

---

## 🔴 Critical Findings

### C1. Admin JWT Stored in localStorage — XSS Token Theft Vector (✅ Fixed)

**File**: [AdminAuthContext.tsx](file:///Users/jishan/Code/diu-lens/apps/web/features/admin/auth/AdminAuthContext.tsx)

Admin access tokens are stored in `localStorage` via `ADMIN_TOKEN_STORAGE_KEY`. Any XSS vulnerability (including via third-party dependencies) can exfiltrate the token silently. For a biometric identity platform with admin access to enrollment approval, recognition search, and system configuration, this is unacceptable.

**Impact**: Full admin session hijack via any XSS vector.

**Remediation**:
- Move JWT storage to `httpOnly`, `Secure`, `SameSite=Strict` cookies set by the backend.
- Use a `/auth/admin/refresh` endpoint for token rotation.
- If localStorage must remain short-term, implement automatic token rotation and reduce TTL to minutes.

---

### C2. No Content Security Policy (CSP) Headers (✅ Fixed)

**Files**: [next.config.ts](file:///Users/jishan/Code/diu-lens/apps/web/next.config.ts)

The application has zero security headers configured. No `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy`. The `dangerouslySetInnerHTML` usage in [head.tsx](file:///Users/jishan/Code/diu-lens/apps/web/app/head.tsx#L21) for theme initialization is a known inline script that would need a nonce-based CSP.

**Impact**: No defense-in-depth against XSS, clickjacking, or MIME-type attacks.

**Remediation**:
- Add a Next.js `middleware.ts` or configure headers in `next.config.ts` to set:
  - `Content-Security-Policy` with script nonces
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(self), microphone=()`
- Convert the theme script to use a nonce-based approach.

---

### C3. No `aria-live` Regions Anywhere in the Application (✅ Fixed)

**Scope**: Entire `apps/web`

Dynamic content changes (validation results, error messages, step transitions, capture feedback, submission status) are never announced to screen readers. In a multi-step biometric enrollment flow, a screen reader user would have no awareness of:
- Student ID validation results
- Step transitions
- Face capture status changes
- Submission success/failure

**Impact**: The enrollment flow is effectively unusable for screen reader users.

**Remediation**:
- Add `aria-live="polite"` region for validation feedback in [StudentIdStep.tsx](file:///Users/jishan/Code/diu-lens/apps/web/features/registration/steps/StudentIdStep.tsx)
- Add `aria-live="assertive"` for error messages throughout
- Add live region for capture status in [GuidedEnrollmentCapture.tsx](file:///Users/jishan/Code/diu-lens/apps/web/features/registration/capture/GuidedEnrollmentCapture.tsx)
- Add step announcement in [RegistrationFlow.tsx](file:///Users/jishan/Code/diu-lens/apps/web/features/registration/RegistrationFlow.tsx)

---

### C4. No Focus Trap in Mobile Menu Drawers (✅ Fixed)

**Files**: [Header.tsx](file:///Users/jishan/Code/diu-lens/apps/web/components/Header.tsx#L119-L156), [AdminPanelShell.tsx](file:///Users/jishan/Code/diu-lens/apps/web/features/admin/AdminPanelShell.tsx)

Both the landing page mobile menu and the admin sidebar drawer open as overlays that cover the entire viewport, but neither implements a focus trap. Keyboard users can Tab behind the overlay into invisible content. The admin drawer has Escape key handling but no focus containment.

**Impact**: Keyboard navigation broken when overlays are open.

**Remediation**:
- Implement focus trap (e.g., `react-focus-lock` or manual trap) for both mobile menu and admin drawer.
- Return focus to the trigger button on close.
- Ensure focus moves to the first interactive element on open.

---

### C5. No Admin Route Protection / Auth Guard (✅ Fixed)

**File**: [middleware.ts](file:///Users/jishan/Code/diu-lens/apps/web/middleware.ts)

The admin layout wraps children in `AdminAuthProvider` but there is no route guard component that checks `status === 'authenticated'` before rendering admin panel content. While the admin API calls will fail with 401 errors, the admin UI shell, navigation, and page structure are fully rendered and visible to unauthenticated users before any API call completes.

**Impact**: Admin panel structure and navigation visible to unauthenticated users. Flash of admin content before redirect.

**Remediation**:
- Add an `AdminAuthGuard` component that shows a loading spinner while `status === 'loading'` and redirects to `/admin/login` when `status === 'unauthenticated'`.
- Wrap `AdminPanelShell` children with this guard in the `(panel)` layout.

---

## 🟠 High Findings

### H1. No Session Timeout for Admin Panel

**File**: [AdminAuthContext.tsx](file:///Users/jishan/Code/diu-lens/apps/web/features/admin/auth/AdminAuthContext.tsx)

The admin session has no client-side inactivity timeout. A token stored in localStorage persists indefinitely until manually logged out. An unattended admin terminal in a university office remains authenticated.

**Remediation**: Implement idle detection (e.g., 15-minute inactivity) that triggers `clearSession()`. Display a warning dialog before auto-logout.

---

### H2. Excessive Console Logging of Sensitive Data in Production

**Files**: [registration/api.ts](file:///Users/jishan/Code/diu-lens/apps/web/features/registration/api.ts) (lines 423, 433, 497, 542, 572-580, 631-640, 685), [RegistrationFlow.tsx](file:///Users/jishan/Code/diu-lens/apps/web/features/registration/RegistrationFlow.tsx#L171-L189)

The registration API client contains extensive `console.log` statements that output:
- Raw API response bodies (including potential PII)
- Student IDs
- File sizes, types, and counts
- Performance timing data
- Emoji-prefixed debug markers (`🚀`, `✅`, `❌`)

These are development-time debug statements that should not ship to production.

**Remediation**: Remove all `console.log`/`console.warn` statements or gate them behind `process.env.NODE_ENV === 'development'`. Replace with structured logging if production observability is needed.

---

### H3. `role="progressbar"` Misused on `<nav>` Element

**File**: [RegistrationShell.tsx](file:///Users/jishan/Code/diu-lens/apps/web/features/registration/RegistrationShell.tsx#L41-L47)

The step timeline uses `<nav>` with `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`. This is semantically incorrect — a `<nav>` is a navigation landmark, and `progressbar` is a range widget. Screen readers will receive conflicting semantics.

**Remediation**:
- Use `role="group"` with `aria-label="Registration progress"` on the container.
- Add individual step items with `aria-current="step"` for the active step.
- Or use a dedicated `<div role="progressbar">` separate from the navigation.

---

### H4. Form Validation Does Not Prevent Invalid Email/Phone Submission

**File**: [BasicInfoStep.tsx](file:///Users/jishan/Code/diu-lens/apps/web/features/registration/steps/BasicInfoStep.tsx)

The form relies solely on HTML `required` attributes and truthy-trim checks. No email format validation, phone format validation, or university email domain validation is performed on the client. The `type="email"` attribute provides minimal browser validation but nothing for `inputMode="tel"` on the phone field.

**Remediation**:
- Add regex-based email validation (or at minimum, `@diu.edu.bd` domain enforcement for university email).
- Add phone number format validation.
- Display inline error messages with `aria-describedby` association.

---

### H5. No Error Boundary Component

**Scope**: Entire `apps/web` — no `ErrorBoundary` or `error.tsx` files found.

React error boundaries are not implemented. An unhandled error in any component will crash the entire page with no recovery path. This is especially dangerous during the face capture flow, where MediaPipe WASM errors or camera API failures could crash the enrollment.

**Remediation**: Add `error.tsx` files for critical route segments (`/register`, `/verify`, `/admin/(panel)`) following Next.js App Router conventions.

---

### H6. `dangerouslySetInnerHTML` Theme Script Not Nonce-Protected

**File**: [head.tsx](file:///Users/jishan/Code/diu-lens/apps/web/app/head.tsx#L19-L22)

The inline script for theme initialization uses `dangerouslySetInnerHTML`. While the script content is a static string (not user-controlled), it blocks any future CSP implementation without nonce support.

**Remediation**: When implementing CSP (C2), generate a nonce per request and apply it to this script tag.

---

### H7. No `<title>` Override for Registration or Contact Pages

**Files**: [app/register/page.tsx](file:///Users/jishan/Code/diu-lens/apps/web/app/register/page.tsx), [app/contact/](file:///Users/jishan/Code/diu-lens/apps/web/app/contact), [app/faq/](file:///Users/jishan/Code/diu-lens/apps/web/app/faq)

The root layout sets `title: 'DIU Lens'`. The `/verify` page correctly exports metadata with a unique title, but `/register` does not export any metadata override. This means the registration page shows the generic "DIU Lens" title, making browser tab identification difficult when multiple tabs are open.

**Remediation**: Export `metadata` with descriptive titles from all page files.

---

### H8. Mobile Camera UI Height Constraint May Clip on Small Devices

**File**: [RegistrationFlow.tsx](file:///Users/jishan/Code/diu-lens/apps/web/features/registration/RegistrationFlow.tsx#L439)

The verification step container uses `h-[min(600px,calc(100dvh-9.75rem))]`. On very small viewports (e.g., iPhone SE at 667px height), subtracting 9.75rem (156px) leaves ~511px. The camera preview, controls, progress ring, and angle strip must all fit within this. No scrolling is available inside this container.

**Remediation**: Test on 320×568 (iPhone SE) and 360×640 viewports. Consider making the container scrollable or reducing the height allocation for non-camera elements.

---

### H9. Admin API Client Doesn't Handle Token Refresh

**File**: [admin/api.ts](file:///Users/jishan/Code/diu-lens/apps/web/features/admin/api.ts#L392-L394)

When a 401 response is received, `AdminApiAuthError` is thrown, which eventually calls `clearSession()`. The user is abruptly logged out with no attempt to refresh the token. In a production admin panel, this causes data loss if the admin was mid-operation.

**Remediation**: Implement a token refresh mechanism. Queue failed requests and retry after refresh. Show a "session expired" dialog rather than silent logout.

---

### H10. `head.tsx` Exported as Component, Not Used in App Router

**File**: [head.tsx](file:///Users/jishan/Code/diu-lens/apps/web/app/head.tsx)

In Next.js App Router, `head.tsx` is not a recognized convention. The file exports a `Head` component but it's never imported or rendered in [layout.tsx](file:///Users/jishan/Code/diu-lens/apps/web/app/layout.tsx). The theme initialization script is not executing.

**Remediation**: Move the theme script into `layout.tsx` as a `<Script>` component with `strategy="beforeInteractive"`, or inline it in the `<head>` via the metadata API.

---

### H11. `suppressHydrationWarning` Used Without Justification

**File**: [layout.tsx](file:///Users/jishan/Code/diu-lens/apps/web/app/layout.tsx#L71-L75)

Both `<html>` and `<body>` elements have `suppressHydrationWarning`. The `<html>` usage is justified (dark mode class may differ between server/client), but `<body>` suppression could mask real hydration mismatches.

**Remediation**: Remove `suppressHydrationWarning` from `<body>`.

---

## 🟡 Medium Findings

### M1. No `prefers-reduced-motion` Respect in Framer Motion Animations

**Scope**: All Framer Motion usage across components.

CSS animations in [globals.css](file:///Users/jishan/Code/diu-lens/apps/web/app/globals.css) and [patterns.css](file:///Users/jishan/Code/diu-lens/apps/web/styles/patterns.css) do respect `prefers-reduced-motion`. However, the numerous Framer Motion animations (step transitions, mobile menu, admin drawer, error messages) do not check the user's motion preference.

**Remediation**: Use `useReducedMotion()` from Framer Motion and conditionally disable or simplify animations.

---

### M2. Hardcoded Colors Outside Design Token System

**Files**: [AdminPanelShell.tsx](file:///Users/jishan/Code/diu-lens/apps/web/features/admin/AdminPanelShell.tsx) (lines 130, 134, 136, 139, etc.), [admin/login/page.tsx](file:///Users/jishan/Code/diu-lens/apps/web/app/admin/login/page.tsx) (lines 43, 49, 54, 60, 72, 107, etc.)

Both files contain dozens of hardcoded hex colors (`#050709`, `#0a0d12`, `#080b0f`, `#6493b5`, etc.) and arbitrary rgba values instead of using CSS custom properties from `globals.css`. This creates maintenance burden and drift from the design system.

**Remediation**: Extract recurring colors into CSS custom properties. Reference `var(--landing-accent)`, `var(--bg-base)`, etc.

---

### M3. Inconsistent Border Radius Values

**Files**: Various component files.

Border radius values across the codebase:
- Login submit button: `rounded-[16px] sm:rounded-[12px] md:rounded-[14px]` — radius *decreases* at larger breakpoints, which is unusual
- Registration shell: `rounded-[1.5rem]`
- Admin panel: `md:rounded-[1.25rem]`
- Login card: `rounded-2xl sm:rounded-[1.25rem]`
- Various inputs: `rounded-xl`, `rounded-lg`, `rounded-md`

No consistent radius scale is applied.

**Remediation**: Adopt the radius system defined in `globals.css` (`--radius-sm` through `--radius-4xl`). Use Tailwind radius utilities mapped to these tokens.

---

### M4. Admin Login Page Uses Raw HTML `<input>` Instead of Shared Components

**File**: [admin/login/page.tsx](file:///Users/jishan/Code/diu-lens/apps/web/app/admin/login/page.tsx#L99-L108)

The admin login uses raw `<input>` elements with inline styling, while the registration flow uses the shared `<Input>` and `<Label>` components from `components/ui/`. This creates visual inconsistency and duplicated styling logic.

**Remediation**: Refactor to use `<Input>`, `<Label>`, and `<Button>` from `components/ui/`.

---

### M5. `--font-heading` Aliased to `--font-sans`

**File**: [globals.css](file:///Users/jishan/Code/diu-lens/apps/web/app/globals.css#L13)

`--font-heading: var(--font-sans)` means the Space Grotesk font loaded in [layout.tsx](file:///Users/jishan/Code/diu-lens/apps/web/app/layout.tsx#L17-L19) is never used. The font is downloaded but not applied to any element, wasting bandwidth.

**Remediation**: Either use `--font-heading: var(--font-heading)` to apply Space Grotesk to headings, or remove the font import.

---

### M6. `open redirect` via `next` Query Parameter on Admin Login

**File**: [admin/login/page.tsx](file:///Users/jishan/Code/diu-lens/apps/web/app/admin/login/page.tsx#L19-L23)

`getNextPath()` reads the `next` query parameter from the URL and passes it directly to `router.replace()`. An attacker could craft a login link with `?next=https://evil.com` to redirect admins to a phishing page after authentication.

**Remediation**: Validate that the `next` path starts with `/admin/` and does not contain protocol schemes or external domains.

---

### M7. Camera Stream Not Stopped on Component Unmount in All Paths

**Files**: [useCamera.ts](file:///Users/jishan/Code/diu-lens/apps/web/features/registration/verification/useCamera.ts)

While the `useCamera` hook provides a `stopStream` function, there's no guarantee it's called on component unmount if the user navigates away mid-capture (e.g., browser back button, URL change). The camera indicator may remain active.

**Remediation**: Add a cleanup effect in `useCamera.ts` that calls `stopStream` on unmount.

---

### M8. No Loading State for Admin Panel Page Transitions

**Scope**: [admin/(panel)/](file:///Users/jishan/Code/diu-lens/apps/web/app/admin/(panel)) routes.

Navigating between admin panel pages (Enrollments → Recognition → Audit Logs) has no loading indicator. Data-heavy pages like audit logs may take seconds to load, leaving the user with a blank content area.

**Remediation**: Add `loading.tsx` files for admin panel route segments.

---

### M9. `canvas-confetti` Included as Production Dependency

**File**: [package.json](file:///Users/jishan/Code/diu-lens/apps/web/package.json#L14)

The `canvas-confetti` package is listed as a production dependency. If only used for the success step animation, it should be dynamically imported to avoid adding to the initial bundle.

**Remediation**: Use `dynamic(() => import('canvas-confetti'), { ssr: false })` or lazy import.

---

### M10. No CSRF Protection on Form Submissions

**Scope**: All `POST` requests from the frontend.

Neither the registration enrollment submission nor the admin login form includes CSRF tokens. While the backend uses `Content-Type: application/json` (which provides some protection in modern browsers via CORS preflight), the enrollment completion uses `FormData` (`multipart/form-data`), which can be submitted by simple forms cross-origin.

**Remediation**: Implement CSRF tokens for the enrollment completion endpoint. Verify `Origin` header on the backend.

---

### M11. No `Permissions-Policy` Header for Camera Access

**Scope**: [next.config.ts](file:///Users/jishan/Code/diu-lens/apps/web/next.config.ts)

The application requires camera access for face capture but doesn't set `Permissions-Policy: camera=(self)` to prevent third-party iframes from accessing the camera.

**Remediation**: Add `Permissions-Policy` header via Next.js config or middleware.

---

### M12. `mock-data.ts` Shipped in Production Bundle

**File**: [features/admin/mock-data.ts](file:///Users/jishan/Code/diu-lens/apps/web/features/admin/mock-data.ts)

A mock data file exists in the features directory. If imported by any component, it will be included in the production bundle.

**Remediation**: Verify if this file is imported in production code. If development-only, move to a `__mocks__` directory or guard with `process.env.NODE_ENV`.

---

## ⚪ Low Findings

### L1. `<header>` Element Used Inside Form Steps

**Files**: [StudentIdStep.tsx](file:///Users/jishan/Code/diu-lens/apps/web/features/registration/steps/StudentIdStep.tsx#L86), [BasicInfoStep.tsx](file:///Users/jishan/Code/diu-lens/apps/web/features/registration/steps/BasicInfoStep.tsx#L30)

Step components use `<header>` as a semantic element inside forms. While not invalid, multiple `<header>` elements within a page can confuse screen reader navigation landmarks.

**Remediation**: Use `<div>` instead, as these are section headings, not page-level headers.

---

### L2. Inconsistent Button `type` Attribute Usage

**File**: [BasicInfoStep.tsx](file:///Users/jishan/Code/diu-lens/apps/web/features/registration/steps/BasicInfoStep.tsx#L133-L135)

The "Continue" button in BasicInfoStep uses `type="button"` with `onClick={onContinue}`, but the StudentIdStep wraps in a `<form>` with `type="submit"`. This inconsistency means the BasicInfoStep form doesn't support Enter-key submission.

**Remediation**: Wrap BasicInfoStep in a `<form>` and use `type="submit"` for the primary action.

---

### L3. `StudentIdStep` Label is `sr-only` — No Visible Label

**File**: [StudentIdStep.tsx](file:///Users/jishan/Code/diu-lens/apps/web/features/registration/steps/StudentIdStep.tsx#L96)

The "Student ID" label is visually hidden (`sr-only`) while the input relies on a placeholder (`222-15-6001`). Placeholders disappear on focus, leaving no visible label for sighted users.

**Remediation**: Either show the label visually or add a persistent floating label.

---

### L4. No `aria-label` on Decorative SVG in Step Nodes

**File**: [RegistrationShell.tsx](file:///Users/jishan/Code/diu-lens/apps/web/features/registration/RegistrationShell.tsx#L80)

The checkmark SVG in completed step nodes has `aria-hidden="true"`, which is correct. No issue here, but the step node divs themselves (`.step-node`) lack any accessible name — screen reader users get no information about which step they're on.

**Remediation**: Add `aria-label` to each step node (e.g., "Step 1: Student ID, completed").

---

### L5. OpenGraph and Twitter Card Images May Not Exist

**File**: [layout.tsx](file:///Users/jishan/Code/diu-lens/apps/web/app/layout.tsx#L44-L49)

Metadata references `/branding/og-image.png` and various icon paths. If these files don't exist in the `public/branding/` directory, social sharing will show broken images.

**Remediation**: Verify all referenced branding assets exist in `public/branding/`.

---

### L6. `useEffect` Missing `getNextPath` in Dependencies

**File**: [admin/login/page.tsx](file:///Users/jishan/Code/diu-lens/apps/web/app/admin/login/page.tsx#L25-L29)

The `useEffect` that redirects authenticated users calls `getNextPath()` but doesn't list it as a dependency. While `getNextPath` is a stable function reference, the `window.location.search` it reads could change.

**Remediation**: Move `getNextPath` outside the component or memoize it.

---

## Recommendations by Priority

### Immediate (Before Production)
1. **C1** — Move admin tokens out of localStorage
2. **C2** — Implement security headers
3. **C5** — Add admin route authentication guard
4. **H2** — Remove production console.log statements

### Short-term (Next Sprint)
5. **C3** — Add aria-live regions for dynamic content
6. **C4** — Implement focus traps for overlays
7. **H5** — Add error boundaries
8. **H10** — Fix theme script not executing
9. **M6** — Fix open redirect vulnerability

### Medium-term (Planned Improvement)
10. **H1** — Implement admin session timeout
11. **H4** — Add client-side form validation
12. **H9** — Implement token refresh
13. **M1** — Respect prefers-reduced-motion in JS animations
14. **M2/M3** — Consolidate design tokens

---

## Positive Observations

The following patterns demonstrate strong engineering:

- **Exhaustive API response parsing**: Both [registration/api.ts](file:///Users/jishan/Code/diu-lens/apps/web/features/registration/api.ts) and [admin/api.ts](file:///Users/jishan/Code/diu-lens/apps/web/features/admin/api.ts) perform runtime type validation on every field of every API response — never trusting backend types at face value.
- **Student ID validation bypass prevention**: The `validatedStudentIdRef` pattern in [RegistrationFlow.tsx](file:///Users/jishan/Code/diu-lens/apps/web/features/registration/RegistrationFlow.tsx#L93) prevents step 2 from opening without explicit validation.
- **Idempotent submission guards**: `isSubmittingBasicInfo` and `isCompletingRegistration` flags prevent double-submission.
- **Client-side capture validation**: The [useFaceCapture.ts](file:///Users/jishan/Code/diu-lens/apps/web/features/registration/capture/useFaceCapture.ts) hook implements comprehensive face quality checks (size, centering, blur, brightness, pose) before allowing capture.
- **Decorative layer accessibility**: All atmospheric background layers correctly use `aria-hidden="true"` and `pointer-events-none`.
- **Mobile-first input design**: The login page uses `text-[16px]` for mobile inputs, preventing iOS zoom-on-focus.
- **Admin drawer UX**: Escape key handling, body scroll lock, and swipe-to-dismiss are properly implemented.
