# Dashboard overview (E1-003)

The directly accessible `/dashboard` and `/en/dashboard` routes implement the authenticated-looking overview from [mockup 03](../design/mockups/03-dashboard-overview.png). This is a fixture-backed E1 screen, not a signed-in product flow.

`DashboardPage` receives a typed `DashboardViewModel` from `src/features/dashboard/fixtures.ts`. The fixture supplies the greeting, organization, navigation badge count, four KPI values, document rows, supplier-status values, and recent activity. Counts and percentages are presentation samples, not a persisted domain or compliance calculation. The Romanian mockup labels are retained with `ComplyHub` replaced by text-only `DEBIRO`; `/en/dashboard` has parallel English copy awaiting product-owner review.

The screen introduces `AuthenticatedAppShell` with its own `AppSidebar` and `AppTopBar`. It reuses low-level `AppShell`, `Button`, `Surface`, `StatusBadge`, `BrandWordmark`, locale routing, and tokens, but never the public/pre-auth header or the Landing marketing dashboard preview. Visible areas are the welcome/CTA row, four summary cards, attention-documents table, native CSS supplier-status donut and legend, recent activity, and closing illustration banner.

Search accepts local typing and locale links switch routes. Other visible navigation and actions are safely inactive until their flows are specified; there are no `#` destinations, real search, add-supplier flow, notifications panel, profile menu, authentication/session guard, API, database, or provider integration. The page has no remote loading/error state.

At desktop size the 260px sidebar and 72px top bar follow the mockup. Below the authenticated shell's local 800px collision point, the sidebar becomes a compact, horizontally scrollable navigation strip above the top bar. KPI and panel grids reduce columns, and the table scrolls inside its panel where necessary; the page itself does not scroll horizontally at tested 1024, 375, or 320px widths. A designed mobile navigation pattern remains a later product decision.

The bottom mountain artwork is a generated transparent illustration, not a mockup screenshot; its exact painting and the text-only brand differ from the raster reference. The canonical mockup is unchanged, and generated visual captures remain ignored, unapproved comparison artifacts.
