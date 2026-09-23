# UI Foundation

**Status:** Implemented for TASK-003. No canonical product screen or visual-regression baseline is approved.

## Canonical source and scope

All ten 1448 × 1086 images in [mockups/](mockups/README.md) were inspected. They remain the contract for each later screen's composition, behavior, typography, and exact visible Romanian copy. This foundation extracts only recurring treatments; it is not approval of a screen or permission to reinterpret one. Sample names and counts are not locked. The only approved mockup-copy substitution is temporary `ComplyHub` branding to plain uppercase `DEBIRO`.

The desktop mockups repeatedly show a pale page background, white bordered surfaces, dark blue text, blue primary actions, restrained status colors, and a spacious 4/8px-based rhythm. App views use an approximately 260px sidebar, 72px top bar, 28px content gutters, 12px card corners, and 8px field corners. The invite/review side panel is approximately 502px wide. These are starting measurements, not blanket overrides of individual mockup geometry. The ten original image files are unchanged.

## Typography and tokens

`src/styles/tokens.css` contains the small semantic source of truth for surfaces, text, actions, borders, focus, status colors and their soft backgrounds, spacing, radii, two subtle elevations, and recurring shell dimensions. Component CSS consumes these tokens, not a framework palette. No dark theme is defined because none is approved.

Inter Variable is self-hosted from `@fontsource-variable/inter`; the exact mockup family cannot be identified conclusively and Inter is provisional. Common scales are display 52px, page title 42px, section title 22px, card title 18px, body 16px, label 14px, and caption 12px. Headings use approximately 700–750 weight and tight tracking; body copy uses a 1.5 line height. Each future screen must compare rendered text wraps and weights against its own mockup and refine these values where warranted. `src/styles/globals.css` provides only reset/focus/media basics and reusable typography classes. All component-specific styling is in CSS Modules.

## Components and structure

`src/components/ui/` provides Button (primary, secondary, ghost, destructive, disabled, loading), Field (label/helper/error/required/readonly/disabled), Surface, StatusBadge (visual tones only), Divider, LoadingBlock, EmptyState, and ErrorState. StatusBadge deliberately does not encode document/business statuses. Button loading disables repeat activation. Field errors have text and associated semantics. The loading block reserves space and has a screen-reader label; no perpetual decorative animation is required.

`src/components/layout/` provides PublicContainer (1350px maximum width; page gutters of 28px desktop, 24px tablet, 20px mobile, and 16px narrow mobile), PortalContainer, PageContainer, and a compositional AppShell. Shell slots are passed in; no navigation, tenancy, or authentication is embedded. `src/components/brand/BrandWordmark.tsx` renders only `DEBIRO` as text in the application font. No logo or icon package is present.

## View data and localization

Each screen owns its view data beside the feature (for example `src/features/<feature>/types.ts`). When an input-dependent source is needed, its page can use `ViewDataSource<TInput, TView>` from `src/lib/view-data.ts`. During visual-first work, deterministic fixtures provide the view; later a server/application adapter can provide the same view shape. Presentation components receive typed view props and never import fixtures, provider SDKs, or demo records directly. E1-001's landing page follows this with a static, typed miniature-dashboard fixture; it does not define a business-domain schema.

`next-intl` uses `messages/ro.json` as source and `messages/en.json` as the secondary foundation catalog. Romanian is canonical at `/`; English is at `/en` (`localePrefix: 'as-needed'`). `/ro` redirects to `/`. Foundation-only keys use the `Foundation` namespace. Server pages resolve messages through the i18n layer; user-facing primitives receive text as props. Missing keys throw in development, and tests assert locale-key parity. Screen tasks must transcribe approved Romanian copy exactly and submit English copy for review; no mockup copy has been pretranslated here.

## Responsive and accessibility baseline

Containers and shell columns use bounded widths and `minmax(0, 1fr)` to avoid document-level horizontal overflow. The sidebar shell stacks below 800px; this is a safe structural fallback, not an approved mobile product design. Screen-specific layouts and tables must be validated when implemented. Focus-visible outlines, semantic buttons/landmarks, native disabled behavior, label/input associations, `aria-invalid`, text errors, and accessible loading/status treatment are present. No visual deviation from the approved desktop mockups was intentionally introduced for accessibility; future conflicts must be minimized and reported.

Future E1 screens must check representative canonical desktop, compact desktop, tablet, mobile, and narrow-mobile widths. The landing page uses a concrete matrix of 1448 × 1086, 1280 × 800, 1024 × 768, 950 × 833, 768 × 1024, 480 × 900, 375 × 812, and 320 × 700. Its content-driven layout boundaries are 1200px, 992px, 768px, and 480px. Checks cover document overflow, page gutters, content order, control visibility, and geometric collisions; they do not establish pixel-perfect mobile baselines. Future screens should use an equivalent representative matrix and reflow before their own content collides.

## Visual validation workflow

Run `npm run dev`, inspect `/__dev/design-system` (or `/en/__dev/design-system`), and use `npm run visual:capture` to write an ignored screenshot to `artifacts/visual/`. Set `VISUAL_ROUTE=/path` for a later screen. The Playwright capture uses Chromium, 1448 × 1086, Romanian locale, Bucharest timezone, reduced motion, fixed time, and font readiness. Compare each implemented screen side by side with its original in `docs/design/mockups/`, adjust, and obtain product-owner approval before adding CI screenshot baselines. Generated captures never overwrite the canonical mockups. The preview is development-only and returns 404 in production.

## Remaining uncertainty and deviations

Exact font provenance, antialiasing, individual screen spacing, mobile composition, and any screen-specific icon treatment remain to be verified against each mockup during its implementation. Token measurements are approximate where the raster image cannot establish CSS dimensions exactly. Approved material deviations: none. The preview is deliberately a component specimen, not a reproduced product screen.
