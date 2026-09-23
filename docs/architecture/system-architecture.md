# System Architecture

**Status:** Accepted direction; only the frontend foundation is implemented. See [ADR-0002](../decisions/0002-application-architecture-and-stack.md), its authentication revision in [ADR-0003](../decisions/0003-cost-and-auth-architecture-review.md), and the [UI foundation](../design/ui-foundation.md).

## Shape

A TypeScript modular monolith serves the public site, authenticated application, and supplier experience on one configurable canonical domain. A separate command from the same codebase processes durable jobs. PostgreSQL owns relational business data and queue state; private object storage owns document bytes.

```text
Browser (public / customer / supplier)
  │  HTTPS, same canonical domain
  ▼
Next.js web process (Railway EU West)
  ├─ page rendering and accessible client interaction
  ├─ typed view-data boundary ── fixture adapter now / real adapter later
  ├─ same-origin JSON route handlers: validate, authenticate, authorize
  └─ application services and domain modules
       ├─ Clerk identity/session verification → debiro user + organization membership
       ├─ Drizzle → Neon PostgreSQL (EU; records, audit, pg-boss jobs)
       ├─ S3 adapter → private Cloudflare R2 EU bucket
       └─ email adapter → Resend

Railway scheduled worker command (separate process, shared application code)
  ├─ claim/retry jobs in Neon PostgreSQL
  ├─ scan staged R2 files; native text, then local OCR if needed
  ├─ OpenAI structured extraction through a provider adapter
  ├─ persist extracted draft for human confirmation
  └─ send queued email through Resend

Railway structured logs/metrics + health checks + persistent job failures
```

The diagram describes future topology, not an existing deployment. TASK-003 established only `/`, `/en`, and a development-only preview route; no product route or endpoint contract is defined here.

## Client and application boundary

- Next.js App Router owns routing, page rendering, and the three distinct visual shells shown in the approved mockups. The marketing page can be prerendered; customer and supplier pages require server authorization. Interactive forms, filters, tables, the invitation drawer, and document review use client components only where necessary.
- Screen components consume typed view models through a small `ViewDataSource` interface. TASK-003 and subsequent UI tasks use deterministic fixture adapters. Later, an application-backed adapter supplies the same view models. Page components never embed demo data or call a vendor SDK.
- Same-origin JSON route handlers are the HTTP boundary for browser mutations and interactive fetches. Request and response contracts are TypeScript types plus runtime schemas (Zod). On the server, rendering code may invoke application queries directly through the same application layer, without an unnecessary HTTP loopback.
- Route handlers perform request parsing, session/token verification, input validation, authorization, and response mapping. Application services own business rules and transactions. The domain layer has no Next.js, provider SDK, or UI imports. External integrations may later use explicitly versioned HTTP endpoints through the same services; no future endpoints are specified now.
- Realtime/WebSockets are unnecessary for MVP. Requests and bounded refetch/polling can show processing states; polling must stop on terminal states and use sensible backoff.

## Main responsibilities

| Component | Responsibility |
| --- | --- |
| Web/client | Faithful mockup implementation, localization, accessible interactions, fixture-backed presentation, request/refetch states. |
| Application/server | Use cases, validation beyond shape, transactions, authorization decisions, orchestration. |
| Domain modules | Business terminology and deterministic rules; no framework or provider dependencies. |
| Persistence | Drizzle repositories, SQL migrations, organization scoping, auditable writes. |
| Auth/session | Clerk owns identity, email verification, password/reset lifecycle and sessions; the server verifies the external subject and maps it to a debiro user. |
| Authorization | Resolve the business organization and role for each request; enforce in service/repository and PostgreSQL RLS. |
| Object storage | Private R2 staging/final objects, narrow presigned operations, lifecycle/deletion. |
| Jobs/worker | PostgreSQL-backed enqueue, finite scheduled drain, retries, dead-letter handling, idempotent processing. |
| External adapters | Resend email and OpenAI structured extraction; keep transport and credentials out of business rules. |
| Observability | Structured redacted logs, provider metrics, health checks, queue age and failures. |

## High-level modules

The intended business boundaries are Identity/Organizations, Vendors, Requirements, Invitations, Documents, Document Processing, Compliance, Notifications, and Audit. These are module boundaries only; they do not establish feature behavior or schema. Modules communicate through application services and shared domain types, not by importing each other's UI or provider adapters.

## Asynchronous document path

1. An authorized internal user or scoped supplier link requests a short-lived upload permission for one allowed document slot.
2. The browser uploads directly to a private, untrusted staging key in R2. The web process never accepts document bytes as its ordinary request payload.
3. A finalize request verifies object metadata, then records the upload and enqueues its pg-boss job in the same PostgreSQL transaction. Return `PROCESSING` without waiting for scanning, OCR, or AI. Periodic reconciliation handles the unavoidable gap between the earlier external R2 upload and that database transaction.
4. The worker claims the job, limits resources, scans the staged object, checks actual file type and size, and promotes a clean object to a final private key. Only final objects can receive download/preview permissions.
5. For a PDF, try native text extraction first. If text is insufficient, rasterize bounded pages and run Romanian/English OCR locally. Images go through OCR. Normalize text before model extraction.
6. The AI adapter requests typed structured output, validates it again, records provenance and an **Extracted** draft, then enters `REVIEW_REQUIRED`. A human may **Confirm** corrected data. **Verified** is reserved for a separate authoritative-source check, not AI output.
7. Failures retry with backoff; exhausted jobs remain visible for operator review. Reconciliation finds stranded staging objects, missing jobs, and incomplete processing.

The worker is a separate entry point and process even though it shares the monolith's source and domain code. Initial production runs it as a finite Railway cron job every 10 minutes. The queue is durable in PostgreSQL; adding a continuously running worker later changes deployment, not application contracts. Railway cron has a five-minute minimum interval and skips an overlapping run, so this choice accepts bounded processing latency and requires queue-age alerts. See [Railway cron](https://docs.railway.com/cron-jobs) and [pg-boss manual fetch/complete](https://github.com/timgit/pg-boss/blob/master/docs/api/jobs.md).

## Intended future repository shape

The current frontend structure is `src/app/`, `src/components/`, `src/i18n/`, `src/lib/`, `src/styles/`, `src/test/`, root `messages/`, and `e2e/`. The following is a guide for later tasks; feature/domain, infrastructure, worker, fixture, and migration directories do not exist yet.

```text
src/
  app/                 # Next.js routes/layouts and thin HTTP handlers
  components/          # mockup-backed, reusable UI
  i18n/                # locale loading and formatters
  view/                # typed screen contracts and fixture/real adapters
  modules/             # domain + application code by business boundary
  infrastructure/      # database, auth, storage, email, AI, OCR adapters
  worker/              # finite queue-drain and scheduled commands
  fixtures/            # future deterministic demo data, never production source
messages/               # ro source copy; en foundation translations
e2e/                    # browser checks and visual capture
db/migrations/         # reviewed SQL migrations
tests/                 # integration and end-to-end tests
docs/                  # canonical project memory and approved mockups
```

One package is enough initially. Add packages only when an actual independent deployment or reuse boundary makes them useful.

## Foundational conventions

- TypeScript `strict`; descriptive English technical identifiers; `PascalCase` components/types and `camelCase` functions/values.
- Use `organizationId` consistently for business ownership, `vendor` for supplier records, and explicit `Extracted`, `Confirmed`, `Verified` semantics. Clerk Organizations are not the debiro business tenant model; a server-verified Clerk subject maps to a local debiro user whose memberships/roles are checked in PostgreSQL.
- Name modules by business boundary, not by database table or framework layer. Keep side effects behind small adapter interfaces at real provider boundaries.
- Commit reviewed, ordered SQL migrations. Do not use schema push against production. Keep test fixtures deterministic and separate from customer data.
- Validate environment variables at startup. Keep public variables explicitly prefixed and never expose server credentials to the client.
