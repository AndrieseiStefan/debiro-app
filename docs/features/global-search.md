# Global workspace search (E1-032Bf)

The existing authenticated top-navigation `SearchInput` now searches the active company's local workspace while typing. The current route and shell remain unchanged until a result is selected. [The canonical reference](../design/mockups/e1-032bf-global-search.png) supplies grouped rows, hierarchy and match emphasis; existing DEBIRO controls and this task's explicit data/action boundaries take precedence.

## Data and matching

`search-workspace.ts` is a synchronous, pure presentation projection over the existing company, vendor, uploaded-document, vendor-requirement and Requirements stores. It neither imports page fixtures nor mutates records. Active membership and company scope are checked before searching:

- Vendors: name, CUI and localized operational category. Compliance uses the same configured-requirement/current-document projection as Vendor Details/List. Contact information, descriptive industry and document contents are not searched.
- Documents: localized displayed name, filename and actual catalog/custom type label. Only owned current uploads with an owned vendor are searchable; rejected and superseded versions are excluded. History remains available inside existing Details/History.
- Requirements: company-owned template name, description and category, plus the existing company draft. There is one result per template, not one per contained rule. Platform starter suggestions are excluded. Incomplete drafts retain their identity, missing category/rules and validation; search never saves or finalizes them.

Normalization reuses the Requirements catalog helper: case/diacritic insensitive, collapsed whitespace and trimmed partial text. Empty/invalid queries return without scanning entity stores. Each group sorts exact title, title prefix, title substring, then secondary-field matches, with localized alphabetical and stable-ID ties. All matches appear; counts come from the same result projection, with empty groups omitted. There is no preview cap, pagination, View all, results route, OCR, remote API, search history or keystroke audit event.

## Existing destination reuse

Entire result rows are locale-aware links. Activation re-reads canonical stores and validates type, stable ID, existence, current ownership and active membership. Stale/inaccessible results cannot navigate and receive generic unavailable feedback without foreign metadata.

Vendors open `/vendors/[vendorId]`. Pending documents open the existing Review for Administrator/Reviewer; Viewer receives the existing safe Details drawer instead. Other current statuses use `/documents?document=<id>` and the existing Details/renewal/history implementation. Search adds no viewer or review workflow.

Requirements uses the existing workspace's `?template=<id>` entry intent. Administrators receive the existing atomic editor; read-only membership receives the existing supplier Preview composition with no editable controls or Save. This closes a pre-existing UI gap where saved-template controls were not consistently gated by the Administrator permission already used for creation. Dirty editor/draft navigation confirmation remains in force. Reopening the current entity preserves staged changes, including an incomplete draft; selecting another template never bypasses discard confirmation. These are local E1 role checks, not server authorization.

## Presentation and accessibility

`GlobalSearch` composes the existing SearchInput, Surface, Avatar, AppearanceIcon, StatusBadge, EmptyState, AppIcon and locale-aware routing. SearchInput and Surface gain backward-compatible ref forwarding for focus/positioning. Vendor/Document compliance badges are extracted unchanged from their existing consumers for reuse; no second status model or badge design is introduced. No suitable shared non-modal result overlay existed: this feature uses the existing fixed-portal/clamping conventions rather than misusing the modal Drawer.

The combobox exposes its expanded/listbox/active-option state. Cmd+K and Ctrl+K focus/open search (without intercepting unrelated shortcuts or active modal workflows). Arrow keys select/scroll results; Enter opens only a selected result. Tab remains native, row focus is visible, Escape/X dismiss with input focus restoration, and outside interaction closes. Clear returns to the ready state. Selection, route/locale change and company switch reset temporary query/selection. No query is persisted.

The panel anchors below the existing input, clamps to viewport gutters and scrolls internally. Desktop rows retain metadata columns; reduced widths wrap metadata and mobile uses stacked rows. Shell dimensions/breakpoints, header utilities, local searches and feature workflows are unchanged.

Explicit mockup overrides: no View all actions; no vendor document-content match statements; Requirements rows represent templates/drafts, not contained rules or invented mandatory statuses; actual group/total counts replace illustrative counts. Existing shared avatar/icon/badge treatment takes precedence over mockup-specific generic controls. English and generated captures remain pending product-owner visual approval.

Coverage: normalization/ranking/highlighting, company scope, current-only/version boundaries, empty/invalid input, 51-result volume, role-aware/stale activation; RO/EN live search, keyboard/close/clear, existing Vendor/Review/Details/History/template/draft destinations, dirty-edit protection, Viewer/Reviewer preview, company switch and desktop/tablet/mobile containment. Captures live under ignored `artifacts/visual/e1-032bf/`; they are review artifacts, not approved baselines.
