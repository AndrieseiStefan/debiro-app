# Product Brief

## Product

**Name:** debiro

**Initial product:** Vendor & Subcontractor Compliance SaaS

**Brand concept:** Reduce bureaucracy and administrative friction around complex recurring business operations.

debiro turns supplier and subcontractor document compliance into one clear operational workflow. It should make it easy to answer:

- What is valid?
- What is missing?
- What expires soon?
- What is expired?
- Who needs to act?

## Core workflow

1. A company creates an account.
2. It adds vendors or subcontractors.
3. It defines required documents.
4. It invites a supplier through a secure link.
5. The supplier uploads the requested documents.
6. The system extracts document information.
7. A human reviews, accepts, or corrects the information.
8. The system calculates compliance status: Valid, Missing, Expiring Soon, or Expired.
9. Automatic reminders occur.
10. The supplier uploads a renewal or replacement.
11. History and an audit trail remain.

This replaces fragmented spreadsheets, email, shared folders, manual reminders, manual review, and repeated supplier follow-up. The broader product may later reduce friction in other recurring administrative operations, but those possibilities are not current feature requirements.

## Document semantics

- **Extracted:** the system or AI detected information.
- **Confirmed:** a human reviewed and accepted or corrected the information.
- **Verified:** information was independently checked against an authoritative external source.

AI extraction alone must never be described as Verified.

## Market, language, and commercial direction

- Primary market: Romania.
- Product languages: Romanian (`ro`) and English (`en`).
- Primary domain: `debiro.ro`.
- Domain strategy: a single domain for public pages and future authenticated application routes; do not introduce `app.debiro.ro` at this stage.
- Commercial direction: recurring B2B SaaS subscription.

Domain-dependent concerns—including base URLs, email links, secure supplier links, authentication callbacks, canonical URLs, and redirects—must eventually use configuration rather than business logic hardcoded to `debiro.ro`.

## Still to be decided

- Exact ideal customer profile
- Pricing
- Subscription limits
- Technical stack and infrastructure architecture
- Final logo and brand asset
