# Landing page (E1-001)

**Canonical source:** [01-landing-page.png](../design/mockups/01-landing-page.png), 1448 × 1086. This screen is implemented but not product-owner visually approved.

Romanian `/` retains the reference's header, hero, miniature dashboard, feature cards and partner/metric row. E1-032Bh explicitly supersedes the teaser with full shared pricing below a viewport-aware presentation, and adds a minimal Resources section. English `/en` uses the same structure and a secondary translation that awaits product-owner review. The brand remains uppercase text-only `DEBIRO`, without the temporary mockup symbol or a new logo. All sections share the 1350px maximum-width public grid and its canonical desktop/tablet/mobile gutters. The hero text column contains all three trust items with a clear gap before the dashboard preview. Shared Button aligns CTA text and arrows centrally.

The miniature dashboard and partner names are deterministic, typed marketing-preview data passed by the route into the landing feature. They are not a functional dashboard or a persistence/domain model. The page has no API, auth, or external provider dependency. E1-024 header Login and header/hero trial links retain locale-aware `/login` and `/onboarding` client navigation. Video and feature-detail actions remain unavailable; no media, guides, delivery or extraction service is invented.

## Presentation and navigation (E1-032Bh)

Hero, benefits and trust form a normal-flow flex composition with `min-height: calc(100svh - var(--public-header-height))`, accounting for the 66px desktop header. Existing spacing tokens separate content without fixed sub-block heights, clipping or compression. Extra height is distributed between blocks; natural content may exceed short viewports. Pricing follows the entire presentation. Hero typography, blue accents, CSS clouds and live HTML/CSS preview are retained; the teaser's mountains/handwriting no longer sit beside a teaser CTA. Feature cards reflow 3/2/1, and below 1200px hero copy precedes its contained proportional preview. Inter remains provisional; no canonical mobile mockup exists.

The existing dropdown-looking controls had no menus or child destinations. They retain their chevrons but are now ordinary keyboard-accessible native section links: `#product` (hero), `#solutions` (benefits), `#pricing` (full catalog), `#resources`. No fake dropdown is added. The header remains non-sticky, so targets cannot be obscured beneath a fixed overlay; no scroll offsets or scroll engine are required. Native anchors preserve browser Back/Forward, direct access and reduced-motion safety (no animated scrolling). Locale activation reads the current browser hash and passes it to the existing locale router, without a separate anchor state store. Below the existing 864px header collision point, marketing links occupy their own row rather than disappearing. Existing account-action and pre-auth help-only reflows are preserved.

Resources is an explicitly approved compact coming-soon target with only a heading and the supplied RO/EN preparation message. It contains no fake guides, documentation, tutorials, Login/Onboarding CTAs or new route. Actual resource content remains open for product review.

## Shared pricing

Landing and authenticated Upgrade render `PlanCards.tsx` / `PlanCards.module.css` from the same `plan-catalog.ts`. They share rank ordering, tier names, prices, capability-derived bullets, icons, typography, Surface/Button treatment and 3/2/1 grid. No duplicate public card CSS or pricing array exists. The component reads only explicit presentation props/catalog/translations, never company/session/private billing state.

Marketing displays available tiers, with provisional centralized `marketingPlanConfig.featuredPlanId = Professional` as the sole blue emphasis; it does not infer popularity from company state or substitute another tier if unavailable. It never displays current-plan or trial metadata. Every public tier action uses locale-aware Onboarding, without persisting a selected tier, changing subscriptions or processing payments. The redundant View All Plans action is removed. Every card retains explicit E1 demo-price labeling. An empty displayable catalog yields a compact truthful unavailable state. Upgrade retains its separate current/next-tier/trial states and confirmed company-scoped actions; see [billing](company-plan-billing.md).

## Launch review and visual validation

Existing partner names/marks and `500+`, `98%`, `3x`, `99%` social-proof statistics are demo/unverified, **not verified real customers or measured outcomes**. Existing support, automatic-extraction/reminder and setup claims also need product/service readiness review before public launch. This task preserves them as requested, adds no claims, and does not implement those services. Plan prices/benefits and the marketing highlight remain provisional, not confirmed production offers.

The landing E2E suite captures initial 1920×1080, 1448×900, 1280×800 and shorter/tablet/mobile viewports, pricing grids and the shared Upgrade overlay under ignored `artifacts/visual/e1-032bh/`. Captures are for manual inspection, not approved baselines. Product-owner visual/commercial/copy approval remains pending. The [UI foundation](../design/ui-foundation.md#responsive-contract) remains the responsive source of truth.
