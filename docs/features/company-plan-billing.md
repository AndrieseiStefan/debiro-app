# Company Plan & Billing (E1-019 / E1-032Bd)

`/company/settings/billing` and `/en/company/settings/billing` render the active company's Plan & Billing page in the authenticated shell, following [mockup 19](../design/mockups/19-company-settings-plans-pay.png). Upgrade follows the visual hierarchy of [E1-032Bd](../design/mockups/e1-032bd-plan-upgrade.png), with explicit content overrides below. English copy and product-owner visual approval remain pending.

## Ownership and billing details

Each [accessible company](my-companies.md) owns its subscription, safe payment metadata and invoices. Current-user company membership supplies permissions; only the active company's Administrator can edit billing details, replace payment metadata or simulate an upgrade. Reviewer/Viewer are read-only. Every mutation revalidates active ownership, membership and input rather than trusting the open UI.

Billing Details reuses the shared Drawer, compact Field/SelectField, buttons, inline status/alert feedback and existing dirty-navigation confirmation. It prefills canonical Company name, CUI, registration number, contact person, address, city, region, postal code and country. These are the same values used by [Company Profile](company-profile.md), not duplicate billing identity/address records. Only billing email remains separate because it can differ from company contact email. Save is disabled while unchanged/invalid; Cancel/X/Escape or guarded navigation can discard a draft without mutation. Successful Save atomically updates the active company and immediately propagates its identity. CUI uniqueness and canonical profile validation are reused.

Active members consume seats; pending invitations do not. Used/available seats share [Members & Access](company-members-access.md)'s membership projection. Accessible-company count is user-context information, not a combined subscription.

## Invoices

History sorts deterministically by ISO date descending (ID tie-breaker), shows the latest three by default, and exposes View all/Show less only above three. E1-032Be reuses shared `SectionAction` and centralized RO/EN labels, down/up chevrons, section-header styling and `aria-expanded` button semantics, matching Notifications. Expansion displays all owned invoices without pagination. Zero invoices retain the empty state. The redundant page-level View All is removed. Reduced-width horizontal table containment and sample Download remain unchanged.

Download is the only row action. `INV-…-sample.csv` exports current owned invoice/company metadata with a localized prominent **not an official invoice** disclaimer; its tooltip identifies it as a sample. Download revalidates active company/access and invoice ownership. Shared CSV escaping neutralizes formulas. No official invoice, separate invoice page or provider resource is generated.

## Safe demo payment method

Change Card and the no-method Add Payment Method action reuse the shared Drawer/dirty guard. The form explicitly requests fictional display metadata only: Visa/Mastercard, demo cardholder name, exactly four demo digits, expiry month/year. There is no full-card-number or CVV/CVC field. Validation uses the deterministic E1 reference clock. The mutation whitelists only `id`, `companyId`, `brand`, `lastFour`, `expiryMonth`, `expiryYear`, `cardholderName`, `isDefault`; arbitrary input fields are never copied into state. The active company's replacement immediately updates its masked display and cannot change another company's method.

## Demo plan catalog and upgrade

`plan-catalog.ts` centralizes the application's existing Starter (€0, five seats), Professional (€29, five seats) and Business (€49, ten seats) demo tiers. Existing capabilities are limited to unlimited documents, custom requirements and notifications/audit; Starter has none of those catalog flags. These are replaceable E1 demo figures, not final commercial promises or entitlement enforcement. No Trial/Enterprise tier, vendor limit, SSO, API, dedicated support or account-manager claim is inferred from the mockup.

The large centered shared Modal uses the canonical rounded surface, elevated cards and translucent blurred backdrop, leaving the underlying application recognizable. It uses three actual tier cards instead of the mockup's four dummy tiers. Cards are three columns at desktop ≥1200px, two at tablet, and one below 768px with vertical panel scrolling. Shared Surface/Button/icon/token styles take precedence over recreating mockup controls. The footer honestly explains local simulation instead of inventing an unsupported commercial/contact action.

The current tier is marked and has no action. Trial is separately represented by subscription `status: trialing | active` and existing `trialDaysRemaining`, never a plan identity. The immediate next available rank gets the recommended blue emphasis/primary CTA; other higher tiers retain secondary actions, lower tiers are read-only. Highest-tier entry says Compare Plans and offers no next-tier recommendation.

Shared ConfirmationDialog is required before an upgrade. The mutation rejects stale expected plans, unavailable/unknown tiers, self-selection, downgrades and unauthorized companies. Success applies catalog plan/price/seats/capabilities only; status, trial days, payment, invoices and payment date are preserved. It neither restarts nor extends a trial. Billing, Members & Access and My Companies read the same live subscription/catalog. The overlay closes with local success feedback; cancellation does not mutate.

Modal behavior shares existing confirmation conventions: inert background, focus trap, visible keyboard focus, Escape/X, restored focus/scrolling, and no backdrop-click dismissal. Nested confirmation owns keyboard focus until resolved. No generic duplicate overlay implementation is introduced.

All changes survive same-tab client/locale navigation and company switch/return, but reload resets the demo. New companies start their own Starter trial with no invoices or payment method. No provider, checkout, real card processing, charges, durable persistence, proration, downgrade lifecycle, server billing authorization or real trial policy is implemented. Captures are ignored artifacts, not approved visual baselines.
