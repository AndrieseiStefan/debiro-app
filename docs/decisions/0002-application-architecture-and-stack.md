# ADR-0002 — Application Architecture and Stack

## Status

Accepted on 2026-09-23. This is a decision, not an implementation or deployment.

## Context

debiro needs one public domain for marketing, onboarding, an authenticated operational workspace, and a secure supplier portal. The ten approved 1448×1086 mockups include nested navigation, filters/tables, forms, an invitation drawer, and side-by-side document preview and review. UI implementation precedes real persistence and must run on typed fixtures, then switch to live data without screen redesign. Later flows need tenant isolation, private documents, durable background processing, Romanian/English copy, and auditability. The owner is pre-revenue and already has a paid Railway account; PostgreSQL is mandatory.

The priority order is correctness/data safety, security, solo maintainability, low operations, initial cost, portability, then scale. The [technology comparison](../architecture/technology-stack.md#comparison-method) evaluates no more than three credible options per category, including cost, reliability, security, lock-in, migration, and solo operational burden. [Cost modeling](../architecture/cost-model.md) uses official sources checked 2026-09-23.

## Options considered

1. **Selected:** Next.js/TypeScript modular monolith, managed Neon PostgreSQL, pg-boss jobs, separate finite Railway worker, private R2 EU documents, Better Auth sessions, Resend email, local text/OCR and gated OpenAI structured extraction. This minimizes infrastructure while preserving business boundaries and an asynchronous processing path.
2. **More integrated vendor stack:** Supabase PostgreSQL/Auth/Storage with a Next.js frontend, plus hosted functions/queue. It can accelerate setup and includes bundled capacity, but introduces a paid baseline and makes identity/storage migration more coupled to one provider. Running a heavy OCR/scanning worker still needs a suitable process host.
3. **Separated services:** standalone React client, dedicated API and Redis queue/worker on separate hosts. It allows independent teams and high throughput but adds deployments, auth/CORS, network failure cases, monitoring, and fixed cost with no current need.

Railway's own PostgreSQL template was specifically considered because the account is already paid. Railway identifies it as **unmanaged**; database backup, tuning, security and recovery remain the owner's responsibility. Managed Neon was chosen despite an additional account and usage bill. The other category-level alternatives are documented in [technology stack](../architecture/technology-stack.md).

## Decision

| Required decision | Accepted choice |
| --- | --- |
| 1. Language/runtime | TypeScript strict on Node.js 24 LTS. |
| 2. Frontend framework | React with Next.js App Router; CSS Modules/custom-property tokens matched to mockups. |
| 3. Backend architecture | One modular monolith, with separate web and finite worker process entry points from one codebase. |
| 4. API/application boundary | Typed view-data interface (fixtures first, real adapter later), same-origin JSON route handlers with TypeScript/Zod contracts, server-side application services and central authorization. |
| 5. PostgreSQL provider | Managed Neon Launch in Frankfurt for production; Docker PostgreSQL locally. |
| 6. DB access/migrations | Drizzle ORM on `node-postgres`; reviewed SQL migrations via Drizzle Kit; pooled runtime/direct migration connections. |
| 7. Authentication | Self-hosted Better Auth with verified email/password and revocable PostgreSQL-backed sessions. |
| 8. Authorization/tenancy | Debiro-owned organization/membership/role model; service/repository scope plus PostgreSQL RLS on tenant data; scoped supplier capabilities. |
| 9. Object storage | Private Cloudflare R2 Standard EU-jurisdiction buckets; no PostgreSQL document blobs. |
| 10. Upload strategy | Narrow, short-lived presigned PUT into staging; finalize/check/scan; promote to clean final key; authorized short-lived GET. |
| 11. Background jobs | pg-boss on PostgreSQL; transactional enqueue, bounded retries/dead-letter, idempotent handlers, finite worker command. |
| 12. Scheduler | Railway cron: queue drain every 10 minutes and daily idempotent scheduling/cleanup. |
| 13. Text extraction | Bounded native PDF text extraction via Poppler before OCR. |
| 14. OCR | Local Tesseract `ron` + `eng` only when needed; manual review for poor results. |
| 15. AI structured extraction | OpenAI `gpt-5-mini` text Structured Outputs via adapter, runtime validation/provenance/human confirmation, gated on eligible EU processing for real documents. |
| 16. Transactional email | Resend via adapter and authenticated domain; EU sending region where available, but documented US storage requires a production DPA/transfer review or provider change. |
| 17. Localization | `next-intl` with locked Romanian source catalog and reviewed English catalog; ICU and locale-aware formats. |
| 18. Hosting | Existing Railway Hobby account, web and cron services in Amsterdam; external Neon and R2. |
| 19. Environments | Local and production; ephemeral previews as needed; no permanent staging at MVP. |
| 20. Observability | Redacted structured Railway logs/metrics/health checks, Neon metrics and persisted pg-boss queue/failure tracking. |
| 21. Unit/integration testing | Vitest for domain/application and integration/API/PostgreSQL, React Testing Library for meaningful component behavior. |
| 22. E2E testing | Playwright for critical public, customer, supplier, upload and review flows as they are implemented. |
| 23. Visual regression | Deterministic Playwright capture and explicit comparison to each original mockup during UI work; CI screenshot baselines only after product-owner visual approval. |
| 24. Backup/recovery | Neon seven-day restore history and snapshots plus encrypted daily logical dumps to private EU R2; restore drills and object reconciliation. |
| 25. Secrets/configuration | Validated environment variables, ignored local secrets, production Railway secret variables, future non-secret `.env.example`, configurable URLs and least-privilege provider keys. |

Realtime infrastructure is **not needed for MVP**. Bounded polling/refetch is sufficient for document-processing state. No application route contracts or future feature schemas are decided here.

## Trade-offs

- The modular monolith and single TypeScript runtime are practical for one developer and make visual-first fixture work fast. They require discipline to keep domain services out of Next.js route/components. API and provider adapters preserve a later separation path.
- Neon is genuinely managed and portable PostgreSQL, but adds network distance from Railway Amsterdam and a usage-based bill. A five-minute cron would keep it warm; the selected ten-minute cadence can allow idle periods, but the cost estimate conservatively assumes continuous compute.
- A finite cron worker avoids an always-on OCR process but accepts up to roughly ten minutes of normal queue delay, plus platform scheduling variance. It is appropriate for MVP document analysis and reminders, not a sub-minute SLA. Queue age and skipped runs must be monitored. The same worker can later run continuously.
- PostgreSQL RLS adds implementation/test complexity but directly reduces cross-tenant exposure risk. The auth and queue schemas need separate privilege boundaries.
- Local OCR avoids per-page fees and external raw-document transfer, but quality must be measured on actual Romanian/English files and worker resource use must be capped.
- Self-hosted authentication avoids another identity provider and keeps data in PostgreSQL, but the team owns patching, rate limits, email verification and session security.
- OpenAI and Resend are external processors. Real-document AI processing has an explicit EU eligibility/DPA gate. Resend's EU sending route does not keep message content or logs in the EU; its documented US storage needs a transfer/DPA review before customer email. No unsupported compliance claim follows from choosing EU infrastructure.

## Consequences

- TASK-003 establishes Node/Next.js, the locale catalogs, fixture-backed typed view contracts, tokens and visual-validation tooling. It does **not** need a live backend to implement canonical screens.
- Data models, API details, and provider integrations are defined only by later tasks. The domain/application layer and tenant policy must precede real persistence integrations even though screen delivery is visual-first.
- When document work starts, the HTTP request returns after durable recording and enqueue; scanning, text/OCR and AI run outside the request. Extracted data remains unconfirmed and never becomes Verified through AI alone.
- Production startup needs paid Neon Launch restore settings, private R2 EU buckets, email authentication and EU processing review. Nothing is provisioned by this ADR.

## Risks

- Actual Railway CPU/RAM, Neon active time, OCR fraction, email peaks, and AI tokens may differ materially from the model. Measure and revise before committing to customer pricing.
- Provider plan limits and residency eligibility can change; recheck official terms at provisioning. OpenAI EU project approval may not be available. In that case, disable real-document AI extraction and use human entry until an approved processing route exists.
- Finite cron runs may be skipped if a previous run remains active. Idempotent work, retry, dead-letter, reconciliation and queue-age alerts are required.
- A presigned PUT remains reusable until expiration. Untrusted staging and post-scan promotion are mandatory to prevent post-scan overwrite of a final document.
- No real data may enter the system before tenant isolation, document access controls, backup restore tests and DPA/legal review pass.

## Follow-up

1. TASK-003 — UI Foundation & Canonical Design System.
2. After TASK-003, define the complete Epic sequence through MVP before E1-001. Follow the approved visual-first order in the [roadmap](../project/roadmap.md).
3. Before the first customer pilot, validate processing latency, real document samples, service regions, OpenAI EU eligibility, Resend processing terms, costs and restore drills. Record any changed durable choice in a superseding ADR.
