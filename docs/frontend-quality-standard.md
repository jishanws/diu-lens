# DIU Lens — Frontend Quality Standard

> Internal quality standard for the DIU Lens frontend (`apps/web`).
> Adapted from the [Front-End Checklist](https://github.com/thedaviddias/Front-End-Checklist) with items filtered and rewritten for a biometric facial recognition platform running Next.js (App Router), TypeScript, Tailwind CSS v4, Framer Motion, shadcn/ui, and Lucide icons against a Python FastAPI backend.

**Priority legend**

| Tag | Meaning |
|---|---|
| `[CRITICAL]` | Blocks deployment. Security-sensitive, compliance-affecting, or data-loss risk. |
| `[HIGH]` | Major impact on UX, accessibility, or reliability. Fix before feature freeze. |
| `[MEDIUM]` | Strong best-practice. Address during normal development cycles. |

---

## Accessibility

> WCAG 2.1 AA is the baseline. A university biometric system must be usable by students, faculty, and staff with diverse abilities — including those navigating camera-based flows with assistive technology.

- [ ] `[CRITICAL]` All interactive elements (buttons, links, inputs) must have accessible names — use visible `<label>`, `aria-label`, or `aria-labelledby`. Icon-only buttons (e.g., Lucide camera toggle) require explicit `aria-label`.
- [ ] `[CRITICAL]` Color contrast ratios must meet WCAG AA minimums: 4.5:1 for normal text, 3:1 for large text (≥18px bold / ≥24px regular). Verify all text against the dark background palette (`#08111f` / oklch surfaces).
- [ ] `[CRITICAL]` All Framer Motion animations and CSS keyframes must respect `prefers-reduced-motion: reduce` — wrap motion values in a `useReducedMotion()` check and provide static fallbacks.
- [ ] `[HIGH]` Keyboard navigation must work end-to-end: every focusable element must have a visible focus indicator (use `focus-visible:ring-2 focus-visible:ring-ring` from the design system, never `outline-none` without replacement).
- [ ] `[HIGH]` Modal dialogs and overlays (camera permission prompts, confirmation dialogs) must implement focus trap — focus stays inside the dialog until dismissed, then returns to the trigger element.
- [ ] `[HIGH]` Dynamic content changes (face detection feedback, enrollment progress, toast notifications) must use `aria-live="polite"` or `role="alert"` so screen readers announce updates without requiring manual navigation.
- [ ] `[HIGH]` Form validation errors must be programmatically associated with their inputs via `aria-describedby` pointing to the error message element.
- [ ] `[HIGH]` The `<html lang="en">` attribute must be set (currently present in `layout.tsx`). Pages serving Bengali content must use `lang="bn"` on the relevant container.
- [ ] `[MEDIUM]` Camera and video elements must have descriptive `aria-label` attributes (e.g., `aria-label="Live camera feed for face capture"`) and a text alternative explaining the purpose for screen reader users who cannot see the feed.
- [ ] `[MEDIUM]` Multi-step enrollment flows must announce the current step and total steps via `aria-current="step"` and provide a mechanism to navigate back without losing captured data.
- [ ] `[MEDIUM]` Skip-to-content link must be present on all pages — hidden until focused, jumping past the header navigation to `<main>`.
- [ ] `[MEDIUM]` Heading hierarchy must be logical and sequential (one `<h1>` per page, no skipped levels). Use semantic elements (`<main>`, `<nav>`, `<section>`, `<header>`, `<footer>`) for landmark regions.
- [ ] `[MEDIUM]` Touch targets for all interactive elements must be at least 44×44px (CSS) to satisfy WCAG 2.5.8 Target Size.

---

## Security

> DIU Lens handles biometric data and authentication tokens. Frontend security directly affects the integrity of the identity system.

- [ ] `[CRITICAL]` Authentication tokens must be stored in `httpOnly`, `Secure`, `SameSite=Strict` cookies. Never store JWT or session tokens in `localStorage` or `sessionStorage` — they are accessible to XSS.
- [ ] `[CRITICAL]` No usage of `dangerouslySetInnerHTML` without explicit sanitization via DOMPurify. Audit all occurrences on every PR that introduces one.
- [ ] `[CRITICAL]` CSP (Content-Security-Policy) headers must be configured in production. At minimum: `default-src 'self'`, `script-src 'self'`, `style-src 'self' 'unsafe-inline'` (required by Tailwind), `img-src 'self' blob: data:`, `connect-src 'self' <API_ORIGIN>`, `media-src 'self' blob:`.
- [ ] `[CRITICAL]` Admin panel routes (`/admin/*`) must be protected by server-side auth guards — do not rely solely on client-side redirects. Use Next.js middleware or server components to verify the session before rendering.
- [ ] `[HIGH]` CORS configuration on the FastAPI backend must whitelist only the exact frontend origin(s). The frontend must never proxy credentials to arbitrary origins.
- [ ] `[HIGH]` Set secure response headers via `next.config.ts` or middleware: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(self), microphone=()`.
- [ ] `[HIGH]` CSRF protection must be active for all state-mutating API requests. If using cookie-based auth, the backend must validate a CSRF token sent in a custom header (e.g., `X-CSRF-Token`).
- [ ] `[HIGH]` Session timeout must be handled gracefully — when a 401 is received, redirect to login with a message. Clear any client-side auth state. In-progress enrollment data must be preserved where possible.
- [ ] `[HIGH]` All form submissions must go over HTTPS. The `action` attribute (if used) must point to an HTTPS endpoint. Mixed content must be zero.
- [ ] `[MEDIUM]` Environment variables containing secrets must use the `NEXT_PUBLIC_` prefix only for values safe to expose to the browser. API keys, backend secrets, and JWT signing keys must never be prefixed with `NEXT_PUBLIC_`.
- [ ] `[MEDIUM]` External links must use `rel="noopener noreferrer"` when opening in a new tab to prevent reverse tabnapping.
- [ ] `[MEDIUM]` Run `pnpm audit` in CI to catch known dependency vulnerabilities. Block merges on critical/high severity findings.

---

## Privacy

> Biometric data is among the most sensitive categories of personal information. The frontend must minimize exposure, communicate clearly about data handling, and provide consent mechanisms.

- [ ] `[CRITICAL]` Camera access must only be requested after the user explicitly initiates a capture action (e.g., clicking "Start Camera"). Never request camera permission on page load.
- [ ] `[CRITICAL]` A clear biometric data disclosure must be shown before face capture begins — stating what data is collected (face embeddings), how it is stored (server-side pgvector), retention policy, and who has access.
- [ ] `[CRITICAL]` Consent must be obtained through an affirmative action (e.g., checkbox + button) before face images are captured or transmitted. The consent state must be recorded and auditable.
- [ ] `[HIGH]` No PII (student IDs, names, face images) may appear in URLs, query parameters, browser console logs, or `localStorage` keys/values beyond what is operationally necessary.
- [ ] `[HIGH]` Face images captured during enrollment must not persist in client-side state after successful upload. Clear canvas data, blob URLs (`URL.revokeObjectURL`), and any in-memory image buffers immediately after transmission.
- [ ] `[HIGH]` The frontend must not set non-essential cookies or use third-party tracking scripts. If analytics are added, they must be covered by a consent mechanism.
- [ ] `[MEDIUM]` Camera streams must be stopped (`MediaStream.getTracks().forEach(t => t.stop())`) when the user navigates away from the capture screen or closes the modal.
- [ ] `[MEDIUM]` Provide a visible link to the university's privacy policy from the enrollment flow and the footer of all pages.
- [ ] `[MEDIUM]` Client-side state (React state, context) must hold the minimum data needed for the current view. Do not cache full enrollment records or face images in global state.

---

## Performance

> Camera-based flows stream live video and run MediaPipe WASM modules. Performance directly affects face detection accuracy and user experience on lower-end university lab machines.

- [ ] `[CRITICAL]` MediaPipe WASM binaries and model files must be loaded asynchronously with a loading indicator. Use `dynamic(() => import(...), { ssr: false })` for components that depend on WASM.
- [ ] `[CRITICAL]` Camera `MediaStream` resources must be explicitly released on component unmount. Use a `useEffect` cleanup function to call `stream.getTracks().forEach(t => t.stop())`.
- [ ] `[HIGH]` Use `next/image` for all static images (logos, illustrations, branding assets). Configure `formats: ['image/avif', 'image/webp']` in `next.config.ts`.
- [ ] `[HIGH]` Use `next/font` (currently `DM_Sans` and `Space_Grotesk` via Google Fonts) with `display: 'swap'` to prevent FOIT. Font files are self-hosted by Next.js at build time — verify no external font requests in production.
- [ ] `[HIGH]` Route-based code splitting is automatic with App Router. Additionally, `dynamic()` import heavy components: the admin dashboard charts, the camera capture module, and any MediaPipe-dependent code.
- [ ] `[HIGH]` CSS animations must use compositor-only properties (`transform`, `opacity`) to avoid triggering layout/paint. Framer Motion's `animate` should target `x`, `y`, `scale`, `opacity`, `rotate` — never `width`, `height`, `top`, `left`.
- [ ] `[HIGH]` Canvas and video elements must be properly garbage collected — set `canvas = null` and remove all references after use to prevent memory leaks. In long-running capture sessions, monitor memory via `performance.memory` (Chrome).
- [ ] `[MEDIUM]` Bundle size must be monitored. Use `@next/bundle-analyzer` to identify large dependencies. Total JavaScript (compressed) for the initial page load should stay under 200KB.
- [ ] `[MEDIUM]` Debounce or throttle high-frequency event handlers — face detection callbacks, resize events, and search input should not fire on every frame/keystroke.
- [ ] `[MEDIUM]` Set `fetchPriority="high"` on the LCP element (typically the hero heading or primary UI container) to improve Largest Contentful Paint.
- [ ] `[MEDIUM]` Lazy load below-the-fold sections (FAQ, contact, feature lists) with `loading="lazy"` on images and `dynamic()` on heavy component trees.

---

## Forms

> Forms in DIU Lens handle student registration data, admin login, and search queries. Accessible, resilient forms are non-negotiable for a university system.

- [ ] `[CRITICAL]` Every `<input>`, `<select>`, and `<textarea>` must have an associated `<label>` element (via `htmlFor`) or `aria-label`. The shadcn/ui `<Label>` component handles this — use it consistently.
- [ ] `[CRITICAL]` Validation error messages must be linked to their input via `aria-describedby` and use `role="alert"` so screen readers announce errors immediately.
- [ ] `[HIGH]` Use the correct `type` and `inputMode` attributes: `type="email" inputMode="email"` for email fields, `type="tel" inputMode="tel"` for phone numbers, `type="text" inputMode="numeric"` for student IDs.
- [ ] `[HIGH]` Form submission buttons must communicate loading state: set `aria-busy="true"` and `disabled` while the request is in-flight. Show a spinner or loading text replacement.
- [ ] `[HIGH]` Multi-step forms (enrollment flow) must preserve state across steps and allow backward navigation without data loss. Use React state or `sessionStorage` — never rely on browser back button alone.
- [ ] `[MEDIUM]` Use `autocomplete` attributes to enable browser autofill: `autocomplete="name"`, `autocomplete="email"`, `autocomplete="tel"`, `autocomplete="organization"` as applicable.
- [ ] `[MEDIUM]` Do not block paste into any input field — users must be able to paste student IDs, emails, and other data.
- [ ] `[MEDIUM]` Client-side validation must run on blur and on submit. Server-side validation errors returned from the API must be mapped to the corresponding field and displayed inline.
- [ ] `[MEDIUM]` Required fields must be marked with `aria-required="true"` and a visible indicator (asterisk or text).

---

## Design Consistency

> The DIU Lens aesthetic is dark, cinematic, institutional. Consistency is enforced through CSS custom properties defined in `globals.css` and the shadcn/ui theme system.

- [ ] `[HIGH]` All color values must reference CSS custom properties (`var(--primary)`, `var(--background)`, `var(--muted-foreground)`, etc.). No hardcoded hex or rgb values in component files.
- [ ] `[HIGH]` Use the design system's spacing scale via Tailwind classes (`p-4`, `gap-6`, `mt-8`). Do not use arbitrary pixel values (`p-[13px]`) unless matching an external constraint.
- [ ] `[HIGH]` The border-radius system is defined via `--radius` in `globals.css` (`--radius-sm` through `--radius-4xl`). Use the corresponding Tailwind classes (`rounded-sm`, `rounded-lg`, etc.) — do not introduce custom radius values.
- [ ] `[HIGH]` Typography must follow the established scale: `font-sans` (DM Sans) for body text, `font-heading` (Space Grotesk) for headings. Font sizes should use Tailwind's type scale (`text-sm`, `text-lg`, `text-4xl`).
- [ ] `[MEDIUM]` The primary brand accent is `--primary: oklch(0.76 0.055 230)` (muted ice-blue, approximately `#6493b5`). Use it for interactive elements, focus rings, and accent highlights. Do not introduce competing accent colors.
- [ ] `[MEDIUM]` Background surfaces must follow the established depth hierarchy: `--background` → `--card` → `--popover` → `--muted`, each progressively lighter. Glassmorphism effects use `backdrop-blur` with `bg-background/80` or similar alpha variants.
- [ ] `[MEDIUM]` Shadows must use the dark-UI shadow system (low-opacity, large-blur shadows). Do not use Tailwind's default `shadow-md` or `shadow-lg` without adjusting for the dark palette.
- [ ] `[MEDIUM]` Reuse existing shadcn/ui components (`Button`, `Card`, `Input`, `Label`) from `components/ui/` before creating custom components. Check the existing inventory before installing new component libraries.
- [ ] `[MEDIUM]` Icons must come from Lucide (`lucide-react`). Do not mix icon libraries. Icon sizes should follow the component context: 16px in buttons, 20px in navigation, 24px in hero sections.

---

## Responsive Design

> DIU Lens must work on university lab desktops, student laptops, and mobile phones used for face verification at entry points.

- [ ] `[CRITICAL]` The viewport meta tag must be set correctly: `width=device-width, initialScale=1`. Do not set `maximum-scale=1` or `user-scalable=no` — these violate WCAG 1.4.4.
- [ ] `[HIGH]` Follow mobile-first responsive design: base styles target mobile, then scale up with `sm:`, `md:`, `lg:`, `xl:` breakpoints. Do not write desktop-first styles with `max-width` overrides.
- [ ] `[HIGH]` All touch targets (buttons, links, toggles) must be at least 44×44px on mobile. Use Tailwind's `min-h-[44px] min-w-[44px]` where the default component size is smaller.
- [ ] `[HIGH]` The camera capture UI must adapt to screen size: full-width viewfinder on mobile, centered constrained viewfinder on desktop. Test at 320px, 375px, 768px, and 1280px widths.
- [ ] `[HIGH]` Handle orientation changes during face capture — if the device rotates mid-capture, re-initialize the camera stream with updated constraints. Show a recommendation to use portrait mode.
- [ ] `[MEDIUM]` Use CSS `safe-area-inset-*` (via Tailwind's `pb-safe`) on bottom-fixed elements to prevent content from being hidden behind notches or home indicators on iOS.
- [ ] `[MEDIUM]` Adhere to defined breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px). Do not introduce custom breakpoints without documenting them.
- [ ] `[MEDIUM]` The admin dashboard layout must collapse its sidebar on mobile into a hamburger menu or bottom sheet. Data tables must either scroll horizontally or reflow into card layouts.
- [ ] `[MEDIUM]` No horizontal scrolling at any standard viewport width (320px through 1920px). Use `overflow-x-hidden` on the root only as a last resort — fix the layout instead.

---

## Error Handling

> Errors in a biometric system can mean failed enrollments, lost capture data, or locked-out administrators. Every error must be recoverable and communicable.

- [ ] `[CRITICAL]` Camera permission denial must be handled with a dedicated UI state — explain why the camera is needed, link to browser settings instructions, and provide a "Try Again" action.
- [ ] `[CRITICAL]` React Error Boundaries must wrap the camera capture module, the admin dashboard, and any route segment that renders dynamic data. Display a fallback UI with a retry action, not a blank screen.
- [ ] `[HIGH]` API errors must be normalized into user-readable messages. Never display raw error objects, HTTP status codes, or stack traces to the user. Map common codes: 401 → "Session expired", 403 → "Access denied", 422 → field-specific validation, 500 → "Something went wrong".
- [ ] `[HIGH]` Network failures (timeout, offline, DNS) must show a distinct UI state with a retry mechanism. Use `navigator.onLine` and the `online`/`offline` events as a baseline, and verify with an actual fetch to the health endpoint.
- [ ] `[HIGH]` Failed enrollment uploads must not discard captured face images. Retain the data in client state and offer a "Retry Upload" action before allowing the user to re-capture.
- [ ] `[MEDIUM]` All `fetch` calls and async operations must have `try/catch` error handling. Unhandled promise rejections must never reach the console in production.
- [ ] `[MEDIUM]` Toast notifications for errors must use `role="alert"` and persist until manually dismissed (not auto-dismiss) for error-severity messages.
- [ ] `[MEDIUM]` Loading states must have a timeout — if an API call exceeds 15 seconds, show a timeout message with a retry option rather than spinning indefinitely.
- [ ] `[MEDIUM]` Graceful degradation: if WebGL or WASM is unavailable (older browsers), show a message listing supported browsers rather than crashing silently.

---

## Authentication Screens

> Login and session management are the gateway to the admin panel and protected operations. Security and usability must be balanced.

- [ ] `[CRITICAL]` Password inputs must use `type="password"` with `autocomplete="current-password"` (login) or `autocomplete="new-password"` (registration). Never suppress browser password managers.
- [ ] `[CRITICAL]` After successful authentication, redirect to the originally requested URL (stored before redirect to login) or the default dashboard. Do not hardcode a single redirect target.
- [ ] `[HIGH]` Login forms must include CSRF protection — send a CSRF token in a hidden field or custom header validated by the backend.
- [ ] `[HIGH]` Rate limiting feedback: when the backend returns a 429, display a message with the retry-after duration. Disable the submit button during the cooldown period.
- [ ] `[HIGH]` Loading state must be shown during authentication — disable the submit button, show a spinner, and set `aria-busy="true"` on the form.
- [ ] `[MEDIUM]` Password visibility toggle must be implemented as a button (not a checkbox) with `aria-label="Show password"` / `aria-label="Hide password"` and `type="button"` to prevent form submission.
- [ ] `[MEDIUM]` Failed login attempts must show a generic error ("Invalid credentials") — do not reveal whether the username or password was incorrect.
- [ ] `[MEDIUM]` Session expiration must be communicated: show a warning before the session expires (if feasible) and redirect to login with a "Session expired" message on 401 responses.
- [ ] `[MEDIUM]` The login page must not be accessible to already-authenticated users — redirect them to the dashboard.

---

## Enrollment Screens

> Enrollment captures biometric face data through a multi-step flow involving camera access, face detection, multi-angle capture, and upload. Failures here directly affect the biometric database.

- [ ] `[CRITICAL]` Camera permission flow must follow a three-state pattern: (1) pre-request explanation UI, (2) browser permission prompt, (3) post-grant camera feed or post-denial recovery UI. Never show a blank screen during any state.
- [ ] `[CRITICAL]` Face detection feedback must be real-time and multimodal: visual overlay (bounding box, guide frame) plus text status (e.g., "Move closer", "Face detected", "Hold still"). Screen readers must receive status updates via `aria-live` region.
- [ ] `[CRITICAL]` Upload progress must be visible — show a progress bar or percentage for image uploads. If the upload fails, preserve captured images and offer retry without re-capture.
- [ ] `[HIGH]` Multi-angle capture progress must show which angles have been captured (front, left, right) and which remain. Use a step indicator with `aria-current="step"`.
- [ ] `[HIGH]` Image quality validation feedback must be immediate and specific: "Image too dark", "Face too small", "Blurry — hold steady". Do not silently reject captures.
- [ ] `[HIGH]` The enrollment session must persist across accidental navigation — warn before leaving with `beforeunload` if captures are in progress but not uploaded.
- [ ] `[HIGH]` Completion confirmation must be explicit: show a success screen with the enrollment details (student ID, name, timestamp) and a clear call-to-action to proceed.
- [ ] `[MEDIUM]` Error recovery must not require restarting the entire flow. If step 3 of 4 fails, allow retrying step 3 without losing data from steps 1 and 2.
- [ ] `[MEDIUM]` Camera resolution constraints must be specified in `getUserMedia`: request at least 640×480 for adequate face detection, prefer 1280×720 when available.
- [ ] `[MEDIUM]` On devices with multiple cameras, provide a camera switcher (front/back) with `aria-label="Switch camera"`.

---

## Admin Dashboard Screens

> The admin dashboard manages enrollments, views recognition logs, monitors system health, and performs destructive operations (delete enrollment, reset embeddings). It must be secure, accessible, and responsive.

- [ ] `[CRITICAL]` Route protection: all `/admin/*` routes must verify authentication and authorization server-side (via Next.js middleware or server component checks). Unauthenticated access must redirect to login; unauthorized access must show a 403 screen (the existing `AdminAccessDenied` component).
- [ ] `[CRITICAL]` Destructive actions (delete enrollment, purge audit logs) must require a confirmation dialog. The dialog must name the specific action and affected entity. The confirm button must not be pre-focused.
- [ ] `[HIGH]` Data tables must be accessible: use `<table>`, `<thead>`, `<th scope="col">`, `<tbody>`, and `<td>` elements. Column headers must be programmatically associated with data cells.
- [ ] `[HIGH]` Pagination controls must announce the current page and total pages to screen readers. Use `aria-label="Page 2 of 10"` on the active page indicator.
- [ ] `[HIGH]` Loading states for data fetches must show skeleton placeholders (not spinners) matching the expected layout to prevent CLS.
- [ ] `[HIGH]` System health indicators (queue depth, worker status, Redis connectivity) must update on a reasonable interval (every 30s) with visual differentiation (green/yellow/red) and text labels for accessibility.
- [ ] `[MEDIUM]` Audit trail views must support filtering by date range, event type, and student ID. Filters must be keyboard-accessible and announce applied filters.
- [ ] `[MEDIUM]` The admin layout must be responsive: sidebar collapses on viewports below `lg` (1024px). Navigation must remain accessible via a hamburger menu or bottom drawer.
- [ ] `[MEDIUM]` Long lists (enrollment records, recognition logs) must implement virtual scrolling or server-side pagination. Do not render more than 50 rows in the DOM simultaneously.
- [ ] `[MEDIUM]` Sorting controls on table columns must use `aria-sort="ascending"`, `aria-sort="descending"`, or `aria-sort="none"` to communicate sort state.

---

## References

- [Front-End Checklist](https://github.com/thedaviddias/Front-End-Checklist) — Source checklist (MIT license)
- [WCAG 2.1 AA](https://www.w3.org/TR/WCAG21/) — Accessibility conformance target
- [Next.js Security Headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers) — Header configuration reference
- [MDN: getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) — Camera API reference
