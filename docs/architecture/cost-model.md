# Cost Model

**Research date:** 2026-09-23. Prices are official published USD list prices, excluding VAT, currency conversion, taxes, domain registration and paid legal review. This is a planning model, not a quote. No provider account was changed. Recheck current terms before provisioning or production launch.

## Official rate and limit anchors

- [Railway pricing](https://railway.com/pricing): Hobby is a $5/month minimum with $5 monthly usage credit **shared by the account**; memory $0.00000386/GB-second, CPU $0.00000772/vCPU-second, service egress $0.05/GB. Hobby log retention is seven days ([logs](https://docs.railway.com/observability/logs)). The owner already pays the plan for other work; that $5 is a **total account baseline**, not a free debiro plan. The remaining monthly credit headroom is unknown.
- [Neon pricing](https://neon.com/pricing): Free offers 100 CU-hours/project and 0.5 GB storage/project but only six-hour restore history, so it is **not** the production assumption. Launch has no minimum: $0.106/CU-hour, $0.35/GB-month storage, $0.20/GB-month instant-restore history, and $0.09/GB-month snapshots; up to seven-day history and 500 GB/month network egress included. A 0.25 CU database continuously active for 730 hours costs about $19.35 for compute alone. Pooled connections reduce connection pressure; they do not make an active database free.
- [R2 Standard pricing](https://developers.cloudflare.com/r2/pricing/): first 10 GB-month, 1 million Class A and 10 million Class B operations per month are free **per account**, then $0.015/GB-month, $4.50/million writes and $0.36/million reads; direct R2 egress is free. The free allowance is not necessarily independent if other projects share the account. EU jurisdiction is available ([location](https://developers.cloudflare.com/r2/reference/data-location/)).
- [Resend pricing](https://resend.com/pricing): Free includes 3,000 emails/month but only 100/day; Pro is $20/month for 50,000/month and no stated daily limit. Thus the early-traction case at 10,000/month uses Pro; a 1,000/month MVP can use Free only if peaks remain below 100/day.
- [OpenAI GPT-5 mini](https://developers.openai.com/api/docs/models/gpt-5-mini): $0.25 per million input text tokens and $2.00 per million output text tokens. No free API allowance is assumed. EU project eligibility and possible contractual terms may affect availability/cost; the model assumes the listed token rate and excludes unverified residency surcharges.
- [Railway cron](https://docs.railway.com/cron-jobs) has no separate per-job price stated; the model charges its running CPU/memory time. No paid OCR SKU is selected. Tesseract/Poppler processing is included in the worker runtime cost. [Google Document AI OCR](https://cloud.google.com/products/document-ai/pricing/) was compared but is not selected.

## Modeling assumptions

| Assumption | A — Development | B — Initial MVP | C — Early traction |
| --- | ---: | ---: | ---: |
| Organizations / managed vendors | 0 real / synthetic | 5 / 100 (1–3 internal users per organization) | 50 / 2,500 |
| Stored documents | Test fixtures | 500 | 15,000 |
| New/replacement uploads per month | 20 synthetic test calls | 200 | 3,000 |
| Transactional emails per month | No real sends | 1,000, under 100/day | 10,000, Pro plan |
| Mean stored document size | Synthetic | 2 MB | 2 MB |
| R2 total average including backup dumps | Under free allowance | ~1.5 GB | ~33 GB |
| DB average storage | Local only | 0.5 GB | 3 GB |
| DB compute billed | Local only | 0.25 CU × 730 h, conservative always-active ceiling | 0.5 CU × 730 h, conservative always-active ceiling |
| Worker active time | Local only | 10 h/month at 1 GB and 0.1 vCPU average | 100 h/month at 2 GB and 0.5 vCPU average |
| Web active resources | Local only | 0.5 GB and 0.05 vCPU average, 730 h | 1 GB and 0.15 vCPU average, 730 h |
| Web service egress | None | 5 GB | 25 GB |
| AI text per upload | 3,000 input + 600 output tokens, including metadata/prompt | Same; 20% extra calls for retries | Same; 20% extra calls for retries |

These usage assumptions are **cost-model inputs only**, not product limits, forecasts, or commitments. OCR demand is assumed to fit the active worker-hour envelope; documents with poor scans, large files, or unexpectedly heavy ClamAV memory use increase runtime cost. Neon may scale to zero between cron runs, so always-active compute is conservative. The model does not assume free-tier credits for production PostgreSQL.

## Component estimate, USD/month

“Fixed” is a dedicated debiro subscription fee; usage rows remain variable even when predictable. A dash in cost columns means $0 incremental under the stated assumptions, not that the provider has unlimited free use.

| Component | Provider/plan | Free tier / fixed | Usage price or inclusion | A dev | B MVP | C traction | First meaningful cost trigger / limitation |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| Web/application | Railway Hobby | Shared $5 account credit; no debiro-only fixed fee | CPU, RAM, egress above | $0 | ~$6.25 | ~$14.26 | Always-on RAM, average CPU, egress; account credit may be consumed by other projects. |
| PostgreSQL | Neon Launch | No minimum; Free excluded for production | CU-hours, GB-month, restore and snapshots | $0 local | ~$19.59 | ~$40.11 | Continuous compute is the main cost; free tier lacks production-sized DB/restore. |
| Object storage | R2 Standard EU | 10 GB-month + operation allowances per account | $0.015/GB-month beyond free, operation overages | $0 | $0 | ~$0.35 | Cross 10 GB **account-wide** or operation allowances; 33 GB modeled total. |
| Authentication | Better Auth | No service fee | PostgreSQL usage counted above | $0 | $0 | $0 | Development/security maintenance, not MAU billing; DB grows with users. |
| Queue/worker | pg-boss + Railway finite cron process | No queue fee; no always-on worker | Worker CPU/RAM active time | $0 | ~$0.17 | ~$4.17 | Processing time or scanner RAM; cron latency and skips need monitoring. |
| Scheduled work | Railway cron | No separately verified scheduler fee | Runtime counted in worker row | $0 | Included | Included | Long/overlapping runs; 10-minute queue latency. |
| Transactional email | Resend Free → Pro | Free 3k/month, 100/day; Pro fixed $20 | 50k/month on Pro | $0 | $0 | $20.00 | >100/day or >3k/month triggers Pro; deliverability/DPA setup. |
| Native text and OCR | Poppler + Tesseract on worker | No per-page provider fee | CPU/RAM counted in worker row | $0 | Included | Included | Poor scans/large pages increase worker runtime; quality gate remains. |
| AI extraction | OpenAI GPT-5 mini | No free allowance assumed | Tokens at listed rates | ~$0.05 | ~$0.47 | ~$7.02 | Larger prompts, more retries, higher model tier, or residency terms. |
| Observability | Railway + Neon metrics/logs, pg-boss records | Included in selected plans | No separate SaaS | $0 | $0 | $0 | Seven-day Railway log history; longer retention needs new service. |
| PostgreSQL backups | Neon restore/snapshots + encrypted R2 dumps | Neon charged by history/snapshot GB; R2 allowance shared | Included in DB/R2/worker figures | $0 | Included | Included | WAL churn, larger snapshots/dumps, or R2 > free tier. |

## Totals and account accounting

| Monthly total | A — Development | B — Initial MVP | C — Early traction |
| --- | ---: | ---: | ---: |
| Dedicated debiro fixed subscriptions | $0 | $0 | $20 Resend Pro |
| Variable infrastructure excluding AI/OCR API | $0 | ~$26.0 | ~$58.8 |
| Variable AI/OCR API | ~$0.05 | ~$0.47 | ~$7.02 |
| **Gross debiro-attributable run cost** | **~$0.05** | **~$26.5** | **~$85.9** |
| **Incremental invoice above the existing Railway baseline** | **~$0.05** | **~$21.5–26.5** | **~$80.9–85.9** |

The $5 Railway Hobby subscription is already paid for the account. It remains part of **total platform cost**, never $0. The gross debiro row allocates all estimated debiro resource use to debiro and is the useful capacity-planning figure. The incremental invoice range subtracts only whatever portion of the **shared** $5 Railway usage credit is still unused by other projects (between $0 and $5); actual baseline usage is unknown. Other accounts/providers are assumed newly attributable to debiro. In B, the Railway web and worker portion is about $6.4; in C it is about $18.4. A statement that debiro has its own $5 Railway allowance would be incorrect.

For total account/platform cost, start with the existing $5 Railway subscription **plus** any account usage beyond its shared $5 credit, then add Neon, R2, Resend and OpenAI. Costs of other Railway projects are unknown and excluded from all debiro estimates. No EUR conversion is asserted; actual euro invoices depend on exchange rate and tax at billing.

## Sensitivities and first checks

- **Largest expected variable driver:** Neon compute under the stated always-active assumptions (~$19.35 in B; ~$38.69 in C). Measure actual CU-hours after a week of operation and revise the model.
- If the worker must stay resident for low-latency jobs, 1 GB of continuous memory alone is about $10/month on Railway, plus CPU, and Neon is more likely to remain continuously active. This is why finite cron work is selected for MVP.
- If R2 is already used by another product, all debiro document GB may be billable. At 33 GB the storage charge would be about $0.50 rather than $0.35, before operation overages.
- If 1,000 MVP emails cluster above 100 in a day, Resend Pro adds $20/month despite being under the free monthly quota.
- Resend's documented US storage of customer data, including message content and logs, is a production legal/transfer gate despite EU sending; changing providers after review will change this cost model ([Resend GDPR](https://resend.com/security/gdpr)).
- Model calls are text-only. Sending whole images/PDFs or using a larger model changes the AI bill and data-processing review.
- The first real pilot must record average pages/file, OCR fraction, scan/processing seconds, web/worker memory peaks, Neon active CU-hours, R2 operation counts, email peaks, and retry/token usage before accepting the next forecast.
