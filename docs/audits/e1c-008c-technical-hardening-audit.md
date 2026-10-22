# E1C-008C — Technical Hardening Audit

## 1. Executive Summary

Audit date: **22 October 2026, Europe/Bucharest**. Repository baseline: `a7381aff6da02e247cb213907366af0af62a6ed2`; unchanged application baseline: `74c47ade08daf7f872fe355ee3ebaa4e86b11bc8`. Inputs: [E1C-008A functional audit](e1c-008a-functional-audit.md) and [E1C-008B UI/UX audit](e1c-008b-ui-ux-audit.md). This is an audit of the **browser-local E1 demonstration**, not a production security assessment or implementation task.

**New C findings: P0 0 / P1 0 / P2 0.** No additional distinct failure was established strongly enough to justify a new T identifier. Existing findings remain open, not silently resolved:

- **E1C-008A-F001, P1:** reconfirmed. Direct document Details/History entry returns HTTP 500 while client recovery displays the drawer. This also affects Vendor History and unavailable-document query entry through the same shared root cause.
- **E1C-008A-F002, P2:** reconfirmed. Four session-navigation cases fail at obsolete sidebar labels; three functional spec files are absent from the normal command. Development/production test environment selection also needs explicit treatment in the existing discovery remediation.
- **E1C-008B-U001–U004:** retained in the UI backlog, including Tooltip layering and short-viewport invalid-focus recovery. No duplicate technical tickets.

New validation: **typecheck, lint and 581 unit/component tests passed**. Production E2E execution produced **211 passing attempts, including controlled repetitions, and the four deliberately reproduced F002 failures**; it was not a new full-suite run. The development-only preview passed separately. The same 17 lifecycle cases passed three repetitions with three workers and three repetitions with one worker. Historical intermittent failures were **NOT REPRODUCED**, not declared permanently fixed.

Independent route probes covered **66 locale-specific URLs**: 48 HTTP 200, eight expected 404, ten HTTP 500. Each was also loaded and refreshed in a browser. All ten failing contexts retained HTTP 500 on load/refresh despite visible recovery. No browser page exceptions, unhandled rejections or hydration-mismatch messages were captured by that probe; network-status errors were captured separately.

Demo-size performance samples did not establish a new performance defect. An eleven-file bulk attempt produced ten observed, byte-exact downloads, confirming the documented browser-policy compatibility limit—not a missing stored file, a universal ten-file capacity, or a newly authorized archive feature. Complete large-batch delivery remains unsupported/unverified across browsers.

**Sign-off:** audit deliverable complete; unconditional E1 closure is withheld pending F001, F002 and a discovery-complete remediation validation. E2 authentication, server authorization, private storage, durability and deployment security remain unimplemented gates. No application, existing test, script, configuration, lockfile, dependency or mockup was changed.

## 2. Scope and Methodology

Read the repository constitution, A/B reports, [system architecture](../architecture/system-architecture.md), [stack](../architecture/technology-stack.md), [deployment](../architecture/deployment.md), [security/data](../architecture/security-and-data.md), [ADR-0002](../decisions/0002-application-architecture-and-stack.md), [ADR-0003](../decisions/0003-cost-and-auth-architecture-review.md), [current status](../project/current-status.md), relevant current feature contracts and actual source/test configuration. Provider selections were treated as accepted **directions**, not proof of deployed services or currently verified provider terms/prices.

Methods:

1. Inventoried routes, package scripts, all test files, browser-sensitive source references, client stores, imports and production chunks.
2. Reproduced known failures unchanged. Separated raw HTTP status, server logs, first visible/hydrated content and refresh behavior.
3. Inspected shared overlay effects and initial-open consumers. Exercised existing company/role/stale-reference/file tests, not only button visibility.
4. Compared identical lifecycle cases under controlled worker counts; kept original assertions, timeouts and zero local retries.
5. Measured representative existing fixture workloads, actual browser download events/bytes and cleanup counters. No production-scale or universal latency budget was invented.
6. Classified source observations, runtime results, documentation drift, unsupported browser policy and E2 gates separately. Only confirmed existing technical issues enter the required-remediation backlog.

Temporary scripts/captures are ignored diagnostic artifacts, not new repository test infrastructure. Synthetic records/files were created in isolated browser contexts; existing supported test identities/intercepted fixtures supplied permission edge cases. The user's tab/session was not reloaded, reset or mutated. No external accounts/services were contacted for integration testing.

Status vocabulary: **PASS** = named executed check only; **FAIL** = observed contract violation; **NOT VERIFIED** = insufficient execution/evidence; **NOT REPRODUCED** = investigated historical symptom not seen in these controlled attempts; **NOT APPLICABLE** = no such E1 operation; **DEFERRED TO E2** = explicitly future integration. Source inspection alone is never a runtime PASS.

## 3. Architecture/Runtime Baseline

| Area | Actual repository baseline | Interpretation |
| --- | --- | --- |
| Runtime/framework | Node `v24.21.0`, npm `11.19.0`; package requires Node 24; Next `16.3.6`, React/React DOM `19.3.0`, next-intl `4.14.6` | Installed/pinned versions, not a claim of latest release or vulnerability clearance. |
| Types/styles | TypeScript `5.9.3`, strict/noEmit/isolatedModules, CSS Modules/custom properties; `allowJs=false`, `skipLibCheck=true` | Strong application checking; not proof of runtime input validity. |
| Tests | Vitest `5.0.1`, jsdom `30.1.1`, RTL; Playwright `1.63.0`, Chromium | Current tools reused without installs or config edits. |
| Routing | Next App Router, 20 product families plus dev-only preview, RO default/as-needed and `/en` | Public, company-aware workspace and global-user scopes differ intentionally. |
| Data boundary | `src/lib/view-data.ts` defines a typed async view source; current feature-owned fixture/state/projection functions drive screens | No implemented `src/view`, server application/repository layer, database or provider adapters. Do not infer those directories from the architecture diagram. |
| State | `browserSession(Symbol.for(...))`, `useSyncExternalStore`, company-keyed stores, file sidecars | Tab-memory lifecycle, not authentication/persistence. Greeting storage is a separate approved presentation exception. |
| Documents | Existing Vendor lifecycle plus shared `createOwnedDocumentEngine` for Company/Employee, owner-specific access/storage adapters | Shared policies preserve Company review and Employee no-review distinctions. |
| Aggregation | Dashboard, Notifications, Search compose canonical current-record and event sources | No new event recorder/index/database inferred from read-side projections. |
| Deployment/API | No app route handlers, real auth SDK, database, storage, worker, queue, email or billing provider implementation found | Accepted E2 design, not deployed E1 capability. No real customer-data security approval. |

`next.config.ts` enables React strict mode and next-intl; dev indicators are disabled. The production build ID is **`rMsSznpT_NrkrfsQ1Rtz6`**, the successful A application build, unchanged by A/B's documentation commits. No fresh production build was necessary for this source-unchanged audit; A's build result is explicitly prior evidence, not counted as a new C pass.

## 4. Test Execution Environment

Local macOS; isolated Chromium contexts, usually 1448×900, reduced motion and Europe/Bucharest timezone. Browser reported HeadlessChrome **153.0.8010.12**, eight logical CPUs and 16GB `deviceMemory` hint. That hint is not an independently verified machine-memory specification. Native PDF tests use full Chromium separately from the headless shell.

Production was served on **localhost:15079** from the existing build. The existing user development server on **3001** was preserved; its development preview was checked in a fresh test context. Production preview URLs remained 404. The controlled parallel and serial comparison batches ran separately on the same production build; exploratory tests and route probes are separately labeled. Local machine/background activity and automation overhead prevent interpreting these timings as production SLAs.

Expiry remains on `2026-10-02T12:00:00.000Z`. Existing actual Employee timestamps are untouched; Notifications' authorized activity-reference rule is separate. No global clock replacement, state migration, real notification or delivery occurred.

### Evidence and executed commands

Evidence root: [`artifacts/visual/e1c-008c/`](../../artifacts/visual/e1c-008c/). Files are ignored local artifacts and intentionally excluded from the documentation commit. Reproduction commands and limitations below remain durable in this report; a separate checkout will need new artifacts.

| Key | Command / method | Result / local files |
| --- | --- | --- |
| U | `npm run typecheck`; `npm run lint`; `npm run test -- --maxWorkers=2` | Passed; 72 files / 581 tests. `typecheck.log`, `lint.log`, `unit.log`. |
| I | `node artifacts/visual/e1c-008c/inventory.mjs`; `npm run e2e -- --list`; `npx playwright test e2e --list --reporter=json` | 59 spec files / 521 discovered cases; normal command 55 files / 505 cases. `tests.json`, `dependencies.json`, `globals.json`, `chunks.json`, `mockups.json`, `default-discovery.log`, `all-discovery.json`. |
| H | `node artifacts/visual/e1c-008c/direct-entry.mjs` | 66 raw requests plus 132 browser load/refresh samples; `direct-entry.json/log`, ten selected screenshots, `production-server.log`. `server-html.json` separately retains four raw-heading samples. |
| F | `PLAYWRIGHT_BASE_URL=http://localhost:15079 npx playwright test e2e/document-session-navigation.spec.ts --workers=2 --reporter=list,json` | Four deterministic failures, retry=0; `known-label.json/log`, `known-label-results/` traces/screenshots/error contexts. |
| X1 | Existing specs `invite-vendor`, `employees`, `employee-documents`, `billing-interactions`, grep `preview\|closes\|close never\|create/free\|atomic\|payment replacement\|role changes`, `--repeat-each=3 --workers=3` | Exploratory 39 passing attempts; `parallel.json/log`. This expression did not select Invite's four test names; it is not represented as Invite coverage. |
| X2 | Same four spec files, focused expression G below, `--repeat-each=3 --workers=3` | Exploratory 51 passing attempts; `lifecycle-parallel.json/log`. |
| P | Same files/G, `--repeat-each=3 --workers=3` | Standalone controlled 51 passes / 17 cases ×3; 38.3s; `controlled-parallel.json/log/results`. |
| S | Identical files/G, `--repeat-each=3 --workers=1` | Standalone controlled 51 passes / same 17 cases ×3; 85.7s; `controlled-serial.json/log/results`. |
| A | Existing specs `company-workspace`, `notification-records`, `global-search-domains`, `employee-documents`, `company-document-management`, grep `privacy\|permission\|foreign\|malformed\|stale\|corrupt\|exact\|atomic\|legacy\|download\|boundaries\|switch`, `--workers=3` | 19 passes; `isolation-files.json/log/results`. Full units add operation-boundary negative cases. |
| D | `PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test e2e/foundation.spec.ts -g 'shows the development-only primitive preview' --workers=1 --reporter=list,json` | 1 pass; `dev-preview.json/log/results`. Production 404 independently in H. |
| M | `node artifacts/visual/e1c-008c/performance-files.mjs`; `node artifacts/visual/e1c-008c/cleanup-probe.mjs` | `performance.json`, `batch.json`, `cleanup.json`, logs and `batch-download.png`; `dataset-environment.json` records actual fixture counts/browser. |

G, unchanged across X2/P/S:

```text
keeps Vendor Details|traps focus|opens identically|create/free|keyboard close|close never|closes on permission|guards dirty|upgrade comparison|browser Back
```

All browser batches used list/JSON reporters, explicit `PLAYWRIGHT_JSON_OUTPUT_NAME` and `--output` paths under the evidence root; no local CI flag, retries or timeout overrides. Existing spec-defined timeouts remain unchanged. P/S did not overlap other production test batches. X1/X2 are exploratory evidence, not extra independent unique cases. Total passing production **attempts** are 39+51+51+51+19=211; four F failures are additional, not silently excluded from that total. Known stale-suite tails remain unexecuted.

Prior evidence relied on: A's full 519 production-compatible cases (515 pass/4 F002 fail), successful build/typecheck/lint/581 units; B's 326 targeted production passes and UI captures. C does not claim to rerun either full historical browser set. Development `NO_COLOR`/`FORCE_COLOR` messages and Vitest environment-reuse advice were not classified as application failures.

## 5. Technical Coverage Matrix

| Component/module | Contract / method / environment | Observed result | Evidence / ID | Limitation |
| --- | --- | --- | --- | --- |
| Product/direct routes | Raw HTTP and browser load/refresh, RO/EN production | **FAIL** for initial document drawers; other expected states as §6 | H / A-F001 | Fresh Demo identity is not server-authenticated authorization. |
| Shared Drawer SSR | Source render target + actual supported query routes | **FAIL**: render-time `document.body` | H, Drawer.tsx / A-F001 | No new duplicate ID. |
| Other browser globals | Source/effect/initial-state inspection plus default route probes | No additional runtime defect confirmed; **NOT VERIFIED** for every hypothetical future initially open consumer | I/H | A grep match alone is not a failure. |
| Greeting hydration | Server heading, title mutation history, refresh/session ID; unit and prior B cases | **PASS** for tested reserve→personalized pair and stable refresh | H/server-html/U; B | Not an exhaustive frame-by-frame audit of every variant/device. |
| Drawer lifecycle | Controlled Invite/Employee/dirty Billing/plan/back tests; cleanup loop | **PASS** for exercised transitions; historical timing symptom **NOT REPRODUCED** | P/S/M | B-U002/U004 remain; no global lifecycle certification. |
| Runtime/malformed data | Page errors/rejections, stale/permission tests, corrupted Employee/Company units | **PASS** for named negative cases; no new crash observed | H/A/U | No arbitrary-memory-fuzzing or real API failure test. |
| Company state A→B→A | Existing owned-state tests, six timed switches, source keys/navigation | **PASS** in supported E1 lifetime | A/M/U; A/B baseline | Full reload resets ordinary domain stores by contract. |
| Personnel authorization | Administrator operation checks, cross-owner file/history/metadata/count/export/search tests | **PASS** within client-domain contract | A/U | Hostile-client/server authorization **DEFERRED TO E2**. |
| Notifications/Search | Current-only owned projections, actual records vs attention, stale revalidation | **PASS** for executed tests; source composition reviewed | A/U/B | No delivery engine or server-side index tested. |
| File lifecycle | Current/history/exact downloads/replacement/native PDF/revocation | **PASS** for tested supported operations | A/U; B full viewer evidence | Scanning/private durable storage **DEFERRED TO E2**. |
| Large bulk download | Eleven UI-created Company files, browser download events/exact bytes | Documented limitation reproduced: 10/11; universal complete delivery **NOT VERIFIED** | M/batch | Browser-policy compatibility observation, not a new storage/corruption defect. |
| Test discovery/labels | All files vs scripts/config, list commands and unchanged failing suite | **FAIL** | I/F / A-F002 | Full-suite clean closure cannot be claimed. |
| Development preview | Existing dev assertion + production direct requests | **PASS** | D/H | Production remains 404; no utility exposed. |
| Performance | Fixture-size fresh-cache/reload/search/overlay/switch measurements | No new repeatable defect established; E2 scale **NOT VERIFIED** | M / §15 | No load test, real network/mobile CPU or approved budget. |
| Dependencies/architecture | Static resolved runtime-import graph, typecheck/lint | Source observation: no multi-file SCC found | I/U / §16 | Not dynamic dependency/security certification. |
| Error/observability | Existing error states/logging, actual F001 logs | Known F001 actionable; future operational telemetry **DEFERRED TO E2** | H/Sources / §17 | No deployed monitors/services assessed. |
| Network retry/worker failure | No real remote mutation/job in E1 | **NOT APPLICABLE** now; **DEFERRED TO E2** | Actual tree/package/ADRs | Do not manufacture async failures/spinners. |
| Production security/infrastructure | No real auth/API/DB/object store | **DEFERRED TO E2** | §18 | Never inferred PASS from client controls. |

## 6. SSR and Direct-Entry Findings

### Route matrix

Each row was requested once without browser recovery and then loaded/refreshed in a fresh locale-specific browser context. Both browser navigations retained the listed status. `RO path` below also has the same `/en`-prefixed request; Landing's EN equivalent is `/en`. Exact requested URLs, errors, headings/dialogs/alerts and title histories are in H. No unsupported Company/Employee drawer query route or global-search deep link was invented.

| RO path / context | RO / EN HTTP | Visible result after hydration |
| --- | --- | --- |
| `/` | 200 / 200 | Landing |
| `/login` | 200 / 200 | Login |
| `/onboarding` | 200 / 200 | Step 1 |
| `/dashboard` | 200 / 200 | Reserved greeting resolves, unchanged on refresh |
| `/vendors` | 200 / 200 | Directory |
| `/vendors/construct-pro` | 200 / 200 | Vendor Details |
| `/documents` | 200 / 200 | Vendor Documents |
| `/documents?document=construct-pro-fire-2024` | **500 / 500** | Recovered Details drawer — A-F001 |
| Same + `&documentAction=history` | **500 / 500** | Recovered History drawer — A-F001 |
| `/vendors/construct-pro?document=construct-pro-fire-2024` | **500 / 500** | Recovered Details in Vendor context — A-F001 |
| Same + `&documentAction=history` | **500 / 500** | Recovered Vendor History — A-F001 |
| `/documents?attention=1` | 200 / 200 | Full attention filter entry |
| `/documents/construct-pro-tax-2024/review` | 200 / 200 | Review |
| `/requirements` | 200 / 200 | Templates |
| `/requirements?template=software` | 200 / 200 | Selected existing template |
| `/company/documents` | 200 / 200 | Company list; manager initially closed |
| `/company/employees` | 200 / 200 | Employee directory |
| `/company/employees/employee%3Aandrei-popescu` | 200 / 200 | Owned Employee Details |
| `/notifications` | 200 / 200 | Notifications/current activity |
| `/company/settings/profile` | 200 / 200 | Company Profile |
| `/company/settings/members` | 200 / 200 | Members |
| `/company/settings/billing` | 200 / 200 | Billing |
| `/profile` | 200 / 200 | Global user Profile |
| `/profile/companies` | 200 / 200 | Global My Companies |
| `/invitations` | 200 / 200 | Global Invitations |
| `/upload/demo-construct-pro` | 200 / 200 | Existing demonstration portal |
| `/vendors/not-owned-audit` | 404 / 404 | Not-found handling |
| `/company/employees/not-owned-audit` | 200 / 200 | Safe Employee-unavailable state, no employee disclosure |
| `/documents?document=not-owned-audit` | **500 / 500** | Safe Document-unavailable drawer after recovery; same A-F001 |
| `/documents/not-owned-audit/review` | 404 / 404 | Not-found handling |
| `/requirements?template=not-owned-audit` | 200 / 200 | Existing safe selection fallback, no foreign template |
| `/upload/not-owned-audit` | 404 / 404 | Not-found handling |
| `/__dev/design-system` | 404 / 404 | Production restriction retained |

Totals: **48×200, 8×404, 10×500** raw responses; **132 browser navigation samples**. The invalid Employee's 200 unavailable presentation and the unknown template fallback are current E1 contracts, not newly invented 404 requirements. Role changes and foreign owned-record access are separately exercised in A/U; fresh direct HTTP alone cannot prove server authorization in a demo with no authenticated server identity.

### A-F001 root-cause validation

[`Drawer.tsx`](../../src/components/ui/Drawer.tsx) renders `createPortal(..., document.body)` without hydration readiness. [`DocumentManagementDrawer.tsx`](../../src/features/documents/DocumentManagementDrawer.tsx) initializes Details/History from server-provided query selection. The Documents and Vendor Details route files pass that selection on initial render. `use client` does not make that render expression browser-only; the actual server emits **`ReferenceError: document is not defined`**. Effects that manage focus/inert state cannot guard an earlier render expression.

The same portal executes for an unavailable ID, which explains the two additional 500 contexts. This expands the original finding's regression matrix; it is not an independent defect. Evidence: [RO recovered History](../../artifacts/visual/e1c-008c/ro-direct-history.png), [EN unavailable drawer](../../artifacts/visual/e1c-008c/en-direct-missing-document.png), H and production logs. A healthy client-rendered drawer is not a healthy HTTP response.

Other consumers reviewed: Add/Edit Vendor, Invite, Vendor Add/Replace Document, Company manager/upload/template/share, Employee Add/Edit/manager/upload/reminder, requirement-document/assignment and narrow FilterPanel. Their supported entry is an event/local selection, initially absent/closed; no other currently supported initial-open route was found. Company/Employee managers are not serialized query overlays. Modal has the same unguarded portal shape but no supported initially open route was found; retain it in the SSR regression surface rather than inventing a new failing URL or duplicate T issue.

### Browser-global audit distinctions

- `browserSession` guards server execution and does not publish to a server-global window registry; server snapshots use deterministic fixtures.
- FilterPanel and native PDF capability use `useSyncExternalStore` with explicit server snapshots. Browser `matchMedia`/`navigator` readers are not called as server snapshot readers.
- Tooltip/RowActionMenu/AppearancePicker portal expressions are behind initially false open state. Header popovers place/read bounds in effects; browser event handlers are not SSR failures merely because they mention window/document/Element.
- File object URLs are created in effects or download events, not server module initialization. Greeting storage/randomness runs in guarded lifecycle functions/layout effect, not its SSR title calculation.
- The retained `globals.json` lists 24 files matching the selected browser-API/portal pattern; other element/event references were also reviewed. This count is an inventory aid, not a claim that all browser APIs are unsafe or exhaustively statically proven safe.

## 7. Hydration and Render Consistency

H records **zero pageerror events, zero unhandled promise rejections and zero matched hydration-mismatch messages** across its load/refresh samples. Its 36 console errors were failed-resource HTTP-status messages associated with the 500/404 requests, not ignored hydration exceptions. F001 remains a server failure even without a browser exception.

Raw server HTML samples for RO/EN Dashboard contain an NBSP heading, not a displayed default welcome title. Mutation histories show NBSP → `Salut, Andrei!` / `Hey, Andrei!`; refresh reused variant `hello` and the same saved session selection. No visible default welcome string appeared in those histories. The hook publishes title/subtitle from one resolved selection and uses the shared reserved-copy layout. U and prior B cover 24 variants, dayparts, no-repeat/Login transitions, blocked storage, company/locale changes and the no-fake-auth boundary. C did not exercise every variant frame by frame again.

Observed load-shift values were small but not universally zero: the maximum recorded H value was approximately **0.0096**; Dashboard examples were ~0.000109 RO/~0.00415 EN on first load and zero on refresh. These are local buffered layout-shift observations, not a new approved CLS budget, field performance score or attribution to a particular font/greeting element. No new layout-shift defect was established.

Dates/statuses retain existing semantics: expiry uses the fixture clock/UTC calendar utilities; real recorded events retain timestamps, and authorized activity reference advancement affects only activity filtering. Company demonstration timestamps and Employee real-time timestamps are existing separate contracts. Replacing all dates with wall time to suppress an apparent difference would break E1.

Company/user sources use fixture server snapshots and client-owned stores. H exercised initial Demo and refreshed fixtures; A/U and prior A/B cover active-company and user presentation during client navigation. Full reload is intentionally not retention of ordinary operational data. Server-backed identity/tenant hydration is **DEFERRED TO E2**, not verified by these client checks.

## 8. Drawer/Overlay Lifecycle

The shared Drawer effect captures prior focus/inert/aria-hidden/body overflow/padding/scroll position, focuses the panel, traps Tab, handles Escape and restores prior state on cleanup. Closing uses the existing 240ms timer; cleanup cancels it. Nested alertdialog handling uses the existing Modal capture listener and focus fallback. Backdrop handling differs intentionally: Drawer closes on its own backdrop, confirmation Modal does not dismiss by backdrop.

Runtime evidence:

- P/S exercise Invite X/Cancel/Escape, focus trap and responsive usability, client-route/EN entry, Employee Add/Edit/navigation/menu close, Reminder clean-close/draft discard/access-change, dirty Billing close/browser Back with and without Navigation API, and nested plan confirmation.
- Existing document history/Details Back and current-version operations are covered by A/U and prior A/B; C's Details timing probe opens via the native in-app link and closes after each of five samples. Direct-entry remains F001.
- M adds **20 timed open/close cycles** plus an independent **60-cycle cleanup investigation**. Every close returned focus to Invite and removed the dialog. At post-GC samples 20/40/60, DOM node/listener counters plateaued at 638/505; document listeners stayed 143 including three keydown listeners, and all measured store subscription counts stayed unchanged. Body overflow was restored and the background was not inert after close.
- Heap rose from ~5.09MB initially to ~7.72/7.85/8.06MB at cycles 20/40/60 after GC. Initial counters also warmed up; this is **not proof of either a leak or no leak**. No continuing DOM/document-listener/subscription accumulation was reproduced. Long-duration retained-object profiling remains NOT VERIFIED.

B-U002 is the consumer Tooltip layer omission; B-U004 is invalid-upload focus recovery. Neither is reclassified as a new technical lifecycle defect. Responsive mobile scrolling/locale/route/company overlay clearing rely on the named tests and prior B captures, not solely this desktop loop. Global refactoring of Drawer/Modal mechanics is not justified by the present evidence.

## 9. Runtime Stability

Actual production exceptions observed were the known F001 server ReferenceError. H found no additional browser crash/rejection; negative tests exercised stale/missing/foreign references and malformed stored Employee metadata. Operations return existing typed failures or unavailable states rather than fabricating replacements or resetting unrelated stores.

Source inspection found guarded parsing/storage failures, explicit missing-byte handling and cleanup for subscriptions/listeners/timers. Some boundaries catch exceptions and return an unavailable/failed-source result (notably Employee adaptation and Notifications source composition); Company adaptation retains its older throw contract. Those differences were not promoted to defects without a reachable failing input. Full U passes include malformed-state rejection and unchanged-domain tests.

Empty/error/success cases assessed: no owned records, filtered no-results, unavailable employee/document, invalid upload/form, missing original bytes, native-preview fallback, failed/stale share preparation and successful local mutations/navigation. Synchronous E1 stores do not have real API retry/loading states. No imaginary backend request, network fault, success message or recovery job was added.

No custom route/global React error-boundary files or production telemetry integration were found. Next's fallback and feature ErrorState/alerts are the current mechanisms. Absence of an error boundary alone is not a confirmed runtime bug; F001 demonstrates a concrete existing failure, while future context/correlation/redaction/retry requirements belong to §17–18.

## 10. State Ownership and Isolation

| Authoritative E1 owner | Boundary / derived use | Evidence and result |
| --- | --- | --- |
| `company-state` | Accessible companies/memberships/active ID, profile/billing ownership; switch publishes new state | U and A→B→A tests PASS within tab lifetime; six M switches observed. |
| `user-profile-state` | Global user identity/preferences, historical actor snapshots separate | U plus A/B global-profile/company-switch tests; not real account authentication. |
| `created-vendors`, `vendor-requirements` | Company/vendor-owned metadata and configured requirement snapshots/current document pointers | U/A stale/cross-company/atomic operations PASS. Ratios do not derive compliance. |
| `created-documents` | Version records and version-ID file map; immutable historical bytes | U/A exact current/history/renewal tests PASS. |
| `requirements-state` | Company-owned scoped templates, atomic draft/edit state, immutable starter clones | U plus prior A/B scope/assignment regressions; no automatic category assignment invented. |
| `company-documents-state` | Company workspace/current references and company→version Blob sidecar | U/A history/review/current-only/privacy checks PASS; no Vendor fallback. |
| `employees-state` | Company directory/departments, employee document workspace/activity and company→employee→version files | U/A Administrator operation checks, stale owner/privacy/corruption cases PASS. |
| `local-state` notifications | Company+notification ID read set, existing browser-local lifecycle | U/A/B; no new storage/persistence. Reload reset is expected. |
| `local-audit` / Employee activity | Original recorded local events, not passive attention or delivered claims | U/A Notifications/Search tests; original identities/timestamps retained. |
| Dashboard/Notifications/Search | Read-side projections from these owners, no second write authority/index | Source reuse and U/A cross-domain/current-only/permission tests. |

`browserSession` uses non-enumerable window symbol owners, preserves module reinitialization/client navigation, and initializes separately during server rendering. This is not a global server session store. `CompanyWorkspaceNavigation` remounts company-aware page/portals on switch before Dashboard navigation, while global Profile routes keep their own current page/drafts. It does not reset owned stores.

The ordinary full-reload/new-tab fixture reset, greeting's separate session/local-storage rotation and notification read reset are approved E1 contracts. They are not persistence defects. A missing/foreign target must not be “repaired” by copying Demo data. Existing current document pointer, rejection/history and snapshot policies remain authoritative across all projections.

Limit: direct mutation of browser registries can bypass any frontend state convention. Supported negative tests verify the application's client-domain operations, not protection from a malicious operator of that browser. Durable multi-user consistency/concurrency/revision contracts remain E2 work.

## 11. Security and Authorization Boundaries

Existing domain checks inspected and exercised through U/A:

- `documentAccess`: current active company membership; Administrator replacement/management, Administrator or Reviewer review, member-visible reads as currently permitted.
- `managedCompany`: current Administrator ownership for company/member/billing mutations; existing self/last-admin and stale invitation guards.
- `employeeAccess` vs `employeeDocumentAccess`: directory/basic profiles are membership-visible; personnel metadata/files/history/activity/management require current Administrator and the owned Employee. Generic Reviewer document permission does not grant personnel access.
- Company/Employee document commits validate ownership/projection/file map shape and current references before publishing state/files. Employee file map is nested by company, employee and version; a different requirement/employee's file cannot be resolved merely by knowing its filename.
- Search/Notifications authorize personnel before matching/counting/date-reference/export/destination resolution. Stale result activation rechecks live identity/ownership. Passive attention and seeded delivery examples do not become actual events/unread notifications.

These are **PASS only within the supported E1 client-domain contract**. Current tests include successful and denied operations, not just hidden controls. A/U add stale target, Company role boundaries, personnel filtering and exact file checks; prior A/B provide broader context retention coverage.

No real authenticated server session, protected API, DB tenancy/RLS or private object store exists. Direct HTTP is served with demonstration fixtures; this is not an authenticated customer application. No new production security claim follows from the route matrix or a role-hidden button. Server scope must come from verified identity/membership/capability, not a trusted client company ID, before real data is used.

Source checks found no matched app `dangerouslySetInnerHTML`/eval/new-Function/innerHTML-assignment sink in the searched non-test files. Existing CSV escaping neutralizes leading formula characters and quotes. No tracked `.env*`, private-key/certificate filenames or CI secret file was listed. These bounded observations are **not** a full XSS/secret-history/dependency-vulnerability/penetration scan. No secrets were printed or real customer files used.

## 12. Document/File Handling

### Current behavior

- Browser upload policy accepts PDF/JPG/JPEG/PNG extension/MIME combinations and up to 10MiB; Company/Employee additionally reject empty files at their boundary. This is demonstration validation, not content signature validation or malware scanning.
- Vendor initial uploads and supplier submissions retain review semantics; existing internal renewal remains its existing date-derived rule. Company current/replacement versions require review. Employee uploads/replacements immediately activate with expiry-derived state; legacy pending projects without rewriting and rejected history never becomes current.
- File bytes live in owner/version maps, not filenames or object URLs. Replacement preserves previous exact bytes. Shared download callers preflight ownership/current/history/actual nonempty Blob before calling `downloadFile`.
- `downloadFile` creates an object URL, clicks a native download anchor and schedules revocation after 1000ms. Its boolean is initiation without a synchronous exception, **not acknowledgement of delivery**.
- DocumentFilePreview creates owned MIME-forced Blob URLs in an effect and revokes/removes them on cleanup. Native PDF capability has a hydration-consistent server fallback; unsupported viewers offer the original Download. Raster decoder failure hides the broken image and shows the existing fallback. A real PDF plugin cannot run in a sandboxed iframe; the existing viewer accepts only the authorized PDF Blob, not an arbitrary external/HTML URL.
- U/A and prior B test exact historical/current downloads, no-file fallback, replacement/rejection, Company/Employee access and native PDF/raster revocation. C did not replace browser viewers, bytes or file contracts.

### Large automatic-download compatibility investigation

M created **eleven actual Company documents through the existing authorized UI**, selected the filtered eleven rows, invoked Download Selected, and observed browser `download` events for two seconds. It received **ten files**, all without a reported failure and all byte-identical to the original synthetic PNG. No stored document/file was removed; the eleventh remained available in the workspace. See [`batch.json`](../../artifacts/visual/e1c-008c/batch.json) and [selection capture](../../artifacts/visual/e1c-008c/batch-download.png).

This reproduces A's previously unverified, already documented automatic-multiple-download limit. It does **not** prove a universal browser ceiling, eventual download success on all browser settings, or a storage/authorization bug. Native anchor initiation cannot acknowledge what the browser/user ultimately permits. Two-file exact delivery is covered by existing tests; every-file large-batch delivery across browsers/settings remains **NOT VERIFIED**.

Classification: **documented compatibility limitation / product decision required for any stronger delivery guarantee**, not a new T defect or an implicit archive requirement. E1 closure must not promise guaranteed large-batch delivery. A future scoped decision may define supported batches, browser-permission guidance or recovery UX using existing controls; do not add an archive, storage service, artificial success event or new download mechanism in this audit. E2 authorized delivery also needs short-lived capabilities, quotas, revocation and real outcome/operational observability.

## 13. Test Suite Inventory and Discovery

### Complete entry-point mapping

All **72** unit/component files are under `src/test/` and match Vitest's `src/**/*.test.{ts,tsx}` include. Every one maps to `npm run test`; none requires a live DB/provider. This run executed all 72, not a selected unit subset. Setup is `src/test/setup.ts`, jsdom per file, clearMocks, default per-file isolation. There are no implemented PostgreSQL/API integration suites to mark PASS.

All **59** browser spec files are mapped below (names relative to `e2e/`). `N` = normal `npm run e2e` explicit list, production-compatible unless noted; `F` = functional file omitted by N; `V` = screenshot utility via `npm run visual:capture`. Every spec is discoverable with `npx playwright test e2e --list`.

| Spec | Entry | Environment / special contract |
| --- | --- | --- |
| add-document.spec.ts | N | Local upload/extraction fixtures |
| add-vendor.spec.ts | N | Browser-local creation |
| authenticated-navigation.spec.ts | N | RO/EN shell/routes |
| authenticated-page-header.spec.ts | N | Shared header geometry |
| billing-interactions.spec.ts | N | Local dirty/upgrade/payment behavior |
| companies.spec.ts | N | Local global-user/company state |
| company-billing.spec.ts | N | Demo billing, no provider |
| company-document-management.spec.ts | N | Actual test-only bytes/current/history |
| company-document-preview.spec.ts | N | **Full Chromium** native PDF/raster |
| company-document-sharing.spec.ts | N | Local preview, no delivery |
| company-documents-ui.spec.ts | N | Computed controls/toolbar/captures |
| company-documents.spec.ts | N | Owned listing/selection |
| company-members.spec.ts | N | Local membership/invitation operations |
| company-profile.spec.ts | N | Company profile/dirty navigation |
| company-switch-navigation.spec.ts | N | Workspace vs global route retention |
| company-workspace.spec.ts | N | Scoped data and empty company |
| dashboard-employee-overview.spec.ts | N | Authorized three-domain overview |
| dashboard-greetings.spec.ts | N | Presentation storage/clock scenarios |
| dashboard-route-navigation.spec.ts | N | Direct/client geometry |
| dashboard-secondary-navigation.spec.ts | N | Current Dashboard destinations |
| dashboard.spec.ts | N | Fixture-derived overview |
| document-management.spec.ts | N | Details/history/renewal/download |
| document-review-lifecycle.spec.ts | N | Vendor decisions/current references |
| document-review.spec.ts | N | Review/viewer layout |
| document-session-navigation.spec.ts | **F** | Four stale-label failures, A-F002 |
| documents.spec.ts | N | Current Vendor files/filter/sort |
| employee-documents.spec.ts | N | Personnel operations; dedicated **full Chromium** viewer group |
| employees.spec.ts | N | Directory/forms/roles/navigation |
| fixture-consistency.spec.ts | N | Fixed E1 expiry/date/count coherence |
| foundation.spec.ts | N + separate dev case | **Mixed:** production-compatible cases plus one development-only primitive preview |
| global-search-domains.spec.ts | N | Six groups/permissions/current identity |
| global-search.spec.ts | N | Existing search/rank/keyboard |
| invite-vendor.spec.ts | N | Drawer/focus/local preview, no send |
| landing.spec.ts | N | Anchors/presentation/shared pricing |
| login.spec.ts | **F** | Five local-login/layout cases omitted |
| manual-document-expiry.spec.ts | **F** | Six manual-expiry/renewal cases omitted |
| my-profile-invitations.spec.ts | N | Global user and received invitations |
| notification-bell.spec.ts | N | Existing reload/read boundary |
| notification-records.spec.ts | N | Authorized record fixtures and stale targets |
| notifications.spec.ts | N | Current attention vs actual event/audit |
| onboarding.spec.ts | N | Explicit optional steps/local setup |
| profile-dropdown.spec.ts | N | Compact trigger/popover/global routes |
| requirement-scopes.spec.ts | N | Additive scope/legacy/roles |
| requirements-preview.spec.ts | N | Read-only supplier preview/draft atomicity |
| requirements.spec.ts | N | Current Templates terminology/editor |
| search-filters.spec.ts | N | Shared query/filter/reset behavior |
| secondary-management.spec.ts | N | Member/invitation/audit operations |
| section-actions.spec.ts | N | Expansion vs navigation semantics |
| starter-templates.spec.ts | N | Immutable platform source/owned clone |
| supplier-portal.spec.ts | N | Demo token/upload/review source |
| template-colors.spec.ts | N | Stable owned provenance and colors |
| vendor-details.spec.ts | N | Existing Details/tabs/contacts/notes |
| vendor-edit.spec.ts | N | Shared form/identity/category warning |
| vendor-lifecycle.spec.ts | N | Active/inactive operations |
| vendor-sorting.spec.ts | N | Deterministic table sorting |
| vendor-template-assignment.spec.ts | N | Category/union/snapshot decisions |
| vendor-workspace.spec.ts | N | Local owner state |
| vendors.spec.ts | N | Directory/filter/pages |
| visual-capture.spec.ts | **V** | Parameterized unapproved screenshot, not conformance |

Totals: normal list **55 files / 505 cases**, including the dev-only assertion; omitted functional files **15 cases** (4+5+6), plus the one intentional screenshot utility. Full discovery **521 cases**; production-compatible conformance set **519** after separating exactly the dev assertion and screenshot utility. A-F002 therefore remains a concrete discoverability/reliability issue. The utility's separate entry is intentional, not an omitted functional regression.

Support modules (`e2e/support/` company-workspace, notification-records, filters, viewports) are imported helpers, not silently omitted suites. Tests use isolated browser contexts/window stores; test-only response interception and synthetic identity changes are confined to supported fixtures, not application hooks. Static search found no actual `test.only(...)`, `test.skip(...)`, `test.fixme(...)` or fixed `waitForTimeout(...)` call in existing spec files. The audit's two-second download observation window is diagnostic sampling, not a change to tests/timeouts.

### Config and CI readiness

Playwright is fullyParallel; local retries=0, CI retries=1; forbidOnly follows CI. Default base URL is localhost:3210. The configured webServer starts **development** and reuses a running server only outside CI. Thus a local `PLAYWRIGHT_BASE_URL` pointing at an already running production server worked here, but the same invocation is **not yet a defined production CI contract**: CI disables reuse and still requests a dev-server command. There is no tracked CI workflow. These are details of the existing A-F002 validation-entry remediation, not new duplicate findings.

Recommended contract for its follow-up:

1. Run typecheck/lint/all unit-component tests; build the production artifact once.
2. Give production-compatible E2E an explicit production server/readiness mode and intended discovery of all functional files; preserve CI forbidOnly and honest retry reporting.
3. Run dev-only preview separately against a development server, never by exposing it in production. Assert both production locales are 404.
4. Add direct HTTP status assertions for supported Details/History, independent of recovered DOM, as part of F001 regression.
5. Keep screenshot utility/manual unapproved captures outside conformance totals; run relevant visual review separately. Finish with diff/status/scope checks.

The current diagnostic production discovery shape (not an implemented CI script) is `npx playwright test e2e --grep-invert 'shows the development-only primitive preview|capture an unapproved route screenshot'`; the two exclusions must be explicitly accounted for as dev assertion/utility. Do not suppress the stale functional suite or rename current UI labels to make it green.

## 14. Flaky Test Investigation

Historical timing reports were investigated separately from deterministic F002. No arbitrary sleep/retry increase or assertion edit was used.

| Batch | Conditions | Attempts / result | Interpretation |
| --- | --- | --- | --- |
| X1 | Three workers, three repetitions, broad exploratory grep | 39 pass | Some file selections did not match Invite names; not used to claim Invite coverage. |
| X2 | Three workers, focused G, exploratory phase | 51 pass | Initial lifecycle evidence. |
| P | Same focused G, standalone production batch, three workers | **51 pass**, 0 skipped/unexpected/flaky, 38.3s | 17 cases ×3, no retry rescue. |
| S | Same files/G/build, standalone, one worker | **51 pass**, 0 skipped/unexpected/flaky, 85.7s | Same 17 cases ×3, serial comparison. |
| F | Separate unchanged stale suite, two workers | **4 fail** at old labels, retry=0 | Deterministic, not a flaky timing failure. |

Focused cases include Invite focus restoration/trap/client entry, Employee create/edit/menu navigation, Reminder close/access-change, dirty Billing dismissal/Back and nested plan confirmations. Per-attempt status/retry/duration and test identities are retained in JSON, not inferred from one final summary. Existing 240ms close lifecycle waits are synchronized by `expect(dialog).toHaveCount(0)` and focus assertions, not newly added sleeps.

Result: **NOT REPRODUCED** for the historical intermittent drawer/transition failures in these controlled attempts. No failure signature was observed to attribute to animation, listener duplication, ordering, shared ports or hydration. A few repetitions are not proof of absence under every host load/browser; keep bounded repetition and traces during remediation. Do not label the known four stale-selector cases flaky, resolved or passed because another suite succeeds.

## 15. Performance Observations

### Method and data

Production build above, local host/network, unthrottled Chromium, 1448×900/reduced motion. The server was already warm. “Fresh” means a **new client context/cache**, not a cold server, real mobile CPU or customer network. Five fresh+reload pairs per route (40 samples) measure automation navigation start → visible main heading/font-ready/search focus, with Dashboard waiting for nonblank personalized title. Browser Navigation/Resource Timing supplies TTFB/script bytes. These are repeatable local workflow observations, not CPU-only costs or Core Web Vitals certification.

Base data: 24 Vendors, **26 stored Vendor document versions** (25 current files), six Company requirements/six Company document records (five current files), eight Employees with no seeded personnel files; existing templates/activity fixtures. No synthetic thousands-row expansion or backend load test was performed.

| Route | Fresh ready median [min–max], ms | Warm reload ready median [min–max], ms | Fresh TTFB median, ms |
| --- | --- | --- | ---: |
| Dashboard | 188.4 [171.1–302.9] | 95.9 [92.3–118.7] | 6.7 |
| Vendors | 164.5 [158.8–188.5] | 89.8 [81.4–164.6] | 13.6 |
| Company Documents | 162.8 [147.0–168.5] | 82.5 [73.4–103.7] | 5.4 |
| Employees | 150.6 [129.5–178.8] | 75.2 [59.6–106.1] | 6.0 |

| Interaction | Samples | Median [min–max], ms | Measured endpoint |
| --- | ---: | --- | --- |
| Global Search | 10 | 31.0 [29.5–72.2] | Query fill to result panel + two animation frames; includes automation/frame waiting, not pure matcher CPU |
| Company switch | 6 | 50.2 [40.6–51.3] | Target click to Dashboard URL/target company trigger; not all possible async future data |
| In-app document Details | 5 | 85.9 [77.0–92.2] | Native link click to dialog visible; does not excuse direct-entry 500 |
| Invite open | 20 | 40.3 [12.3–61.1] | Click to visible dialog |
| Invite close | 20 | 291.7 [287.2–314.0] | Escape to removed dialog/focus return; includes existing 240ms lifecycle and assertion overhead |

Production chunk inventory: 37 JavaScript files; largest ~313,741 bytes raw / 85,030 gzip-estimated. Example fresh route script transfer totals were ~277–283KB and decoded totals ~956–985KB; corresponding warm reload resource transfers were zero from browser cache. Node gzip estimates are not promised CDN/brotli sizes; full route/resource names and sample bytes are retained in M/I. No approved bundle/latency budget exists, so these sizes alone are not defects.

Source risk for E2 scale: Search/notification/workspace projections traverse arrays, sometimes perform repeated find/filter operations per owner, and several consumers subscribe/recompute from the same stores. Current demo measurements do not establish serious slowdown. Shared projection reuse is preferable to separate competing caches; measure realistic authorized datasets, render commits and a defined target before indexing/pagination/memoization changes. Unbounded tab-memory version/file retention is intentional E1 history, not durable production capacity planning. Heap observations/limits are in §8; no leak/scalability fix is claimed.

## 16. Architecture and Maintainability

Static TypeScript import resolution analyzed **229 non-test source modules / 990 resolved non-type import edges** and found **zero multi-file strongly connected components**. Type-only, JSON/CSS and unresolved/dynamic/provider runtime behavior are outside that graph. This is a bounded source observation, not proof of no runtime dependency risks.

Positive existing boundaries:

- Owner-neutral Company/Employee document engine with explicit access/read/commit/file/clock adaptations; Employee no-review is an explicit policy, not duplicated approval code.
- Shared compliance/date utilities, explicit current pointers and version identity; scoped template snapshots/provenance remain independent of source edits.
- Company and personnel access operations precede data aggregation where required; Search/Dashboard/Notifications reuse the same owned projections instead of inventing write authorities.
- Locale-aware routing, shared UI primitives and typed view contracts are established. Broad per-page rewrites, microservices or a new state library are not justified.

E2 integration risks, not confirmed E1 defects: feature/state/domain functions are currently co-located and many are client modules; moving authority to server application/repository transactions is real work, not swapping an SDK into browser stores. Snapshot/actor/version IDs need reviewed persistence mappings; process-local mutation order must become transaction/concurrency/idempotency contracts. `companyId` in current code and “organization” in target architecture require explicit integration terminology/mapping, not a silent global rename. Runtime validation currently uses handwritten predicates; ADR's planned Zod/API boundary is not installed/implemented.

No evidence-backed dead-code/unsafe-cast/circular-import rewrite story was created. Existing casts/adapters and repeated UI/filter structures must be evaluated against a concrete failure or feature change, not a style preference. B's optional simplifications stay optional.

### Documentation drift (separate from application defects)

`system-architecture.md` still describes only the frontend foundation/static landing and an early `src/features/landing/` repository shape, while actual routes/features and current-status document the wider E1. Its future topology/ADR status disclaimers remain useful; the early current-state sentences are stale. Current-status's “Not implemented” authorization/upload wording means backend infrastructure, not absence of client-domain checks/local upload UX. Record these clarifications for a scoped documentation synchronization after audit consolidation; they do not establish missing application behavior or a new C defect. Historical ADR options/costs are dated decisions, not current vendor capability verification.

## 17. Error Handling and Observability

Implemented: feature-level typed failures/unavailable/empty states, field validation alerts, private-file fallback, actual local audit history, and next-intl error callbacks that log errors and return key paths outside development (development throws missing-key errors). The production F001 log has a useful ReferenceError/stack but no application request/tenant correlation. No additional production browser exception was observed in H.

Not implemented: structured application request/job logs, redaction policy enforcement, request correlation, health endpoint/deployed monitor, provider error integration, durable job failure records, production incident dashboard or service environment validation. The only current runtime configuration is frontend/development setup; no secret-bearing provider integration requires startup secrets yet. Tracked environment-secret files were not found, but this was not a repository-history secret scan.

Some graceful source failures only expose an error flag/unavailable state and storage denial is intentionally caught to preserve the in-memory greeting. That is not proven silent data loss in E1. E2 must provide safe error context and retry/recovery without logging file content, recipient secrets, credentials, tokens or signed URLs. Local Audit is product history, not a substitute for operational telemetry or authoritative immutable server audit. No telemetry/service was connected by this task.

## 18. E2 Readiness and Security Gates

This table assesses **existing decisions/boundaries**, not current provider pricing, deployment or compliance. Labels: **IMPLEMENTED E1**, **DESIGNED FOR E2**, **REQUIRES DECISION**, **NOT VERIFIED**. All external integrations below are **DEFERRED TO E2** until their gates pass.

| Area / status | Existing E1 → intended integration boundary | Prerequisites, migration risks and security gates | Order |
| --- | --- | --- | ---: |
| Identity/session — IMPLEMENTED E1 demo; DESIGNED FOR E2 | Demo Login/unavailable Logout and greeting hooks → ADR-0003 server-verified Clerk subject mapped to local user | Revalidate chosen provider/locale/email flow, outage/revocation/account lifecycle; never promote browser identity or webhook arrival into tenant authorization. No fake session migration. | 1 |
| Company tenancy/roles — E1 checks; DESIGNED FOR E2 | Company/membership operations → application/service/repository scope and PostgreSQL RLS | Verified membership on every action/read/export/job; non-bypass DB role/transaction scope; cross-tenant/personnel negative tests; decide current company/organization naming and ID mapping. | 1 |
| API/runtime validation — DESIGNED FOR E2 | Existing typed views/domain operations → same-origin route handlers and server application services | Define narrow contracts/runtime schemas/error classes/origin-CSRF/rate limits; never trust supplied owner IDs; direct server queries reuse same services. No endpoints exist yet. | 2 |
| Persistence — DESIGNED FOR E2 | Window stores/snapshots → Drizzle/Neon PostgreSQL and reviewed SQL | Entity/current/version invariants, atomic writes, concurrency/version conflicts/idempotency, migrations/rollback compatibility. E1 synthetic fixtures are not customer migration data. | 2 |
| File upload/storage — DESIGNED FOR E2 | Owner/version Blob maps → private EU staging/final R2 adapter | Authorized short-lived upload/finalize; actual type/size/quotas; staging cannot overwrite reviewed final files; scan before preview/download; private keys and strict CORS. | 3 |
| File access/download — DESIGNED FOR E2; batch guarantee REQUIRES DECISION | Owned history/download/viewer → server-authorized short-lived capabilities | Membership/personnel/version/current vs historical checks, revocation, filename handling, byte integrity; explicitly define batch/browser outcomes, never equate anchor initiation with receipt. | 3 |
| Invitations — DESIGNED FOR E2 | Local invite/portal fixture/member records → scoped server token/email boundary | Cryptographic random token stored hashed, owner/request scope, expiration/revocation/rate limits/reissue, minimal URL/log data; verify actual recipient flow. | 3 |
| Company sharing — preparation IMPLEMENTED E1; service DESIGNED FOR E2 | Local package preview → secure share creation/access/revocation service | Reject null/stale/unattached versions; server file authorization; expiry/password/download semantics provisional; password/token privacy; no local preview treated as external success. | 3 |
| Email/reminders — DESIGNED FOR E2 | Unavailable composer/send controls → idempotent queued actual delivery | Approved bilingual content/provider processing review, retry/dead-letter, deduplication, consent/lawful purpose, webhook verification; record delivered/sent states only from actual accepted operations. | 4 |
| Jobs/scheduling — DESIGNED FOR E2 | No job runtime → pg-boss finite worker/Railway cron direction | Transactional enqueue, bounded retries/claims/resources/maintenance/reconciliation, authorization recheck at execution, overlap/queue-age monitoring; pin/test library behavior, no always-on web polling assumed. | 4 |
| OCR/AI — DESIGNED FOR E2, operational NOT VERIFIED | Deterministic extraction fixture/manual review → bounded scan/native-text/OCR/provider adapters | Real-document processing/privacy/residency/legal gate, schema/provenance/evaluation, human confirmation; Extracted is not Verified. No real document sent by E1. | 5 |
| Audit/events — E1 local records; DESIGNED FOR E2 | Existing immutable identity/timestamp intent → transactional durable event/audit recording | Actor/owner provenance, integrity/retention/redaction, no backfilled fake events; define missing Company lifecycle recording rather than infer activity from rows. | 2–4 |
| Notifications/read state — E1 projections; DESIGNED FOR E2 | Authorized actual notices/read IDs → durable user+company records and event generation | Remain read across refresh/login/devices; recipient authorization before counts/export, idempotent generation, separate attention/activity/delivery. | 4 |
| Billing — demo IMPLEMENTED E1; provider REQUIRES DECISION | Local plan/payment metadata/sample invoice → eventual billing adapter | No full card/PAN/CVV in demo; provider/checkout/webhook/entitlement/tax/invoice contracts, secret handling and actual payment validation required. Existing safe metadata is not provider integration. | After core authority |
| Observability — DESIGNED FOR E2 | Error states/console → redacted structured logs, request/job correlation, persistent failures/metrics | No document/token/password logging; actionable failures/alerts, provider outages/retries and privacy review. | With each integration |
| Retention/privacy — REQUIRES DECISION | Tab memory/history → reviewed personnel/document/audit lifecycle | Lawful-purpose/minimization/access policies, deletion/legal hold/retention, regional processing and processor agreements; no GDPR certification inferred. | Before real data |
| Secrets/deployment — DESIGNED FOR E2, NOT VERIFIED | Secret-free local app → validated server env/least-privilege runtime | Non-secret env contract, no secret in NEXT_PUBLIC/client bundle, TLS/origin/rate limits, real service regions/config/security headers and production preview restriction. No providers provisioned here. | Before deployment |
| Recovery — DESIGNED FOR E2, NOT VERIFIED | No durable data → DB PITR/snapshots plus independent encrypted backups/object reconciliation | Explicit RPO/RTO/retention, separate credentials, verified restore to fresh DB and matching object versions, incident runbook; a plan is not a tested restore. | Before real data |

Sequence: domain/authorization decisions → application/runtime contracts → persistence/migrations → private files/capabilities → actual transactional events/jobs/delivery → gated processing → operational hardening/restore rehearsal. Keep existing Vendor/Company/Employee review and privacy policies; do not rewrite approved E1 behavior simply to match a selected provider SDK.

## 19. Confirmed Findings

### New E1C-008C-T findings

**None confirmed.** Do not manufacture T001 from a known A/B root cause, a dated design document, an unmeasured scale concern or the documented browser automatic-download policy. This does not mean the application is free of defects or production-ready.

### Carried E1C-008A-F001 — Initial document drawer SSR failure

- **Area/category:** Document Details/History and shared initial-open portal; SSR/Hydration.
- **Priority/severity/status/size:** **P1 / Medium / Confirmed / S**. Original ID retained.
- **Preconditions/reproduction:** Existing production build, accessible fixture ISU version; raw request and browser load/refresh of the ten affected contexts in §6. No backend/file mutation needed.
- **Actual/expected:** HTTP 500 with `document is not defined`, then recovered UI; supported owned Details/History must return healthy HTTP 200, and unavailable targets must retain safe recovery without a portal crash.
- **Evidence/root/modules:** H, production log, selected captures; unguarded `createPortal(..., document.body)` in `src/components/ui/Drawer.tsx`, initial selection in DocumentManagementDrawer and Documents/Vendor route composition. Effects do not guard render.
- **Dependencies/minimal fix:** Hydration-consistent portal target/readiness in existing shared mechanics; preserve first server/client render consistency, URL selection, dimensions, focus and cleanup. Review equivalent Modal initial-open risk within this regression surface. No redesign/new route/auth change.
- **Risk/acceptance:** Given owned RO/EN Details/History from both contexts, when directly loaded/refreshed, then HTTP 200/no server or hydration error and correct drawer. Given unavailable/foreign/stale targets, then existing no-disclosure recovery remains. Given normal SPA opening/Back/close/nested actions/company switch, then focus/inert/scroll/current/history bytes remain unchanged. Backlog detail §21; original A finding remains canonical.

### Carried E1C-008A-F002 — Stale labels and incomplete validation entry points

- **Area/category:** Existing regression discovery/labels/environment selection; Test Infrastructure.
- **Priority/severity/status/size:** **P2 / Low / Confirmed / S**. Original ID retained; no duplicate C ticket for related CI/discovery details.
- **Preconditions/reproduction:** Current approved `Șabloane / Templates`, unchanged suite/config. Run F, compare I default vs all file/case inventory.
- **Actual/expected:** Four timeouts at `^Cerințe(?: \d+)?$` / `^Requirements(?: \d+)?$`; current UI has correct links. Fifteen functional cases omitted by normal command; mixed foundation has a dev-only assertion. Intended validation must discover all functional tests with current labels and explicit production/dev separation.
- **Evidence/root/modules:** F traces/error contexts/log and I inventory; `e2e/document-session-navigation.spec.ts`, explicit `package.json` enumeration, existing Playwright webServer/CI mode. No evidence of application data loss at the failed selector.
- **Dependencies/minimal fix:** Update stale expectations using current catalogs/patterns without weakening downstream assertions; define explicit complete functional discovery and runtime modes, keep dev preview restricted and utility separately accounted for. Pair F001 with direct-response assertions.
- **Risk/acceptance:** Given current RO/EN sidebar at 1448/375, when all four original cases run, then every original persistence/history/download assertion completes with no stale-label timeout. Given local/CI normal validation, then Login/manual expiry/session suites are included or durably explicit, dev preview is checked only in development and both production locales remain 404. No UI rename, silent skip or timeout/retry inflation.

## 20. Suspected / Not Verified

| Observation | Classification / further evidence needed |
| --- | --- |
| Historical concurrent timing failures | **NOT REPRODUCED** in controlled 3×parallel and 3×serial attempts. More repetitions on CI/other load/browser may still reveal a signature; do not assert resolved. |
| Sustained memory leak | **NOT VERIFIED**. DOM/document listeners/subscriptions plateaued in the named loops; modest heap growth remains unattributed. Long-run heap snapshots/retainers required before a leak ticket. |
| Large-batch every-file receipt | **NOT VERIFIED** across policies/engines; observed 10/11 here. Existing compatibility boundary, not lost stored bytes or a universal capacity rule. |
| E2-scale throughput/render performance | **NOT VERIFIED**. Only fixture-size local timings. Need approved workloads/budgets, representative network/CPU and profiling. |
| Unreached F002 tail assertions | **NOT VERIFIED** for those four runs; overlapping other passes do not make their tails executed. |
| Server auth/DB/RLS/storage/tokens/jobs/providers | **DEFERRED TO E2**; no implementation/provisioning to test. |
| Dependency CVEs, deep secret history, penetration/deployed host review | **NOT VERIFIED**. This audit inspected local pinned/config/source boundaries; it did not run an external vulnerability or infrastructure assessment. |
| Arbitrary corrupted runtime state/unsupported invalid-email legacy Employee | **NOT VERIFIED** beyond named negative tests; strict current read contract intentionally refuses invalid Employee records. No contract expansion authorized. |
| Safari/Firefox/real touch/software keyboard/native download permissions/assistive technology | **NOT VERIFIED**; Chromium + explicit native-PDF group and prior viewport coverage only. |
| Initial-open future Modal/popover routes | **NOT VERIFIED / NOT APPLICABLE** to unsupported entries today; include portal readiness in future SSR tests rather than inventing URLs. |
| Architecture documentation drift | Separate documentation observation in §16, not evidence of a missing E1 application feature. |

## 21. Prioritized Remediation Backlog

Required technical backlog contains **only the two confirmed carried A issues**. No speculative/E2-only risk or B optional decision is promoted to a required C story.

### P0 — Must Fix

No P0 newly confirmed within E1's tested boundaries. Production customer-data security is not approved by that statement.

### P1 — Should Fix Before E1 Closure

**Story A-F001 — Make existing document query entry SSR-safe.** Description: remove the render-time portal crash while preserving the existing Details/History client workflow. Priority P1; severity Medium; size S. Depends on no backend; coordinate shared overlay/accessibility and F002 regression discovery.

- **Data/API:** existing `DocumentSelection`, owned document/version/history references, `contextPath`; **no API, model, route or ownership-policy change**.
- **Technical steps/modules:** inspect initial Documents/Vendor selections, implement minimal shared Drawer portal readiness/target behavior, assess equivalent Modal initial-open safety, add direct HTTP/refresh assertions independently of recovered DOM. Do not rewrite overlay mechanics or feature handlers.
- **Happy path AC:** Given owned Details/History in RO/EN from both contexts, when load/refresh and SPA navigation occur, then HTTP is 200, correct visible screen and no SSR/hydration error.
- **Edge/error/empty/loading AC:** Given unavailable/stale/foreign target, then safe existing state/no disclosure/no portal crash; server and first client rendering remain consistent while readying a portal, without fake content or delay. Preserve valid current/history selection/Back.
- **Permissions AC:** existing role/company checks still deny foreign/restricted versions; no browser gate is represented as future server authorization.
- **Regression risks/checks:** all shared drawers, Tooltip/nested Modal, Escape/backdrop/Tab/focus restoration, inert/body scroll, responsive widths, locale/company switch, actual historical files and direct response status. Unblocks healthy entry and the E1 response-quality gate.

### P2 — Minor / Scheduled

**Story A-F002 — Restore discovery-complete, environment-explicit regression validation.** Description: current approved labels, all functional suites and unambiguous production/development entry modes. Priority P2; severity Low; size S. Depends on agreed intended validation entry; coordinate F001 response checks, not an UI terminology rollback.

- **Data/API:** test inputs/selectors/configuration only; **no application data or API change**.
- **Technical steps/modules:** use existing translation/current label patterns in the session suite, account for Login/manual expiry/session files, separate the foundation dev assertion and screenshot utility, define server selection/readiness under local and CI config, document exact normal commands/counts. Existing package/Playwright modules, no new dependency.
- **Happy path AC:** Given normal local/CI entry, then all intended functional suites execute; four unchanged lifecycle scenarios reach all original tail assertions in RO/EN 1448/375.
- **Edge/environment/loading AC:** Given a production server, dev-only routes remain 404; given development, its preview assertion passes; server readiness is explicit, not accidental reuse of a user server. Unsupported utility/default fixture behavior is separately accounted for, not silently skipped.
- **Permissions AC:** existing negative personnel/company/file tests remain included and unweakened. No application role/session contract changes.
- **Regression risks/checks:** omissions hidden by explicit lists, accidental dev server in production validation, retry-masked failures, false clean-suite totals. Keep per-attempt reporting and direct-response checks. Unblocks trustworthy full closure regression.

### Dependency order for consolidation

1. Stabilize/disclose discovery and test environment contract (F002); retain known failure visibility while F001 is still open.
2. Correct SSR/hydration initial portal behavior (F001) and validate raw status separately from client UI.
3. Apply B's existing UI fixes without duplicating them; especially U001 contrast and existing consumer U002/U004 corrections, preserving scoped lifecycle.
4. Re-run runtime/state/negative authorization/current-history/file regressions and targeted parallel/serial loops.
5. Recheck observed file/download limits and explicit product guarantees; no new archive/service by inference. Performance/observability improvements only against approved evidence/requirements.
6. Run discovery-complete production conformance + separate dev assertion + HTTP health + typecheck/lint/units/build/diff checks; review residual NOT VERIFIED/product/E2 gates before closure.

E2 foundation/security/file/integration phases remain separate from E1 remediation. No broad rewrite, provider install, telemetry connection or cleanup is authorized by this sequence.

## 22. Existing A/B Finding Cross-References

| ID | Current disposition | No-duplication boundary |
| --- | --- | --- |
| A-F001 | **FAIL reconfirmed**, expanded affected supported History/unavailable contexts; §6/19/21 | Keep original ID for shared SSR root; no C-T001 copy. |
| A-F002 | **FAIL reconfirmed**, complete 59-file/521-case discovery and local/CI mode details; §13/19/21 | Keep original test-infrastructure ID; deterministic labels are not flaky. |
| B-U001 | Existing P1 text contrast remains | No code change; no separate technical performance/accessibility ticket. |
| B-U002 | Existing P2 Share Tooltip layer remains | Consumer integration, not new Drawer lifecycle failure. |
| B-U003 | Existing P2 Login placeholder typography remains | No source/CSS remediation during C. |
| B-U004 | Existing P2 invalid-upload visible focus recovery remains | Local/shared form consumer issue, not a new technical global-focus ticket. |
| B-O001 / O002 | Optional filter/empty-state simplification | Product approval required, not confirmed defects. |
| B-D001 | English glossary approval | Do not rename UI or routes during technical audit. |

A's large-download coverage limit is now backed by the C observation in §12; no stored file corruption or new delivery capability is inferred. A/B reports and their local artifacts remain unmodified. C supplies technical evidence and sequencing, not premature resolution.

## 23. E1 Closure Risks

| Closure classification | Items / condition |
| --- | --- |
| **BLOCKS E1 CLOSURE** | A-F001: supported entry still HTTP 500. A-F002: discovery-complete clean functional validation cannot yet be claimed; stale cases stop before their assertions. |
| **SHOULD FIX BEFORE E1 CLOSURE** | Existing B-U001 P1 readability and agreed B UI corrections; validated minimal shared fixes rather than redesign. C does not replace B's accessibility assessment. |
| **OPTIONAL E1 IMPROVEMENT** | Evidence-backed future diagnostics/metadata documentation and scoped architecture-current-state wording; no speculative refactor or environment-pool change merely because Vitest suggests it. |
| **PRODUCT DECISION REQUIRED** | Stronger large-batch browser delivery expectation/guidance/recovery; B's optional simplifications/glossary; any change to accepted E1 lifetime/policies. |
| **DEFERRED TO E2** | Real identity, server authorization, durable data/read state/audit, private files/capabilities/scanning, delivery/jobs, processing, billing and operational/privacy/recovery gates. |
| **NOT VERIFIED** | Full cross-engine/device/assistive/zoom coverage, long-run leak/scale testing, external vulnerability/production infrastructure review and four blocked suite tails. |

E1 closure is a browser-demo quality milestone, not production readiness, security approval, GDPR certification, real email/payment success, durable storage or OCR/AI verification. Fixture-only private data must not be replaced with real customer/personnel files before server-enforced gates pass.

## 24. E1C-008C Sign-Off Assessment

**Technical audit deliverable complete; fixes not implemented.** Runtime/test/source baseline, supported direct entry, hydration, overlay lifecycle, state/authorization/file boundaries, test discovery/repetition, measured demo performance, observability and E2 integration/security gates are documented with explicit execution limits.

New C finding counts are **0 P0 / 0 P1 / 0 P2**; the original **A-F001 P1 and A-F002 P2 remain confirmed and open**, and all B findings retain their IDs/dispositions. This is not an unconditional E1 closure sign-off. The required technical backlog and consolidation order are in §21.

Audit validation: typecheck/lint/581 unit-component passes; 211 passing production attempts plus four unchanged known failures; separate dev preview pass; independent 66-URL response/refresh probe; controlled serial/parallel comparison, local performance/file/cleanup evidence, report structure/link/inventory consistency, mockup hashes, diff/status/staged-scope checks. A's successful unchanged production build is relied upon, not presented as a fresh C build.

Only this Markdown report is intended for the single local task commit: `docs: add E1C technical hardening audit`. No source/test/script/configuration/dependency/mockup or user session was changed. The six pre-existing untracked canonical PNGs are preserved; diagnostic files are ignored local artifacts. No amend or push is authorized or performed.
