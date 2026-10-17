import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {afterEach, describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {CompanyDocumentsPage} from '@/features/company-documents/CompanyDocumentsPage';
import {addCompanyDocument, replaceCompanyDocument} from '@/features/company-documents/management';
import {readCompanyDocumentsState} from '@/features/company-documents/company-documents-state';
import {switchActiveCompany} from '@/features/companies/company-state';
import type {CompanyDocumentsState} from '@/features/company-documents/types';

vi.mock('@/i18n/navigation', () => ({usePathname: () => '/company/documents', useRouter: () => ({push: vi.fn()}), Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props}/>}));
type Owner = {state: CompanyDocumentsState; files: Map<string, Map<string, Blob>>; listeners: Set<() => void>};
const owner = () => Reflect.get(window, Symbol.for('debiro.company-documents-session')) as Owner;
const initial = readCompanyDocumentsState();
const input = (name: string) => ({name, documentType: 'tax' as const, issuer: 'ANAF', expiresAt: '', file: new File(['real bytes'], `${name}.pdf`, {type: 'application/pdf'})});
function upload(name: string) {const result = addCompanyDocument('demo-company', input(name)); if (!result.ok) throw new Error(result.reason); return result;}
function view(locale: 'ro' | 'en') {return render(<NextIntlClientProvider locale={locale} messages={locale === 'ro' ? ro : en}><CompanyDocumentsPage locale={locale}/></NextIntlClientProvider>);}
const field = (id: string) => screen.getByRole('dialog').querySelector(`#company-share-${id}`)!;
const change = (id: string, value: string) => fireEvent.change(field(id), {target: {value}});
async function close() {
  fireEvent.keyDown(document, {key: 'Escape'});
  await waitFor(() => {expect(screen.queryByRole('dialog')).toBeNull(); expect(document.body.style.overflow).not.toBe('hidden');});
}
afterEach(() => {owner().state = initial; owner().files.clear(); switchActiveCompany('demo-company');});

describe('shared Company sharing drawer', () => {
  it.each(['ro', 'en'] as const)('selects every unattached row, warns, previews all entries and discloses unavailable downloads in %s', async (locale) => {
    const copy = locale === 'ro' ? ro : en, t = copy.CompanyDocumentSharing;
    view(locale);
    fireEvent.click(screen.getByRole('checkbox', {name: copy.CompanyDocuments.selectPage}));
    expect(screen.getByRole('status')).toHaveTextContent('6');
    const download = screen.getByRole('button', {name: copy.CompanyDocuments.downloadSelected});
    expect(download).toHaveAttribute('aria-disabled', 'true'); act(() => download.focus());
    expect(screen.getByRole('tooltip')).toHaveTextContent(copy.CompanyDocuments.downloadSelectionUnavailable);
    fireEvent.click(screen.getByRole('button', {name: copy.CompanyDocuments.shareSelected}));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('status')).toHaveTextContent(t.missingAttachments.replace('{count}', '6'));
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(6);
    for (const checkbox of within(dialog).getAllByRole('checkbox')) {expect(checkbox).toBeEnabled(); expect(checkbox).toBeChecked(); expect(checkbox).toHaveAccessibleDescription(t.missingAttachment);}
    change('name', 'Package'); fireEvent.click(within(dialog).getByRole('button', {name: t.preparePreview}));
    const preview = within(dialog).getByRole('region', {name: t.previewTitle});
    expect(within(preview).getAllByRole('listitem')).toHaveLength(6); expect(within(preview).getAllByText(t.missingAttachment)).toHaveLength(6);
    expect(owner().files.size).toBe(0); expect(owner().state).toBe(initial);
    await close();
    const missing = initial.byCompany['demo-company'].requirements.find((item) => item.currentDocumentId === null)!;
    fireEvent.click(screen.getByRole('button', {name: copy.CompanyDocuments.shareDocument.replace('{name}', missing.name[locale])}));
    expect(within(screen.getByRole('dialog')).getByRole('checkbox', {name: copy.CompanyDocuments.selectDocument.replace('{name}', missing.name[locale])})).toBeChecked();
    expect(within(screen.getByRole('dialog')).queryByRole('status')).toBeNull();
  });

  it('keeps preview and table selection when an attachment disappears, and excludes incomplete bulk downloads', async () => {
    const uploaded = upload('Available proof'); view('en');
    fireEvent.click(screen.getByRole('checkbox', {name: 'Select Available proof'}));
    expect(screen.getByRole('button', {name: en.CompanyDocuments.downloadSelected})).not.toHaveAttribute('aria-disabled');
    fireEvent.click(screen.getByRole('button', {name: en.CompanyDocuments.shareSelected})); change('name', 'Package');
    const dialog = screen.getByRole('dialog'); fireEvent.click(within(dialog).getByRole('button', {name: en.CompanyDocumentSharing.preparePreview}));
    expect(within(within(dialog).getByRole('region', {name: en.CompanyDocumentSharing.previewTitle})).queryByText(en.CompanyDocumentSharing.missingAttachment)).toBeNull();
    act(() => {owner().files.get('demo-company')!.delete(uploaded.document.id); owner().state = {...owner().state}; owner().listeners.forEach((notify) => notify());});
    expect(within(dialog).getByRole('region', {name: en.CompanyDocumentSharing.previewTitle})).toHaveTextContent(en.CompanyDocumentSharing.missingAttachment);
    await close(); expect(screen.getByRole('checkbox', {name: 'Select Available proof'})).toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('1 selected');
    expect(screen.getByRole('button', {name: en.CompanyDocuments.downloadSelected})).toHaveAttribute('aria-disabled', 'true');
  });

  it.each(['ro', 'en'] as const)('supports all three entry points and editable exact-version selection in %s', async (locale) => {
    const copy = locale === 'ro' ? ro : en, t = copy.CompanyDocumentSharing;
    const a = upload('Package proof A'), b = upload('Package proof B'); view(locale);
    const trigger = screen.getByRole('button', {name: copy.CompanyDocuments.shareDocuments});
    act(() => trigger.focus()); fireEvent.click(trigger);
    let dialog = screen.getByRole('dialog'); expect(within(dialog).getByText(t.selectedDocuments.replace('{count}', '0'))).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', {name: t.preparePreview})); expect(within(dialog).getByText(t.errors.empty)).toBeVisible();
    fireEvent.click(within(dialog).getByRole('checkbox', {name: copy.CompanyDocuments.selectDocument.replace('{name}', 'Package proof A')}));
    change('name', ' Package '); fireEvent.click(within(dialog).getByRole('button', {name: t.preparePreview}));
    const preview = within(dialog).getByRole('region', {name: t.previewTitle}); expect(preview).toHaveTextContent('Package proof A'); expect(preview).not.toHaveTextContent('Package proof B'); expect(preview).not.toHaveTextContent(a.document.id);
    expect(within(dialog).getByRole('button', {name: t.generateLink})).toHaveAttribute('aria-disabled', 'true');
    await close(); await waitFor(() => expect(trigger).toHaveFocus());
    fireEvent.click(screen.getByRole('checkbox', {name: copy.CompanyDocuments.selectDocument.replace('{name}', 'Package proof A')}));
    fireEvent.click(screen.getByRole('button', {name: copy.CompanyDocuments.shareSelected})); dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('checkbox', {name: copy.CompanyDocuments.selectDocument.replace('{name}', 'Package proof A')})).toBeChecked();
    expect(within(dialog).getByRole('checkbox', {name: copy.CompanyDocuments.selectDocument.replace('{name}', 'Package proof B')})).not.toBeChecked();
    await close();
    fireEvent.click(screen.getByRole('button', {name: copy.CompanyDocuments.shareDocument.replace('{name}', 'Package proof B')})); dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('checkbox', {name: copy.CompanyDocuments.selectDocument.replace('{name}', 'Package proof B')})).toBeChecked();
    expect(within(dialog).getByRole('checkbox', {name: copy.CompanyDocuments.selectDocument.replace('{name}', 'Package proof A')})).not.toBeChecked();
    expect(owner().state.byCompany['demo-company'].documents.some((item) => item.id === b.document.id)).toBe(true);
  });

  it('retains fields/selection across delivery modes, validates, previews without passwords and clears sensitive input on close', async () => {
    upload('Proof'); view('en'); fireEvent.click(screen.getByRole('button', {name: 'Share Proof'}));
    const t = en.CompanyDocumentSharing, dialog = screen.getByRole('dialog');
    change('name', 'Package'); change('recipient', 'Buyer'); change('message', 'Message');
    fireEvent.click(within(dialog).getByRole('switch', {name: t.passwordProtected})); change('password', 'secret-ephemeral');
    fireEvent.click(within(dialog).getByRole('button', {name: t.email})); change('email', 'wrong');
    fireEvent.click(within(dialog).getByRole('button', {name: t.preparePreview})); expect(field('email')).toHaveAttribute('aria-invalid', 'true');
    change('email', 'buyer@example.org');
    fireEvent.click(within(dialog).getByRole('button', {name: t.link})); expect(field('name')).toHaveValue('Package'); expect(field('password')).toHaveValue('secret-ephemeral');
    fireEvent.click(within(dialog).getByRole('button', {name: t.email})); expect(field('email')).toHaveValue('buyer@example.org');
    const before = JSON.stringify(owner().state); fireEvent.click(within(dialog).getByRole('button', {name: t.preparePreview}));
    const preview = within(dialog).getByRole('region', {name: t.previewTitle});
    expect(preview).toHaveTextContent('buyer@example.org'); expect(preview).toHaveTextContent('Message'); expect(preview).not.toHaveTextContent('secret-ephemeral');
    expect(JSON.stringify(owner().state)).toBe(before); expect(JSON.stringify(owner().state)).not.toContain('secret-ephemeral');
    fireEvent.click(within(dialog).getByRole('button', {name: t.sendEmail})); expect(screen.getByRole('tooltip')).toHaveTextContent(t.backendUnavailable);
    expect(within(dialog).queryByRole('link')).toBeNull(); await close();
    fireEvent.click(screen.getByRole('button', {name: en.CompanyDocuments.shareDocuments}));
    expect(field('recipient')).toHaveValue(''); expect(screen.getByRole('dialog').querySelector('input[type=password]')).toBeNull();
    await close();
    expect(screen.getByRole('region', {name: en.CompanyDocuments.summaryLabel})).toHaveTextContent('0');
  });

  it('retains and explains replaced/missing-byte selections instead of silently switching versions', () => {
    const a = upload('Old proof'); view('en'); fireEvent.click(screen.getByRole('button', {name: 'Share Old proof'})); change('name', 'Package');
    act(() => {replaceCompanyDocument('demo-company', a.requirementId, a.document.id, input('New proof'));});
    const dialog = screen.getByRole('dialog'); expect(within(dialog).getByRole('alert')).toHaveTextContent(en.CompanyDocumentSharing.errors.stale);
    fireEvent.click(within(dialog).getByRole('button', {name: en.CompanyDocumentSharing.preparePreview})); expect(within(dialog).queryByRole('region', {name: en.CompanyDocumentSharing.previewTitle})).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', {name: en.CompanyDocumentSharing.remove}));
    const checkbox = within(dialog).getByRole('checkbox', {name: en.CompanyDocuments.selectDocument.replace('{name}', 'Old proof')}); fireEvent.click(checkbox);
    act(() => {owner().files.clear(); owner().state = {...owner().state}; owner().listeners.forEach((notify) => notify());});
    expect(within(dialog).getByRole('checkbox', {name: 'Select Old proof'})).toHaveAccessibleDescription(en.CompanyDocumentSharing.missingAttachment); expect(checkbox).toBeChecked();
    fireEvent.click(within(dialog).getByRole('button', {name: en.CompanyDocumentSharing.preparePreview}));
    expect(within(dialog).getByRole('region', {name: en.CompanyDocumentSharing.previewTitle})).toHaveTextContent(en.CompanyDocumentSharing.missingAttachment);
  });

  it.each(['ro', 'en'] as const)('renders localized field validation without creating a preview in %s', (locale) => {
    upload('Validation proof'); view(locale);
    const copy = locale === 'ro' ? ro : en, t = copy.CompanyDocumentSharing;
    fireEvent.click(screen.getByRole('button', {name: copy.CompanyDocuments.shareDocument.replace('{name}', 'Validation proof')}));
    const dialog = screen.getByRole('dialog'); change('name', ' '.repeat(4)); change('expires', '31.02.2027'); change('message', 'x'.repeat(501));
    fireEvent.click(within(dialog).getByRole('button', {name: t.email})); change('email', 'invalid');
    fireEvent.click(within(dialog).getByRole('switch', {name: t.passwordProtected})); change('password', 'short');
    fireEvent.click(within(dialog).getByRole('button', {name: t.preparePreview}));
    for (const id of ['name', 'expires', 'message', 'email', 'password']) expect(field(id)).toHaveAttribute('aria-invalid', 'true');
    for (const key of ['name', 'date', 'message', 'email', 'password'] as const) expect(within(dialog).getByText(t.errors[key])).toBeVisible();
    expect(within(dialog).queryByRole('region', {name: t.previewTitle})).toBeNull();
  });

  it('closes on company switch, clears temporary state and preserves company files', async () => {
    upload('Private proof'); view('en'); fireEvent.click(screen.getByRole('button', {name: 'Share Private proof'})); change('name', 'Private package'); change('recipient', 'Private recipient');
    fireEvent.click(screen.getByRole('switch', {name: en.CompanyDocumentSharing.passwordProtected})); change('password', 'private-password');
    const before = owner().state; act(() => {switchActiveCompany('global-clean-services');});
    expect(screen.queryByRole('dialog')).toBeNull(); expect(screen.queryByText('Private proof')).toBeNull(); expect(owner().state).toBe(before);
    act(() => {switchActiveCompany('demo-company');}); fireEvent.click(screen.getByRole('button', {name: en.CompanyDocuments.shareDocuments}));
    expect(field('name')).toHaveValue(''); expect(field('recipient')).toHaveValue(''); expect(screen.getByRole('dialog').querySelector('input[type=password]')).toBeNull();
    expect(owner().files.get('demo-company')?.size).toBe(1);
  });
});
