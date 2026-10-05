import {fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {DocumentManagementDrawer} from '@/features/documents/DocumentManagementDrawer';

const access = vi.hoisted(() => ({replace: true, outcomes: false, downloadable: false}));
vi.mock('@/features/documents/document-access', () => ({documentAccess: () => ({visible: true, replace: access.replace, review: true})}));
vi.mock('@/features/documents/created-documents', async (original) => {
  const documentsModule = await original<typeof import('@/features/documents/created-documents')>();
  const initial = documentsModule.readDocumentRecords().find((item) => item.id === 'construct-pro-registration-2024')!;
  const records = [4, 3, 2, 1].map((version) => ({...initial, id: `version-${version}`, version, versionGroupId: initial.id,
    filename: `certificate-v${version}.pdf`, expiresAt: '2026-12-12', notes: 'Retained underlying note', supersededById: version < 4 ? `version-${version + 1}` : undefined}));
  return {...documentsModule, documentFile: (_companyId: string, id: string) => access.downloadable && id === 'version-3' ? new Blob(['actual bytes']) : undefined,
    useDocumentRecords: () => access.outcomes ? records.map((item) => ({...item, reviewOutcome: item.version === 4 ? 'pending' : item.version === 2 ? 'rejected' : 'approved'})) : records};
});
vi.mock('@/i18n/navigation', () => ({useRouter: () => ({replace: vi.fn()}), Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props}/> }));

beforeEach(() => {access.replace = true; access.outcomes = false; access.downloadable = false;});
function open(english = false, documentAction?: string) {
  render(<NextIntlClientProvider locale={english ? 'en' : 'ro'} messages={english ? en : ro}>
    <DocumentManagementDrawer documentId="version-4" documentAction={documentAction} contextPath="/documents"/>
  </NextIntlClientProvider>);
  return screen.getByRole('dialog');
}

describe('canonical document details and internal drawer navigation', () => {
  it.each([false, true])('shows only approved information and a three-version preview (EN=%s)', (english) => {
    const drawer = open(english);
    expect(within(drawer).getAllByRole('term').map((item) => item.textContent)).toEqual(english
      ? ['Name', 'Requirement', 'Compliance status', 'Expiry date', 'Uploaded at', 'Uploaded by']
      : ['Nume', 'Cerință', 'Status conformitate', 'Dată expirare', 'Încărcat la', 'Încărcat de']);
    expect(within(drawer).getAllByRole('definition')[2].querySelectorAll('svg')).toHaveLength(1);
    expect(within(drawer).getAllByRole('definition')[2].querySelector('span[aria-hidden]')).toBeNull();
    expect(within(drawer).queryByText('Retained underlying note')).not.toBeInTheDocument();
    expect(drawer.querySelectorAll('[data-preview-version]')).toHaveLength(3);
    expect(within(drawer).getAllByText(english ? 'Current' : 'Curent')).toHaveLength(1);
    expect(within(drawer).getByRole('button', {name: english ? 'Mark as expired' : 'Marchează ca expirată'})).toBeDisabled();
    expect(within(drawer).getByRole('button', {name: english ? 'Delete document' : 'Șterge document'})).toBeDisabled();
    expect(within(drawer).getByRole('button', {name: english ? 'Download' : 'Descarcă'})).toBeDisabled();
    expect(within(drawer).queryByText('application/pdf')).not.toBeInTheDocument();
  });

  it.each([false, true])('keeps one mounted drawer and an exact root context through historical Back navigation (EN=%s)', (english) => {
    const drawer = open(english);
    fireEvent.click(within(drawer).getByRole('button', {name: english ? 'View all' : 'Vezi toate'}));
    expect(screen.getByRole('dialog')).toBe(drawer);
    expect(drawer.querySelectorAll('[data-version]')).toHaveLength(4);
    fireEvent.click(within(drawer.querySelector('[data-version="1"]') as HTMLElement).getByRole('button', {name: english ? 'Actions for version 1' : 'Acțiuni pentru versiunea 1'}));
    fireEvent.click(within(drawer).getByRole('menuitem', {name: english ? 'Open details' : 'Deschide detalii'}));
    expect(within(drawer).getByText('certificate-v1.pdf')).toBeVisible();
    expect(within(drawer).getByRole('button', {name: english ? 'Replace document' : 'Înlocuiește document'})).toBeDisabled();
    fireEvent.click(within(drawer).getByRole('button', {name: english ? 'Back to document history' : 'Înapoi la istoricul documentului'}));
    expect(drawer.querySelectorAll('[data-version]')).toHaveLength(4);
    fireEvent.click(within(drawer).getByRole('button', {name: english ? 'Back to document details' : 'Înapoi la detalii document'}));
    expect(within(drawer).getByText('certificate-v4.pdf')).toBeVisible();
    expect(screen.getAllByRole('dialog')).toEqual([drawer]);
  });

  it('provides a Back destination for a directly entered history and keeps replacement unavailable to a Viewer', () => {
    access.replace = false;
    const drawer = open(false, 'history');
    fireEvent.click(within(drawer).getByRole('button', {name: 'Înapoi la detalii document'}));
    expect(within(drawer).getByText('certificate-v4.pdf')).toBeVisible();
    expect(within(drawer).getByRole('button', {name: 'Înlocuiește document'})).toBeDisabled();
  });

  it.each([false, true])('keeps history essential and truthful for pending, approved and rejected versions (EN=%s)', (english) => {
    access.outcomes = true; access.downloadable = true;
    const drawer = open(english, 'history');
    const version = (number: number) => within(drawer.querySelector(`[data-version="${number}"]`) as HTMLElement);
    expect(version(4).getByText(english ? 'In review' : 'În review')).toBeVisible();
    expect(version(4).getByText(english ? 'Current version' : 'Versiune curentă')).toBeVisible();
    expect(version(3).getByText(english ? 'Approved' : 'Aprobată')).toBeVisible();
    expect(version(3).getByText(english ? /^Valid until:/ : /^Valabilă:/)).toBeVisible();
    expect(version(3).getByRole('button', {name: english ? 'Download' : 'Descarcă'})).toBeEnabled();
    expect(version(2).getByText(english ? 'Rejected' : 'Respinsă')).toBeVisible();
    expect(version(2).queryByText(/Valabilă:|Valid until:|Motiv:|Reason:/)).not.toBeInTheDocument();
    expect(version(1).queryByRole('button', {name: english ? 'Download' : 'Descarcă'})).not.toBeInTheDocument();
    expect(within(drawer).queryByText(/certificate-v\d.pdf|Retained underlying note/)).not.toBeInTheDocument();
    expect(within(drawer).queryByText(english ? en.DocumentManagement.downloadUnavailable : ro.DocumentManagement.downloadUnavailable)).not.toBeInTheDocument();
    expect(within(drawer).queryByRole('button', {name: english ? 'Open details' : 'Deschide detalii'})).not.toBeInTheDocument();
    const trigger = version(1).getByRole('button', {name: english ? 'Actions for version 1' : 'Acțiuni pentru versiunea 1'});
    fireEvent.keyDown(trigger, {key: 'ArrowDown'});
    const menu = within(drawer).getByRole('menu');
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(1);
    fireEvent.keyDown(menu, {key: 'Escape'});
    expect(within(drawer).queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(drawer).toHaveAttribute('data-phase', 'open');
  });
});
