# Deployment and Operations

**Status:** Accepted target topology, not deployed.

## Production topology

| Component | Production target |
| --- | --- |
| Web/server | One Next.js Node.js service on Railway Hobby, EU West Amsterdam. Custom domain `debiro.ro`; public and authenticated experiences stay on that domain. Health check and controlled restart. |
| Queue drain | Separate Railway cron service/command built from the same repository and container, every 10 minutes, exits after a bounded batch. pg-boss state is in Neon PostgreSQL. |
| Scheduled maintenance | Separate idempotent daily Railway cron command for expiry/reminder evaluation, cleanup and reconciliation; enqueue durable jobs rather than doing all work in the scheduler. |
| PostgreSQL | Neon Launch project in Frankfurt, production branch/database isolated from local/test data. Runtime uses pooled TLS connections; migration, dump and queue administration use a small direct connection pool. |
| Authentication | Clerk-hosted identity/session service; server verifies Clerk identity, then loads debiro user/membership/role from PostgreSQL. Signed `email.created` events for verification/recovery go to a guarded webhook endpoint and Resend for Romanian/English delivery, with retries and no secret-bearing logs; prove this works on Hobby before launch. No Clerk Organizations for business tenancy. US identity-data transfer review before customer accounts. |
| Document storage | Private Cloudflare R2 Standard buckets in the EU jurisdiction: untrusted staging, clean final objects, and encrypted backup copies with separated credentials. |
| Email / AI | Resend and OpenAI adapters from server/worker only, gated as described in [security and data](security-and-data.md). |

There is no Redis, Kubernetes, microservice fleet, WebSocket server, or always-on OCR worker at MVP. Railway cron has a five-minute minimum and skips overlap; queue durability and idempotency prevent losing work, while queue-age/error alerts reveal late processing ([Railway cron](https://docs.railway.com/cron-jobs)). The web process must not run pg-boss's continuous supervision/polling/listener; finite worker and maintenance commands must be tested for retry, expiration and cleanup coverage. Otherwise the Neon scale-to-zero assumption in the [cost model](cost-model.md) fails. If document latency or backlog becomes unacceptable, deploy the same worker command continuously before changing the job interface and update the cost model.

## Release workflow

Build and test one codebase. Run reviewed SQL migrations once as a release step with a direct PostgreSQL connection, inspect success, then roll out the web and cron commands. Never run production schema push or auto-migrate in each replica. Gate releases on unit/integration/E2E tests and relevant mockup visual review. Keep application rollback compatible with the latest migration or use an explicit forward fix; database restore is an incident operation, not a routine code rollback. Configure deployment health checks and monitor the first requests and job runs.

## Environments and local work

- **Local:** Node.js 24 LTS, one Docker PostgreSQL, local application process and finite worker command. UI tasks can run entirely with typed fixtures and fake adapters, with no cloud credentials or live customer data. Test data is synthetic. For integration work, use local PostgreSQL and local file adapter or an isolated test bucket only where storage behavior requires it.
- **Production:** Dedicated Neon production project/branch and private R2 buckets in European regions; Railway production secrets and custom domain. Production data is not copied into local fixtures.
- **Preview:** Short-lived branch preview deployments may use synthetic data and isolated resources if a task needs browser review. No permanent staging service during MVP. Before first customer launch, run a production-like release/restore rehearsal with synthetic data.

The current primary domain is `debiro.ro`. Configure canonical base URL, auth callback origin, supplier-link base, email link base, redirects, and canonical URLs through environment configuration so a future domain migration does not touch domain logic. Exact application routes are not decided by TASK-002.

## Configuration and secrets

TASK-003 will check in only a non-secret `.env.example` documenting required keys. Actual local `.env.local` and credentials remain ignored; Railway stores production variables. Parse and validate required variables at process startup and fail closed when critical Clerk/storage/DB settings are absent. Clerk's publishable key may be client-visible; its secret key must never enter `NEXT_PUBLIC_` variables or logs. Keep separate least-privilege keys for production, previews, staging/final files, and backups. Rotate compromised keys and revoke signed URLs by waiting for their short expiry and invalidating associated capabilities where possible.

## Operations and recovery

- Emit one-line structured JSON logs with request/job IDs and sanitized organization IDs; strip credentials, tokens, signed URLs, document text and filenames where sensitive. Use Railway service metrics, health checks and alerts; inspect Neon compute/storage metrics and pg-boss queue depth, oldest age, retry/dead-letter counts. Railway Hobby logs last seven days ([Railway logs](https://docs.railway.com/observability/logs)); product audit events are retained in PostgreSQL according to future policy.
- Budget alerts should monitor Railway project usage, Neon CU-hours/storage, R2 storage/operations, Resend daily/monthly send counts, and AI tokens. Railway account included credits are shared; do not assume an independent debiro allowance ([Railway pricing](https://railway.com/pricing)).
- In production, configure Neon seven-day history and scheduled snapshots, plus daily encrypted `pg_dump` copies to a private R2 EU backup bucket with separate credentials. A daily dump command runs on Railway cron and is included in the worker/cron cost envelope. Verify backups exist, checksum them, and rehearse a restore into a fresh database at least before launch and periodically afterward. Reconcile restored records with object keys before reopening the service.
- Maintain staging-object cleanup, clean-object retention/deletion and recovery procedures. An object store's durability is not protection from accidental deletion. Set retention and recovery objectives when real document and legal requirements are defined, then validate that backup schedules meet them.

## Solo-developer rationale

One repository, one language/runtime, one managed PostgreSQL provider, one private object store, and two Railway process types keep the operational surface small. The job processor is separate from HTTP without a second application architecture. Standard PostgreSQL and S3-compatible interfaces preserve an exit path if cost or reliability later favors another provider.
