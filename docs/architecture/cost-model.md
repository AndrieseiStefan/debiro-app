# Cost Model

**Research/reassessment date:** 2026-09-23. [ADR-0003](../decisions/0003-cost-and-auth-architecture-review.md) replaces self-hosted Better Auth with Clerk identity/session and makes Neon's 60%-active case the expected low-traffic MVP estimate. The TASK-002 always-active estimate remains a ceiling sensitivity, not a fixed subscription. Prices are official published USD list prices, excluding VAT, currency conversion, taxes, domain registration and paid legal review. This is a planning model, not a quote. No provider account was changed. Recheck terms before provisioning or production launch.

## Official rate and limit anchors

- [Railway pricing](https://docs.railway.com/pricing): Hobby is a $5/month minimum with $5 monthly usage credit **shared by the account**; memory ~$10/GB-month, CPU ~$20/vCPU-month, service egress $0.05/GB and persistent volume $0.15/GB-month. Hobby log retention is seven days ([logs](https://docs.railway.com/observability/logs)). The owner already pays the plan for other work; that $5 is a **total account baseline**, not a free debiro plan. Remaining monthly credit headroom is unknown.
- [Neon plans](https://neon.com/docs/introduction/plans): Free offers 100 CU-hours/project and 0.5 GB storage/project but only six-hour restore history, so it is **not** the production assumption. Launch has no minimum: $0.106/CU-hour, $0.35/GB-month storage, $0.20/GB-month instant-restore history, and $0.09/GB-month snapshots; up to seven-day history and 500 GB/month public network transfer included. At 0.25 CU, 60% of 730 hours is 109.5 CU-hours and ~$11.61 compute; fully active is 182.5 CU-hours and ~$19.35 compute. Free compute and storage caps are too tight even before its recovery deficit. [Neon compute](https://neon.com/docs/manage/endpoints/) defaults to five-minute scale-to-zero; a ten-minute cron prevents a near-zero production compute bill but need not keep it active all month.
- [R2 Standard pricing](https://developers.cloudflare.com/r2/pricing/): first 10 GB-month, 1 million Class A and 10 million Class B operations per month are free **per account**, then $0.015/GB-month, $4.50/million writes and $0.36/million reads; direct R2 egress is free. The free allowance is not necessarily independent if other projects share the account. EU jurisdiction is available ([location](https://developers.cloudflare.com/r2/reference/data-location/)).
- [Resend pricing](https://resend.com/pricing): Free includes 3,000 emails/month but only 100/day; Pro is $20/month for 50,000/month and no stated daily limit. Thus the early-traction case at 10,000/month uses Pro; a 1,000/month MVP can use Free only if peaks remain below 100/day.
- [Clerk pricing](https://clerk.com/pricing): Hobby is $0 up to 50,000 monthly **retained** users per app, not MAU, with fixed seven-day sessions and no MFA or custom Clerk-delivered email templates. Pro is $25/month paid monthly or $20/month billed annually; MFA, custom session lifetime and custom templates are paid features. Neither modeled scenario approaches the user-count threshold; supplier upload capabilities do not create Clerk users. The selected Hobby plan requires [own delivery of localized auth emails via Clerk's webhook](https://clerk.com/docs/guides/development/troubleshooting/email-deliverability), counted under Resend, and must be verified before production. Clerk's [security page](https://clerk.com/security) states that identity data is US-hosted, so production transfer review remains necessary.
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
| DB live / billed restore-history / billed snapshot storage | Local only | 0.5 / 0.1 / 0.5 GB | 3 / 0.5 / 3 GB |
| DB compute billed | Local only | 0.25 CU × 438 h (60% of 730 h); 730 h is ceiling sensitivity | 0.5 CU × 730 h, conservative always-active assumption |
| Worker active time | Local only | 10 h/month at 1 GB and 0.1 vCPU average | 100 h/month at 2 GB and 0.5 vCPU average |
| Web active resources | Local only | 0.5 GB and 0.05 vCPU average, 730 h | 1 GB and 0.15 vCPU average, 730 h |
| Web service egress | None | 5 GB | 25 GB |
| AI text per upload | 3,000 input + 600 output tokens, including metadata/prompt | Same; 20% extra calls for retries | Same; 20% extra calls for retries |

These usage assumptions are **cost-model inputs only**, not product limits, forecasts, or commitments. OCR demand is assumed to fit the active worker-hour envelope; documents with poor scans, large files, or unexpectedly heavy ClamAV memory use increase runtime cost. With a ten-minute queue-drain cron, each database touch is followed by Neon's five-minute idle timer, making ~50% active time a lower-order starting point even without jobs; 60% allows for finite worker activity and light web traffic. This is an inference, **not measured uptime**. It assumes no long-running pg-boss supervisor/listener/poller in the web process and that queue maintenance is reliably run by finite jobs; verify those conditions and actual CU-hours before launch ([pg-boss options](https://github.com/timgit/pg-boss/blob/master/docs/api/constructor.md)). If the database stays active, use the ~$26.5 gross upper case below. No free-tier credits are assumed for production PostgreSQL.

For Neon, the modeled non-compute charge is 0.5×$0.35 + 0.1×$0.20 + 0.5×$0.09 = **$0.24** at MVP and 3×$0.35 + 0.5×$0.20 + 3×$0.09 = **$1.42** at traction. Actual history and snapshot GB may differ. Railway worker estimates prorate the published $10/GB-month and $20/vCPU-month rates over the assumed 730-hour month; web estimates add the stated egress.

## Component estimate, USD/month

“Fixed” is a dedicated debiro subscription fee; usage rows remain variable even when predictable. A zero in a cost column means $0 incremental under the stated assumptions, not unlimited free use. **Essential** means the capability is required for the chosen safe MVP, not that this vendor is irreplaceable; **avoidable** means a proposed extra service was rejected. All provider free allowances may be shared across other projects on the same account.

| Component | Provider/plan | Dedicated fixed | Usage and cost reason; class / avoidability | A dev | B MVP | C traction | First paid trigger / free-tier reality |
| --- | --- | ---: | --- | ---: | ---: | ---: | --- |
| Web/application | Existing Railway Hobby | $0 debiro | **Essential, usage-driven:** always-on web RAM/CPU and egress; cannot remove hosting. | $0 local | ~$6.25 | ~$14.25 | Shared account $5 credit may already be consumed. |
| PostgreSQL | Neon Launch | $0 | **Essential, usage-driven:** managed database compute plus storage/history/snapshots; Railway PG could reduce invoice but adds database operations. | $0 local | ~$11.85 | ~$40.11 | 60%-active MVP; Free 100 CUh, 0.5 GB and six-hour restore do not safely cover it. |
| Object storage | R2 Standard EU | $0 | **Essential, usage-driven after allowance:** private file bytes/operations. | $0 | $0 | ~$0.35 | ~1.5 GB MVP and ~thousands of operations fit account-wide 10 GB/1m A/10m B if unused elsewhere. |
| Authentication | Clerk Hobby | $0 | **Essential, free at modeled users:** managed identity/session; debiro owns authorization and localized auth-email delivery. | $0 | $0 | $0 | Pro $25 monthly for MFA/custom lifetime/Clerk email templates/branding or >50k retained users; US transfer and webhook-flow reviews. |
| Queue/worker | pg-boss + finite Railway process | $0 | **Essential, usage-driven:** durable asynchronous scanning, email and processing; no separate queue service. | $0 local | ~$0.16 | ~$4.11 | More worker hours/RAM; no always-on worker assumed. |
| Scheduled work | Railway cron | $0 | **Essential, usage-driven:** queue drain/cleanup/dumps, runtime counted above. | $0 | Included | Included | No separately verified cron fee; overlaps/latency require alerts. |
| Transactional email | Resend Free → Pro | $0 B; $20 C | **Essential:** localized invitation/reminder/**Clerk verification/recovery** delivery; paid tier is **usage-driven** by volume/peaks. | $0 | $0 | $20.00 | Free 3k/month but 100/day; first likely upgrade on a batch >100/day. |
| Native text and OCR | Poppler + Tesseract | $0 | **Essential when documents arrive:** no OCR API fee; CPU/RAM counted in worker. | $0 | Included | Included | Poor scans increase worker hours; paid OCR provider is **avoidable**. |
| AI extraction | OpenAI GPT-5 mini | $0 | **Optional until EU gate; usage-driven:** text tokens for eligible extraction only; human/manual path remains. | ~$0.05 synthetic | ~$0.47 | ~$7.02 | Higher tokens/retries/model or residency terms; real data disabled until gate. |
| Observability | Railway/Neon metrics/logs + job state | $0 | **Essential monitoring included**; separate APM is **avoidable** at MVP. | $0 | $0 | $0 | Seven-day Railway log history may later justify paid retention. |
| PostgreSQL backups | Neon restore/snapshots + encrypted R2 dumps | $0 | **Essential recovery:** storage/history in Neon/R2 rows, dump CPU in worker row. | $0 | Included | Included | WAL/history/dump growth and restore drill labor; cannot responsibly remove. |

## Totals and account accounting

| Monthly total | A — Development | B — Initial MVP | C — Early traction |
| --- | ---: | ---: | ---: |
| Existing Railway account baseline (already paid; **not** debiro cost) | $5 | $5 | $5 |
| Dedicated debiro incremental fixed subscriptions | $0 | $0 | $20 Resend Pro |
| Debiro variable infrastructure excluding AI/OCR API | $0 | ~$18.3 | ~$58.8 |
| Variable AI/OCR API | ~$0.05 | ~$0.47 | ~$7.02 |
| **Gross debiro-attributable run cost (fixed + variable)** | **~$0.05** | **~$18.7** | **~$85.8** |
| **Debiro incremental invoice above existing Railway baseline** | **~$0.05** | **~$13.7–18.7** | **~$80.8–85.8** |

The $5 Railway Hobby subscription is already paid for the account. It remains part of **total platform cost**, never $0. The gross debiro row allocates all estimated debiro resource use to debiro and is the useful capacity-planning figure. The incremental invoice range subtracts only whatever portion of the **shared** $5 Railway usage credit is still unused by other projects (between $0 and $5); actual baseline usage is unknown. Other accounts/providers are assumed newly attributable to debiro. In B, the Railway web and worker portion is about $6.4; in C it is about $18.4. A statement that debiro has its own $5 Railway allowance would be incorrect. Because other projects' Railway usage is unknown, **total account invoice cannot be quoted exactly**; it includes the existing $5 baseline, any other-project usage above shared credit, and debiro usage.

Costs of other Railway projects are unknown and excluded from all debiro estimates. No EUR conversion is asserted; actual euro invoices depend on exchange rate and tax at billing.

## Sensitivities and first checks

- **Largest expected variable driver:** Neon compute, ~$11.61 in the revised 60%-active MVP case and ~$38.69 in the always-active traction case. The prior TASK-002 MVP gross ~$26.5 is still the upper scenario: $6.25 Railway web + $19.59 Neon + $0.16 worker + $0.47 AI. A continuously active database adds ~$7.7 versus the revised expected case. Measure CU-hours after a week and revise.
- If the worker must stay resident for low-latency jobs, 1 GB of continuous memory alone is about $10/month on Railway, plus CPU, and Neon is more likely to remain continuously active. This is why finite cron work is selected for MVP.
- If R2 is already used by another product, all debiro document GB may be billable. At 33 GB the storage charge would be about $0.50 rather than $0.35, before operation overages.
- If 1,000 MVP emails cluster above 100 in a day, Resend Pro adds $20/month despite being under the free monthly quota.
- Clerk Hobby has enough retained-user capacity for both modeled cases, but MFA, a custom session lifetime, Clerk-delivered custom email templates, or removal of Clerk branding from its components would require Pro ($25/month when billed monthly), moving the MVP beyond the current cost target. Hobby's own localized verification/recovery delivery via webhook + Resend needs end-to-end validation; the 1,000-email estimate includes those messages. This is an auth feature/integration trigger, not a user-volume trigger at this scale.
- The first **likely provider upgrade** is Resend Free → Pro if reminders cluster above 100/day; Neon Launch is already paid by usage, not an upgrade from Free. R2 would begin billing after its account-wide 10 GB-month/operation allowances; at ~33 GB in C it is only ~$0.35 under this model.
- Resend's documented US storage of customer data, including message content and logs, is a production legal/transfer gate despite EU sending; changing providers after review will change this cost model ([Resend GDPR](https://resend.com/security/gdpr)).
- Model calls are text-only. Sending whole images/PDFs or using a larger model changes the AI bill and data-processing review.
- The first real pilot must record average pages/file, OCR fraction, scan/processing seconds, web/worker memory peaks, Neon active CU-hours, R2 operation counts, email peaks, and retry/token usage before accepting the next forecast.
