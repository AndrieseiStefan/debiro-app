# Approved Mockups

This repository tracks sixteen approved product mockup images listed below. They are the canonical visual, interaction, typography, and Romanian-copy references. Do not generate fake screenshots or use screenshots as functional UI.

## Expected initial mapping

| File | Canonical experience |
| --- | --- |
| `01-landing-page.png` | Marketing experience |
| `02-onboarding.png` | Company onboarding |
| `03-dashboard-overview.png` | Internal dashboard |
| `04-vendors-list.png` | Vendor/subcontractor list |
| `05-vendor-details.png` | Vendor detail and document status |
| `06-document-requirements.png` | Requirement management |
| `07-invite-vendor.png` | Supplier invitation interaction |
| `08-supplier-upload-portal.png` | Supplier-facing secure upload experience |
| `09-document-review.png` | Document preview and extracted-information review |
| `10-audit-activity.png` | Activity and audit experience |
| `11-documents.png` | Global authenticated Documents page |
| `12-onboarding-step2.png` | Optional document requirements onboarding step |
| `13-onboarding-step3.png` | Optional add-suppliers onboarding step; E1-012B supersedes its invitation wording and actions |
| `14-login.png` | Existing-user login screen |
| `15-add-vendor.png` | Add Vendor drawer; E1-015 adds required CUI and optional registration/website fields |
| `16-add-document.png` | Add Document drawer; E1-016 uses inline actions instead of the pictured sticky footer |

## Contract

For every approved mockup, these are canonical:

- Layout, hierarchy, and spacing
- Visual treatment and typography
- Interaction model
- Visible Romanian product copy

Explicit later product tasks may supersede a specific mockup detail; the original image remains unchanged. E1-012A/B supersede the optional onboarding defaults, Step 2/3 labels, and Step 3 invitation copy/actions. E1-015 adds required CUI and optional registration/website fields to mockup 15 without changing the image. E1-016 requires inline, scrollable actions rather than mockup 16's sticky footer.

These sample values are not canonical:

- Names and companies
- Dates and counts
- Document values and other demo data

Temporary branding must be replaced as follows: `ComplyHub` → `DEBIRO` (uppercase visible text). Technical identifiers and `debiro.ro` stay lowercase.

Every future mockup-backed UI task must:

1. Reference the exact relevant mockup path.
2. Inspect the mockup before coding.
3. Reproduce it as closely to 1:1 as technically practical.
4. Build functional UI rather than displaying the screenshot.
5. Perform a visual comparison after implementation.
6. Document and report every material deviation.
