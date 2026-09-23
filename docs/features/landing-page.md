# Landing page (E1-001)

**Canonical source:** [01-landing-page.png](../design/mockups/01-landing-page.png), 1448 × 1086. This screen is implemented but not product-owner visually approved.

Romanian `/` reproduces the reference's header, hero, miniature dashboard, feature cards, partner/metric row, and pricing teaser. English `/en` uses the same structure and a secondary translation that awaits product-owner review. The only intentional Romanian copy substitution is `ComplyHub` → lowercase `debiro`. The brand is text-only, without the temporary mockup symbol or any new logo.

The miniature dashboard and partner names are deterministic, typed marketing-preview data passed by the route into the landing feature. They are not a functional dashboard or a persistence/domain model. The page has no API, auth, or external provider dependency. `Prețuri` scrolls to the pricing teaser, and the RO/EN control changes locale. Product, solutions, resources, login, trial, video, feature-detail, and plan destinations are visually present but intentionally inactive (`aria-disabled`) until their flows exist; no fake route or `href="#"` is used.

Initial visual comparison was performed with `VISUAL_ROUTE=/ npm run visual:capture`. Major desktop landmarks closely align with the reference; no baseline is approved. Known approximations: the mockup's detailed mountain artwork and sample company marks are represented by CSS/text because no approved source assets are present; the miniature dashboard is live HTML/CSS rather than an embedded screenshot; Inter remains the provisional font. Desktop copy and geometry should receive product-owner review in E2. Narrow layouts conservatively reflow without document-level horizontal overflow; no canonical mobile mockup exists.
