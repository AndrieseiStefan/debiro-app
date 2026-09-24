# UI Foundation

**Status:** Implemented for TASK-003, responsive contract finalized in TASK-003A, and page-shell contract standardized in TASK-003B. No canonical product screen or visual-regression baseline is approved.

## Canonical source and scope

All ten 1448 × 1086 images in [mockups/](mockups/README.md) were inspected. They remain the contract for each later screen's composition, behavior, typography, and exact visible Romanian copy. This foundation extracts only recurring treatments; it is not approval of a screen or permission to reinterpret one. Sample names and counts are not locked. The only approved mockup-copy substitution is temporary `ComplyHub` branding to plain uppercase `DEBIRO`.

The desktop mockups repeatedly show a pale page background, white bordered surfaces, dark blue text, blue primary actions, restrained status colors, and a spacious 4/8px-based rhythm. App views use an approximately 260px sidebar, 72px top bar, 28px content gutters, 12px card corners, and 8px field corners. The invite/review side panel is approximately 502px wide. These are starting measurements, not blanket overrides of individual mockup geometry. The ten original image files are unchanged.

## Typography and tokens

`src/styles/tokens.css` contains the small semantic source of truth for surfaces, text, actions, borders, focus, status colors and their soft backgrounds, spacing, radii, two subtle elevations, and recurring shell dimensions. Component CSS consumes these tokens, not a framework palette. No dark theme is defined because none is approved.

Inter Variable is self-hosted from `@fontsource-variable/inter`; the exact mockup family cannot be identified conclusively and Inter is provisional. Common scales are display 52px, page title 42px, section title 22px, card title 18px, body 16px, label 14px, and caption 12px. Headings use approximately 700–750 weight and tight tracking; body copy uses a 1.5 line height. Each future screen must compare rendered text wraps and weights against its own mockup and refine these values where warranted. `src/styles/globals.css` provides only reset/focus/media basics and reusable typography classes. All component-specific styling is in CSS Modules.

## Components and structure

`src/components/ui/` provides Button (primary, secondary, ghost, destructive, disabled, loading), Field (label/helper/error/required/readonly/disabled), Surface, StatusBadge (visual tones only), Divider, LoadingBlock, EmptyState, and ErrorState. StatusBadge deliberately does not encode document/business statuses. Button loading disables repeat activation. Field errors have text and associated semantics. The loading block reserves space and has a screen-reader label; no perpetual decorative animation is required.

`src/components/layout/` provides PublicContainer, PortalContainer, and PageContainer with one shared page-shell geometry, plus a compositional AppShell. Shell slots are passed in; no navigation, tenancy, or authentication is embedded. `src/components/brand/BrandWordmark.tsx` renders only `DEBIRO` as text in the application font. No logo or icon package is present.

E1-003 composes AppShell into a separate `AuthenticatedAppShell` with `AppSidebar` and `AppTopBar` for product screens. The authenticated shell currently has no session or route guard. Its layout contract is defined below.

For each new canonical screen, inspect and reuse existing components and page containers before adding a primitive; compose existing pieces or keep screen-specific UI inside its feature. Implemented screens are regression-protected. Change shared components used by them only for a necessary reusable requirement, keep the change backward-compatible unless an explicit migration task says otherwise, and revalidate every affected existing screen. Do not refactor unrelated working UI as part of a new screen task.

## View data and localization

Each screen owns its view data beside the feature (for example `src/features/<feature>/types.ts`). When an input-dependent source is needed, its page can use `ViewDataSource<TInput, TView>` from `src/lib/view-data.ts`. During visual-first work, deterministic fixtures provide the view; later a server/application adapter can provide the same view shape. Presentation components receive typed view props and never import fixtures, provider SDKs, or demo records directly. E1-001's landing page uses a typed static miniature-dashboard fixture, and E1-002's onboarding screen uses a typed first-step form fixture and local client state. Neither defines a business-domain schema.

`next-intl` uses `messages/ro.json` as source and `messages/en.json` as the secondary catalog. Romanian is canonical at `/`; English is at `/en` (`localePrefix: 'as-needed'`). `/ro` redirects to `/`. Foundation-only keys use the `Foundation` namespace. Server pages resolve messages through the i18n layer; user-facing primitives receive text as props. Missing keys throw in development, and tests assert locale-key parity. Screen tasks transcribe approved Romanian copy exactly and supply English translations for review.

## Page Shell Contract

Public/pre-auth top-level page content uses the shared container implementation in `src/components/layout/Containers.module.css`: `width: 100%`, `max-width: 1350px`, `margin-inline: auto`, and `box-sizing: border-box`. The 1350px cap is the complete outer box, including horizontal padding—not 1350px of content plus padding. Landing sections use PublicContainer; onboarding uses PageContainer. The existing PortalContainer has the same default geometry. Screen-specific inner widths belong inside this public shell.

The public shell's responsive horizontal padding is 32px on desktop (≥1200px), 24px on tablet (768–1199px), and 16px on mobile (<768px). Below 1350px, the shell fills the available width with those gutters. Above 1350px, its width stops growing and equal automatic outer margins grow with the viewport; do not hardcode large-screen margins or duplicate shell rules in feature CSS. Page backgrounds and decorative layers may remain full bleed outside the content shell. Authenticated pages use the separate contract below.

## Authenticated App Shell Contract

The authenticated application is a separate top-level layout family. `AuthenticatedAppShell` composes the existing `AppShell`, `AppSidebar`, and `AppTopBar`; Dashboard is its first consumer. The shell fills the available viewport width, with no public 1350px maximum or centered outer margins. The sidebar takes 260px on desktop, the 72px app top bar and fluid main area take the remaining width, and the main content has controlled internal gutters: 30px left/28px right on desktop, 24px on tablet, and 16px horizontally on mobile. Authenticated panels may expand with available width, including on ultra-wide displays; no arbitrary content cap is approved.

On desktop, the sidebar is sticky at the viewport top and occupies `100dvh`. Its brand and company/profile footer stay visible while the main document scrolls normally; navigation scrolls inside the sidebar if viewport height is short. The profile area remains near the visible sidebar bottom, independent of main-content height. At the shell's local 800px collision point, the sidebar becomes the existing compact, horizontally scrollable navigation strip above the app top bar. This is a structural E1 fallback, not an approved mobile drawer or new global layout mode.

The shared authenticated shell owns sidebar geometry, viewport behavior, top-bar placement, main width, internal gutters, and shell reflow. Feature pages own their headings, actions, cards, tables, and feature-specific composition. From E1-004 onward, applicable product screens reuse `AuthenticatedAppShell`; they must not recreate a sidebar or app top bar, use `PublicHeader`, or apply the public centered page-shell constraint. Search and profile/notification affordances remain visual-only until their workflows are implemented.

## Shared Header Contract

Landing and onboarding use one public/pre-auth `PublicHeader`, and future applicable pages must reuse it. Its inner content uses the same centered 1350px page shell and responsive gutters (32px desktop, 24px tablet, 16px mobile). The top brand area contains only the text wordmark `DEBIRO`; screen-specific taglines do not appear beneath it. The header shares geometry, shell, brand placement, locale behavior, and responsive layout infrastructure, but each page configures its own optional navigation, help, authentication, and primary CTA regions. This must not create separate header implementations. Landing shows navigation, locale, authentication, and trial CTA; onboarding shows only brand, help, and locale.

The single-row header has a deterministic 66px outer height with vertically centered content. Landing retains its approved local reflow: navigation hides below 864px; brand, compact locale, authentication, and trial CTA stay on one row through 497px; at 496px and below, authentication and trial CTA move together to a second row. Onboarding has fewer actions and stays on one row while brand, help, and locale fit cleanly. At its separate 396px header-local collision point, brand and locale stay on row one while help moves to a centered second row. Locale and help retain intrinsic widths. These configuration-specific transitions do not change the three global layout modes or canonical gutters.

## Responsive Contract

Product UI has exactly three global layout modes:

| Mode | Width | Normal content gutter |
| --- | --- | --- |
| Desktop | 1200px and wider | 32px |
| Tablet | 768–1199px | 24px |
| Mobile | Below 768px | 16px |

Header, hero, and normal content sections share the page shell's left and right grid edges. New shared layout spacing follows an 8px rhythm where practical; 4px is available for small optical adjustments. Existing mockup-matched internal measurements are not changed mechanically.

Desktop layouts preserve approved composition and reflow before content collides. On tablet, multi-column hero content stacks: copy expands to the available container width, remains left aligned, and precedes a proportionally scaled dashboard within the grid. The Landing header stays on one row and hides navigation below 864px, its measured header-only collision point; it must not wrap accidentally. Its reduced action set stays on one row through 497px, then deliberately moves authentication and CTA to a second row at 496px and below. The Onboarding header follows its separate, lighter action configuration as documented above. These thresholds do not create another global layout mode. On mobile, essential content remains in semantic order, controls and trust items stack, and the dashboard stays inside 16px gutters. Decorative elements remain anchored to their section or preview and may be hidden when they compete with functional content. Feature cards reduce column count before text or numbering collides. No mode permits avoidable document-level horizontal scrolling, clipping, or functional overlap.

The primary visual matrix is desktop 1448 × 1086, tablet 1024 × 768, and mobile 375 × 812. Regression checks also cover the 1200/1199 and 768/767 transitions, plus 950px and 320px safety widths. `e2e/support/viewports.ts` centralizes these test dimensions. A component-local breakpoint is permitted only to prevent a demonstrated content collision; it must not create another global mode or serve pixel tweaking.

For E1 UI tasks, broken reflow, inappropriate desktop text width after stacking, missing gutters, accidental header wrapping, detached decoration, overlap, clipping, incorrect order, unreadable controls, and page-level horizontal overflow block completion. Minor spacing, subtle alignment or typography differences, decorative placement, shadows, radii, and pixel-level responsive polish may wait for E2. E1-003 and later UI tasks must reference this contract rather than invent a new breakpoint system.

## Accessibility baseline

Containers and shell columns use bounded widths and `minmax(0, 1fr)` to avoid document-level horizontal overflow. The sidebar shell stacks below 800px; this is a component-local structural fallback, not a fourth global mode or an approved mobile product design. Screen-specific layouts and tables must be validated when implemented. Focus-visible outlines, semantic buttons/landmarks, native disabled behavior, label/input associations, `aria-invalid`, text errors, and accessible loading/status treatment are present. No visual deviation from the approved desktop mockups was intentionally introduced for accessibility; future conflicts must be minimized and reported.

Responsive tests cover document overflow, page gutters, content order, control visibility, and geometric collisions; they do not establish pixel-perfect mobile baselines.

## Visual validation workflow

Run `npm run dev`, inspect `/__dev/design-system` (or `/en/__dev/design-system`), and use `npm run visual:capture` to write an ignored screenshot to `artifacts/visual/`. Set `VISUAL_ROUTE=/path` for a later screen. The Playwright capture uses Chromium, 1448 × 1086, Romanian locale, Bucharest timezone, reduced motion, fixed time, and font readiness. Compare each implemented screen side by side with its original in `docs/design/mockups/`, adjust, and obtain product-owner approval before adding CI screenshot baselines. Generated captures never overwrite the canonical mockups. The preview is development-only and returns 404 in production.

## Remaining uncertainty and deviations

Exact font provenance, antialiasing, individual screen spacing, mobile composition, and any screen-specific icon treatment remain to be verified against each mockup during its implementation. Token measurements are approximate where the raster image cannot establish CSS dimensions exactly. Approved material deviations: none. The preview is deliberately a component specimen, not a reproduced product screen.
