# Security and Data Direction

**Status:** Accepted architecture direction; implementation and legal review remain future work.

## Identity, tenancy, and authorization

- Better Auth handles email/password identity, email verification, reset, and revocable database-backed sessions. Require secure same-site cookies, CSRF protection for state-changing requests, rate limiting, and account lifecycle checks. Supplier upload links are a separate scoped capability, not an internal-user session.
- A debiro **organization** is the business owner of customer records. Membership and role live in the debiro domain model; Better Auth's organization feature is not the tenant source of truth.
- Every customer record and document metadata record carries organization ownership. Application services verify membership/role and permitted object/action. Repository queries require organization context. PostgreSQL row-level security on tenant-owned tables supplies defense in depth, with transaction-scoped tenant context and a non-bypass application role. Auth and queue schemas need their own access rules. Cross-tenant negative tests are mandatory before real customer data.
- Never trust a client-supplied organization ID or supplier ID. Resolve scope from a verified session or a validated invitation capability; verify again when a job executes.
- Supplier links use cryptographically random tokens, stored hashed, scoped to an organization/vendor/document request, expiring and revocable. Do not put sensitive details in tokens or logs. Rate-limit guessing and provide safe expiration/reissue behavior.

## Private document lifecycle

Uploaded binaries belong in Cloudflare R2 Standard storage with EU jurisdiction restrictions and private buckets. PostgreSQL stores metadata, ownership, status, and object keys, not document blobs. Use separate staging and final prefixes/buckets and short-lived S3-compatible presigned URLs. R2's presigned PUT can be reused until expiry; a unique staging key plus promotion to a final key after scanning prevents a later overwrite from changing a reviewed file. The server issues a download/preview URL only after authorization and clean-file promotion. See [R2 EU jurisdiction](https://developers.cloudflare.com/r2/reference/data-location/) and [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

At upload permission time, enforce authenticated/capability scope, target slot, allowed type, declared maximum size, quotas, narrow key and operation, short expiry, and bucket CORS. At finalize time, check that the object exists, inspect actual size/type (a signed MIME header is not proof), sanitize display filenames, and queue scanning. Do not download or preview unscanned content. In the worker, enforce bounded pages, pixels, archive depth, CPU/time/memory and file size; scan with locally deployed ClamAV signatures before promotion; reject unsafe/unsupported files. Record scan outcomes, failures, retention and deletion decisions in audit data. Never log document content or raw signed URLs. For each provider, use least-privilege keys and rotation.

The initial accepted approach assumes a local scanner fits within the worker's resource envelope. Its memory and signature-update footprint must be measured before production; the worker may need more memory, which is represented as a cost sensitivity in the [cost model](cost-model.md). No file is treated as safe solely because it passed a browser MIME check.

## Data location and external processing

| Data/process | Direction | Remaining gate |
| --- | --- | --- |
| Web runtime and worker | Railway EU West (Amsterdam). | Confirm actual service region at deployment; no production document content in logs. |
| PostgreSQL | Neon Frankfurt EU project. | Confirm project region, DPA, backup/restore settings, and network controls before launch. |
| Document bytes and encrypted logical DB backups | Cloudflare R2 bucket explicitly created with EU jurisdiction. | Confirm bucket jurisdiction, private access, lifecycle, and recovery permissions. |
| OCR and malware scan | Local worker in EU region. | Validate sandbox/resource limits and Romanian/English quality on real document samples. |
| AI structured extraction | OpenAI API through a provider adapter, only after an eligible EU data-residency project with regional processing/ZDR and DPA is approved and tested for the selected model/endpoint. | If eligibility or contractual terms cannot be obtained, real-document AI extraction stays disabled; human review/manual entry remains possible. Do not silently send documents to a global endpoint. |
| Transactional email | Resend with EU sending region where available. Resend states that customer data, including message content and logs, is stored in the US. | EU routing is not EU storage. Review DPA/SCCs, content minimization, subprocessors, retention, transfer basis, and customer disclosure before customer email. If that review cannot accept US storage, replace the email adapter/provider before launch. |

This is a technical location plan, not a claim of GDPR compliance. OpenAI states that non-US regional data residency requires approval for abuse-monitoring controls and a Modified Retention amendment; endpoint/model support must be checked for the intended project. See [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data). Resend documents [US storage of customer data alongside its EU sending region and DPA](https://resend.com/security/gdpr). Legal/DPA review and customer disclosure are required before real production processing.

## Recovery and retention

- Use Neon Launch with a seven-day point-in-time restore window and scheduled snapshots; also take encrypted daily logical dumps into a private EU R2 backup bucket under separate credentials. Retain a defined series of daily and monthly dumps, test restoring to a fresh database at least before launch and periodically thereafter, and record actual recovery time/data-loss expectations. A backup without a tested restore is insufficient. See [Neon plans/pricing](https://neon.com/pricing).
- Object storage durability does not protect against authorized-but-accidental deletion or account compromise. Use a documented retention/deletion policy, delayed deletion or versioning if available and tested, and a separate recoverable copy for critical documents if the risk assessment requires it. Test object recovery separately from database recovery; a restored database must be reconciled with R2 object keys.
- Keep historical actions in application audit records. Railway's short log retention is not the product audit trail. Retention periods and deletion obligations must be decided with the relevant feature/legal tasks, not inferred here.
