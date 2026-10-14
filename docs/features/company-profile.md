# Company Profile (E1-030)

`/company/settings/profile` and `/en/company/settings/profile` implement [mockup 30](../design/mockups/30-company-settings-profile.png) inside the unchanged authenticated shell. The existing submenu link and Dashboard > Company Settings > Company Profile breadcrumb preserve locale. Information, Contact and Address sections use shared Surface, Field, SelectField and Button controls. English copy awaits product-owner review.

## Company ownership and onboarding audit

The shared Company record is the sole saved source for company identity/profile. Existing `taxId` is CUI; `industry`, `companySize` and `country` use stable IDs from `company-options.ts`, shared with Onboarding and My Companies rather than parallel option lists. Company industry remains descriptive, distinct from operational Vendor category/template eligibility. Existing industry/country choices are consolidated; the only existing size option is `11-50`.

| Collected onboarding field | Ownership | Destination at completion |
| --- | --- | --- |
| Company name (`companyName`) | A — Company | `Company.name` |
| CUI (`taxId`) | A — Company | `Company.taxId`, trimmed/uppercased |
| Industry (`industry`) | A — Company | `Company.industry` |
| Company size (`company-size`) | A — Company | `Company.companySize` |
| Country (`country`) | A — Company | `Company.country` |
| Administrator full name (`administratorName`) | B — Global user | Form-local account draft; no real identity provisioning in E1 |
| Administrator email (`email`) | B — Global user | Form-local account draft, never Company contact email |
| Password (`password`) | C — Authentication only | Form-local validation, never shared Company/account state |
| Terms/privacy agreement (`terms`) | C — Authentication consent | Form-local validation; no E1 consent persistence |
| Step 2 template and document checklist | D — Setup configuration | E1-031 company-owned starter customization or Requirements draft; not Company contact/profile fields |
| Step 3 supplier name/email rows | D — Setup configuration | E1-031 company-owned ordinary Vendor form drafts until mandatory CUI/category are completed; not company contact fields |

Step 1 captures the five company values; shared state changes only on valid Step 3 completion. New CUI creates/activates one company with the existing current-user Administrator membership and Starter trial. The already-owned Demo sample's matching CUI initializes that existing record without a duplicate company; other accessible duplicate CUIs are rejected. E1-031 additionally retains intentional operational setup in its company workspace; no account/authentication, automatic requirements assignment, durable supplier persistence or invitations are added. Global-user identity starts from the existing E1 fixture and is editable independently through [My Profile](my-profile-invitations.md); neither Onboarding nor Company Profile synchronizes it with company contact fields.

Optional registration number, website, company email/phone/contact person/role, address, city, region and postal code live on Company. Demo initialization reuses its existing legal/billing contact/address sample values; unknown postal code is empty. New companies preserve their onboarding/creation country and never acquire fabricated contact/address data.

## Edit and access contract

One local page draft covers all sections. Save is synchronous, enabled only for a normalized dirty/valid draft, trims values and atomically replaces only the active company's profile whitelist. Cancel resets to the current saved values without navigation. No draft reaches shared state before Save; inline status confirms success. Whitespace-only changes and CUI case normalization do not create a semantic dirty state.

Name/CUI are required; CUI uniqueness checks all accessible companies and excludes the current one. Industry/country require shared IDs. Company size is required in Onboarding but optional for partial companies created by My Companies. Registration/contact/address fields have no pre-existing required rule and remain optional. Non-empty email and website reuse existing email and HTTP(S)/bare-host URL conventions. Phone uses existing permissive trimmed-text handling, not a new international format rule. Errors use shared inline field presentation.

Administrator can edit. Reviewer/Viewer see disabled controls and a read-only notice, without Save/Cancel. The update action independently checks current active company and active membership role; frontend checks are not server authorization. Missing company/membership uses the existing safe workspace fallback.

Unsaved sidebar, breadcrumb/profile links, company switch and locale navigation reuse the shared ConfirmationDialog and existing editable-flow capture pattern. Continue editing retains the draft; explicit discard follows the retained destination. Browser Back/Forward traversals use the Navigation API where available, with the existing same-URL history-guard fallback otherwise. Refresh/close uses the native unsaved-changes warning. After a confirmed real company change, E1-031B clears the old company page/overlays and enters the target Dashboard; cancelling prevents both activation and navigation. Same-company selection closes the switcher without discarding the form.

Company state/listeners belong to the browser tab session and survive SPA module reinitialization, client/locale navigation and company switch/return. Reload or another tab starts from fixtures; there is no backend, durable storage, fake loading or authentication. Saved identity propagates through sidebar/switcher, profile company context, My Companies, Members, Billing and Requirements Preview. E1-032Bd Billing Details edits the same canonical Company identity/contact/address; only billing email remains separate from contact email. Subscription upgrades and safe payment metadata are company-owned local demo interactions, not provider billing. Supplier Portal requester name resolves the token's Company ID, not the active workspace; procurement-help contacts remain independent presentation data.

## Canonical adaptations and validation

The screenshot's three-card/two-column composition, icons, hierarchy and Romanian copy use the current authenticated shell and shared control scale (42px fields, 48px actions). The existing Company Size selection is added in Information's unused grid slot as explicitly required. Optional fields do not display mandatory stars from the sample image. County/Region is free text because no shared region catalog exists and non-Romanian country choices are supported. At constrained content widths, grids stack and the sticky action row wraps without hiding fields or causing horizontal page overflow. No logo upload or personal-profile fields are introduced.

Unit/E2E coverage exercises atomicity, normalization, uniqueness, shared options, onboarding completion, local creation, both read-only roles, company isolation, downstream identity, Save/Cancel, dirty sidebar/company/locale/Back navigation (including fallback), RO/EN and responsive containment. Generated desktop/reduced/mobile and state captures are ignored, unapproved artifacts, not committed visual baselines.
