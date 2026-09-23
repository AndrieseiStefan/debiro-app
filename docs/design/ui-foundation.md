# UI Foundation

**Status:** Implemented for TASK-003. No canonical product screen or visual-regression baseline is approved.

## Canonical source and scope

All ten 1448 × 1086 images in [mockups/](mockups/README.md) were inspected. They remain the contract for each later screen's composition, behavior, typography, and exact visible Romanian copy. This foundation extracts only recurring treatments; it is not approval of a screen or permission to reinterpret one. Sample names and counts are not locked. The only approved mockup-copy substitution is temporary `ComplyHub` branding to plain lowercase `debiro`.

The desktop mockups repeatedly show a pale page background, white bordered surfaces, dark blue text, blue primary actions, restrained status colors, and a spacious 4/8px-based rhythm. App views use an approximately 260px sidebar, 72px top bar, 28px content gutters, 12px card corners, and 8px field corners. The invite/review side panel is approximately 502px wide. These are starting measurements, not blanket overrides of individual mockup geometry. The ten original image files are unchanged.

## Typography and tokens

`src/styles/tokens.css` contains the small semantic source of truth for surfaces, text, actions, borders, focus, status colors and their soft backgrounds, spacing, radii, two subtle elevations, and recurring shell dimensions. Component CSS consumes these tokens, not a framework palette. No dark theme is defined because none is approved.

Inter Variable is self-hosted from `@fontsource-variable/inter`; the exact mockup family cannot be identified conclusively and Inter is provisional. Common scales are display 52px, page title 42px, section title 22px, card title 18px, body 16px, label 14px, and caption 12px. Headings use approximately 700–750 weight and tight tracking; body copy uses a 1.5 line height. Each future screen must compare rendered text wraps and weights against its own mockup and refine these values where warranted. `src/styles/globals.css` provides only reset/focus/media basics and reusable typography classes. All component-specific styling is in CSS Modules.

## Components and structure

`src/components/ui/` provides Button (primary, secondary, ghost, destructive, disabled, loading), Field (label/helper/error/required/readonly/disabled), Surface, StatusBadge (visual tones only), Divider, LoadingBlock, EmptyState, and ErrorState. StatusBadge deliberately does not encode document/business statuses. Button loading disables repeat activation. Field errors have text and associated semantics. The loading block reserves space and has a screen-reader label; no perpetual decorative animation is required.

`src/components/layout/` provides PublicContainer, PortalContainer, PageContainer, and a compositional AppShell. Shell slots are passed in; no navigation, tenancy, or authentication is embedded. `src/components/brand/BrandWordmark.tsx` renders only `debiro` as text in the application font. No logo or icon package is present.

## View data and localization

A future screen owns its `TInput` and `TView` beside the feature (for example `src/features/<feature>/types.ts`). Its page requests a `ViewDataSource<TInput, TView>` from `src/lib/view-data.ts`. During visual-first work, one deterministic fixture adapter returns that view; later a server/application adapter returns the same view shape. Presentation components receive the typed view as props and never import fixtures, provider SDKs, or demo records directly. No business-domain schema is defined by TASK-003.

`next-intl` uses `messages/ro.json` as source and `messages/en.json` as the secondary foundation catalog. Romanian is canonical at `/`; English is at `/en` (`localePrefix: 'as-needed'`). `/ro` redirects to `/`. Foundation-only keys use the `Foundation` namespace. Server pages resolve messages through the i18n layer; user-facing primitives receive text as props. Missing keys throw in development, and tests assert locale-key parity. Screen tasks must transcribe approved Romanian copy exactly and submit English copy for review; no mockup copy has been pretranslated here.

## Responsive and accessibility baseline

Containers and shell columns use bounded widths and `minmax(0, 1fr)` to avoid document-level horizontal overflow. The sidebar shell stacks below 800px; this is a safe structural fallback, not an approved mobile product design. Screen-specific layouts and tables must be validated when implemented. Focus-visible outlines, semantic buttons/landmarks, native disabled behavior, label/input associations, `aria-invalid`, text errors, and accessible loading/status treatment are present. No visual deviation from the approved desktop mockups was intentionally introduced for accessibility; future conflicts must be minimized and reported.

## Visual validation workflow

Run `npm run dev`, inspect `/__dev/design-system` (or `/en/__dev/design-system`), and use `npm run visual:capture` to write an ignored screenshot to `artifacts/visual/`. Set `VISUAL_ROUTE=/path` for a later screen. The Playwright capture uses Chromium, 1448 × 1086, Romanian locale, Bucharest timezone, reduced motion, fixed time, and font readiness. Compare each implemented screen side by side with its original in `docs/design/mockups/`, adjust, and obtain product-owner approval before adding CI screenshot baselines. Generated captures never overwrite the canonical mockups. The preview is development-only and returns 404 in production.

## Remaining uncertainty and deviations

Exact font provenance, antialiasing, individual screen spacing, mobile composition, and any screen-specific icon treatment remain to be verified against each mockup during its implementation. Token measurements are approximate where the raster image cannot establish CSS dimensions exactly. Approved material deviations: none. The preview is deliberately a component specimen, not a reproduced product screen.
