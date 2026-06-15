# DIU Lens — Design Principles

> Reference specification for the DIU Lens frontend. All contributors and agents must treat this document as the source of truth for visual and interaction decisions.

---

## Philosophy

DIU Lens optimizes for **trust**, **clarity**, and **operational reliability**. The interface communicates institutional authority and security. Every design decision serves one of three goals:

1. **Enrollment quality** — the interface must guide users toward clean, usable biometric captures.
2. **Administrator efficiency** — dashboards and management views prioritize scan-ability and fast task completion.
3. **Student confidence** — verification flows must feel secure and predictable, never theatrical.

**Core principle: function defines form.** Visual elements exist to improve task completion, not to impress. If a decorative element cannot be justified by a measurable UX outcome, it does not belong.

This is an institutional biometric identity system. It is not a portfolio piece, a startup landing page, or a consumer product.

---

## Visual Identity

### Color Palette

| Token | Value | OKLCH | Usage |
|---|---|---|---|
| **Background base** | `#08111f` | `oklch(0.148 0.008 248)` | Root `<body>` background, page-level canvas |
| **Background layer 1** | `#0b1422` | — | Gradient midpoint, card containers |
| **Background layer 2** | `#0d1728` | — | Gradient endpoint, elevated surfaces |
| **Primary accent** | `#6493b5` | `oklch(0.76 0.055 230)` | Interactive elements, active states, brand identity |
| **Text primary** | `#f8fafc` | `oklch(0.93 0.005 250)` | Headings, body copy, high-priority labels |
| **Text secondary** | `#94a3b8` | — (slate-400 equivalent) | Descriptions, metadata, timestamps |
| **Text muted** | `#64748b` | — (slate-500 equivalent) | Placeholders, disabled labels, tertiary info |
| **Destructive** | — | `oklch(0.704 0.191 22.216)` | Rejection states, error alerts, delete confirmations |
| **Card surface** | — | `oklch(0.21 0.008 248)` | Card backgrounds, panel fills |
| **Border** | `rgba(255,255,255,0.05)` | — | Structural dividers, card edges, separators |

**Rules:**

- Never use saturated primaries. The palette is desaturated, professional, and low-contrast against dark surfaces.
- Backgrounds are always **gradients**, never flat solid fills. Layer `#08111f → #0b1422 → #0d1728` to create environmental depth.
- The primary accent `#6493b5` is muted ice-blue — institutional, never neon. It must not be swapped for brighter blues, purples, or greens.

### Typography

| Property | Value | Notes |
|---|---|---|
| **Body font** | DM Sans | CSS variable: `--font-sans` |
| **Heading font** | Space Grotesk | CSS variable: `--font-heading` — currently aliased to `--font-sans` in the CSS config |
| **Body size** | `~0.85rem` | Standard paragraph and table text |
| **Heading size** | `1.2rem – 1.5rem` | Section and card headings |
| **Label size** | `~0.75rem` | Form labels, badge text, metadata |
| **Heading tracking** | `-0.01em` to `-0.015em` | Negative tracking tightens headings |
| **Label tracking** | `0.15em` to `0.35em` | Wide tracking for labels, badges, status chips |
| **Heading weight** | `600` (Semibold) | — |
| **Body weight** | `500` (Medium) | — |
| **Secondary weight** | `400` (Regular) | Descriptions, muted text |

**Rules:**

- Use `rem`-based sizing exclusively. No `px` for font sizes.
- Maximum two font families in the entire application.

---

## Spacing System

All spacing values are multiples of **4px**. Arbitrary values (e.g., `13px`, `7px`, `11px`) are prohibited.

| Token | Value | rem | Usage |
|---|---|---|---|
| `space-1` | 4px | `0.25rem` | Micro gaps: icon-to-label, inline element separation |
| `space-2` | 8px | `0.5rem` | Tight spacing: list item padding, badge internal padding |
| `space-3` | 12px | `0.75rem` | Form element gaps: input-to-input, checkbox groups |
| `space-4` | 16px | `1rem` | Standard padding: card content, button padding |
| `space-6` | 24px | `1.5rem` | Section padding: card outer padding, group separators |
| `space-8` | 32px | `2rem` | Major section gaps: between card groups, panel breaks |
| `space-10` | 40px | `2.5rem` | Page section separators |
| `space-12` | 48px | `3rem` | Hero spacing, top-level page margins |

---

## Shadow System

All shadows use **black alpha channels**. No colored shadows except controlled glow effects on the primary accent.

| Level | Name | Value | Usage |
|---|---|---|---|
| **0** | Flat | None | Flush inline elements, embedded content |
| **1** | Elevated | `0 1px 2px rgba(0,0,0,0.2)` | Cards, buttons, form inputs |
| **2** | Raised | `0 4px 12px -2px rgba(0,0,0,0.3)` | Dropdowns, tooltips, popovers |
| **3** | Floating | `0 12px 40px -12px rgba(0,0,0,0.7)` | Modals, dialogs, command palette |
| — | Inset highlight | `inset 0 1px 0 rgba(255,255,255,0.03)` | Glass edge catch on card top borders |

---

## Border Radius System

The CSS variable `--radius` is the base unit. All radii are computed multiples of this base.

| Token | Value | px | Usage |
|---|---|---|---|
| `radius-xs` | `0.375rem` | 6px | Small badges, chips, status dots |
| `radius-sm` | `0.5rem` | 8px | Buttons, inputs, small interactive elements |
| `radius-md` | `0.75rem` | 12px | Cards, panels, dropdown menus |
| `radius-lg` | `1rem` | 16px | Modals, large cards, detail views |
| `radius-xl` | `1.25rem` | 20px | Page-level containers, section wrappers |
| `radius-2xl` | `1.5rem` | 24px | Hero elements, registration shell |
| `radius-full` | `9999px` | — | Pills, avatars, circular indicators |

**Rule:** Never mix radius scales within the same component. A card with `radius-md` corners must not contain a nested element with `radius-lg` corners.

---

## Depth & Atmosphere

- **Layered backgrounds** create environmental depth. Surfaces are never flat solid colors — they use multi-stop gradients across the blue-black palette.
- **Film grain overlay** adds matte texture on landing pages only. It must not appear in the admin panel or operational views.
- **Backdrop blur** for glassmorphism: `24px` standard, up to `blur-3xl` for the admin shell sidebar/header.
- **Decorative layers** (grain, glow orbs, radial gradients) must use `aria-hidden="true"` and `pointer-events: none`. They are invisible to assistive technology and do not intercept clicks.
- **GPU-heavy effects** (blur >100px, complex multi-layer gradients, large SVG filters) must be disabled on mobile viewports via media queries or Tailwind responsive prefixes.

---

## Interaction Patterns

### Timing

| Type | Duration | Easing |
|---|---|---|
| Micro-interactions (hover, focus, toggle) | 200–300ms | `ease` or `ease-out` |
| Cinematic transitions (page, modal, step) | 400–600ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Loading spinners | Continuous | `linear` (via `animate-spin`) |

### States

| State | Treatment |
|---|---|
| **Hover** | Subtle opacity or color shift. Never triggers layout shift. |
| **Active / Press** | `scale(0.98)` to `scale(0.99)` for tactile feedback. |
| **Focus** | Visible `outline-ring` indicator. Must not rely on color alone. |
| **Disabled** | `opacity: 0.5`, `pointer-events: none`, `cursor: not-allowed`. |
| **Loading** | `Loader2` icon with `animate-spin`, always paired with descriptive text (e.g., "Processing enrollment…"). |

### Step Transitions

Multi-step flows (enrollment, verification) use Framer Motion `AnimatePresence`:

- **Enter**: `y: 10px → 0`, `opacity: 0 → 1`
- **Exit**: `y: 0 → -8px`, `opacity: 1 → 0`
- **Mode**: `wait` (outgoing completes before incoming starts)

---

## Contrast & Accessibility

- All text-on-background combinations **must meet WCAG AA** minimum contrast ratio of **4.5:1**.
- Interactive elements must have **visible focus indicators** using `outline-ring` or equivalent. Focus must never be invisible.
- The primary accent `#6493b5` on `#08111f` passes AA for **large text** (≥18px / 14px bold) but requires verification for small text. Use `#f8fafc` text on accent backgrounds when contrast is insufficient.
- All decorative elements (grain, glow, gradients) must carry `aria-hidden="true"`.
- Touch targets must be a minimum of **44×44px** on mobile.
- Motion-sensitive users: respect `prefers-reduced-motion` by disabling non-essential animations.

---

## Anti-Patterns

These are explicitly prohibited across the entire application:

| | Rule |
|---|---|
| ❌ | Use saturated or neon colors anywhere in the interface |
| ❌ | Apply colored text shadows |
| ❌ | Use more than 2 font families |
| ❌ | Create gradients with more than 3 color stops on interactive elements |
| ❌ | Add animations to elements that convey critical information (errors, status) |
| ❌ | Use text opacity below `0.5` for actionable or clickable text |
| ❌ | Mix border-radius scales within the same component |
| ❌ | Add decorative animations in the admin panel |
| ❌ | Use light or white backgrounds in the default dark theme context |
| ❌ | Use `px` units for font sizes |
| ❌ | Add GPU-intensive effects without mobile fallbacks |
| ❌ | Rely on color alone to communicate state changes |
