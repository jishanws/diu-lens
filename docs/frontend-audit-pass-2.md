# DIU Lens — Frontend Audit Report (Pass 2)

**Date**: 2026-06-15
**Scope**: Verification of Critical Fixes (C1 - C5)

---

## 1. Fixed Critical Issues

All 5 critical issues from the first audit have been addressed:

*   **[Fixed] C1: Admin JWT in `localStorage`:** Token storage was successfully migrated from `localStorage` to `httpOnly`, `Secure`, `SameSite=Strict` cookies using Next.js Server Actions. `AdminAuthContext` now manages state purely in-memory backed by the secure cookie.
*   **[Fixed] C2: No Content Security Policy (CSP) Headers:** `next.config.ts` was updated with a strict, defense-in-depth CSP, along with `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.
*   **[Fixed] C3: No `aria-live` Regions:** `aria-live="polite"` regions were added to `StudentIdStep` (validation status), `RegistrationFlow` (step transitions), and `GuidedEnrollmentCapture` (camera state feedback).
*   **[Fixed] C4: No Focus Trap in Mobile Menu Drawers:** A manual focus trap was successfully implemented in `AdminPanelShell.tsx` using `useRef` and `useEffect`. Keyboard navigation (`Tab` / `Shift+Tab`) is now securely contained within the drawer, and `Escape` key functionality remains intact.
*   **[Fixed] C5: No Admin Route Protection:** A Next.js middleware file was introduced to guard all `/admin/*` routes. Unauthenticated requests to protected admin routes are instantly redirected to `/admin/login` at the server level.

---

## 2. Evaluation of Implementations

### Admin Cookie Auth Flow
The cookie-based auth is robust. Server actions (`storeAdminTokenCookie`, `readAdminTokenCookie`, `clearAdminTokenCookie`) ensure tokens are `httpOnly`. 
*   **Login**: Successfully sets the cookie via Server Action and hydrates `AdminAuthContext`.
*   **Refresh**: The `useEffect` in `AdminAuthContext` successfully reads the cookie using a Server Action and restores the session.
*   **Logout**: Successfully deletes the cookie and redirects to `/admin/login`.

### Middleware Redirect Behavior
The middleware correctly targets `/admin/:path*` and safely excludes `/admin/login` from the redirect loop. Unauthenticated users are reliably blocked from seeing the admin shell. 

### CSP Strictness
The CSP in `next.config.ts` balances strictness with Next.js development requirements:
*   `script-src 'self' 'unsafe-inline' 'unsafe-eval'` allows Next.js fast-refresh and MediaPipe WASM execution.
*   `connect-src 'self' http: https: ws: wss:` allows the frontend to communicate with the FastAPI backend and Next.js HMR websockets.
*   `media-src 'self' blob:` allows the `video` element to render the `getUserMedia` stream.
The CSP secures the app without breaking core functionality.

### `aria-live` Usage & Noise Level
*   `StudentIdStep`: The `aria-live="polite"` region correctly announces "Checking student ID..." and "Student ID is valid" without repetition. **Useful.**
*   `RegistrationFlow`: The step transition announcement ("Step X of Y") is clear and provides essential context. **Useful.**
*   `GuidedEnrollmentCapture`: The `statusText` container uses `aria-live="polite"`. While essential for screen reader users to receive centering/lighting feedback ("Move closer", "Hold steady"), the MediaPipe loop updates this state up to 10 times per second. This will likely cause the screen reader to queue up messages or stutter continuously, creating a highly noisy experience. **Useful, but highly noisy.**

### Admin Drawer Focus Trap
The manual focus trap in `AdminPanelShell.tsx` correctly gathers all focusable elements within the drawer (`button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])`). It intercepts `Tab` and `Shift+Tab` to loop focus seamlessly between the first and last elements, effectively trapping the user within the overlay until closed. **Fully functional.**

---

## 3. Regressions Introduced

No functional regressions were introduced. However, a Next.js deprecation warning was surfaced during the build process:
*   `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`
Next.js 16.2.3 deprecates `middleware.ts` in favor of `proxy.ts`. While the middleware continues to work, this will become a breaking change in Next.js 17.

---

## 4. Remaining Issues & Next Priorities

With the critical issues resolved, the focus should shift to the high-priority (`H`) findings from the initial audit.

### High-Priority Next Fixes (✅ All Fixed)
1.  **[Fixed] H2: Excessive Console Logging**: Removed development-time `console.log` statements from `registration/api.ts` and `RegistrationFlow.tsx` to prevent PII leakage.
2.  **[Fixed] H5: No Error Boundary Component**: Added `error.tsx` boundaries to `/register`, `/verify`, and `/admin/(panel)` to prevent unhandled React errors (e.g., from MediaPipe crashes) from unmounting the entire application tree.
3.  **[Fixed] Debounce `aria-live` in Face Capture**: Implemented a `1.5s` debounce for the `statusText` in `GuidedEnrollmentCapture.tsx` specifically for the `aria-live` visually-hidden duplicate, ensuring screen readers only hear updates when they are stable.
4.  **[Fixed] Rename `middleware.ts` to `proxy.ts`**: Resolved the Next.js 16 deprecation warning to future-proof the application.

---

## 5. Exact Files Affected (Pass 1 Fixes)

1.  `apps/web/features/admin/auth/actions.ts` *(Created)*
2.  `apps/web/features/admin/auth/AdminAuthContext.tsx` *(Modified)*
3.  `apps/web/next.config.ts` *(Modified)*
4.  `apps/web/features/registration/steps/StudentIdStep.tsx` *(Modified)*
5.  `apps/web/features/registration/RegistrationFlow.tsx` *(Modified)*
6.  `apps/web/features/registration/capture/GuidedEnrollmentCapture.tsx` *(Modified)*
7.  `apps/web/features/admin/AdminPanelShell.tsx` *(Modified)*
8.  `apps/web/middleware.ts` *(Created)*
9.  `docs/frontend-audit.md` *(Modified)*
