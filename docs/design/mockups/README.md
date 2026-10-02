# Approved Mockups

This repository tracks twenty-eight approved product mockup images listed below. They are the canonical visual, interaction, typography, and Romanian-copy references. Do not generate fake screenshots or use screenshots as functional UI.

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
| `17-bell-notification-center.png` | Authenticated bell notification preview |
| `18-company-settings-access-members.png` | Company Settings: Members & Access |
| `19-company-settings-plans-pay.png` | Company Settings: Plan & Billing |
| `20-profile-dropdown-menu.png` | Global-user profile dropdown; E1-020 omits the pictured company-management shortcuts |
| `21-Profile-my-companies.png` | Global-user My Companies page and local company creation |
| `22-change-company-popup.png` | Authenticated active-company switcher |
| `23A-Add-suggested-document-to-template.png` | Add catalog suggestion to a requirement template |
| `23B-Add-personalized-document-to-template.png` | Add custom document to a requirement template |
| `previzualizare-cerinte.png` | E1-025D supplier-facing Requirements Preview section; includes the task-approved additional info banner |
| `supplier-upload-portal-new.png` | E1-025D supplier context and requested-document section only; the existing Portal shell remains canonical |
| `24-vendor-requirement-template-assignment.png` | E1-027 template assignment, snapshot provenance, requirement removal and category-change warning |
| `25-vendor-details-contacts-activity-notes.png` | E1-027B vendor Contacts, Activity and threaded Notes; the task removes the redundant Documents CTA and retains shared immediate filters/plain-text notes |

## Contract

For every approved mockup, these are canonical:

- Layout, hierarchy, and spacing
- Visual treatment and typography
- Interaction model
- Visible Romanian product copy

Explicit later product tasks may supersede a specific mockup detail; the original image remains unchanged. E1-012A/B supersede the optional onboarding defaults, Step 2/3 labels, and Step 3 invitation copy/actions. E1-015 adds required CUI and optional registration/website fields to mockup 15 without changing the image. E1-016 requires inline, scrollable actions rather than mockup 16's sticky footer. E1-020 removes mockup 20's company-management group from the global-user menu.

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
