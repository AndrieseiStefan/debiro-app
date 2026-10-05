import {fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {DocumentManagementDrawer} from '@/features/documents/DocumentManagementDrawer';

const access = vi.hoisted(() => ({replace: true, outcomes: false, downloadable: false}));
const download = vi.hoisted(() => vi.fn());
vi.mock('@/features/documents/document-management', async (original) => ({
  ...await original<typeof import('@/features/documents/document-management')>(), downloadDocument: download
}));
vi.mock('@/features/documents/document-access', () => ({documentAccess: () => ({visible: true, replace: access.replace, review: true})}));
vi.mock('@/features/documents/created-documents', async (original) => {
  const documentsModule = await original<typeof import('@/features/documents/created-documents')>();
  const initial = documentsModule.readDocumentRecords().find((item) => item.id === 'construct-pro-registration-2024')!;
  const records = [4, 3, 2, 1].map((version) => ({...initial, id: `version-${version}`, version, versionGroupId: initial.id,
    filename: `certificate-v${version}.pdf`, expiresAt: '2026-12-12', notes: 'Retained underlying note', supersededById: version < 4 ? `version-${version + 1}` : undefined}));
  return {...documentsModule, documentFile: (_companyId: string, id: string) => access.downloadable && ['version-4', 'version-3', 'version-2'].includes(id) ? new Blob(['actual bytes']) : undefined,
    useDocumentRecords: () => access.outcomes ? records.map((item) => ({...item, reviewOutcome: item.version === 4 ? 'pending' : item.version === 2 ? 'rejected' : 'approved'})) : records};
});
vi.mock('@/i18n/navigation', () => ({useRouter: () => ({replace: vi.fn()}), Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props}/> }));

beforeEach(() => {access.replace = true; access.outcomes = false; access.downloadable = false; download.mockReset().mockReturnValue(true);});
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

  it.each([false, true])('keeps current Details and History Back in one mounted drawer without historical management navigation (EN=%s)', (english) => {
    const drawer = open(english);
    fireEvent.click(within(drawer).getByRole('button', {name: english ? 'View all' : 'Vezi toate'}));
    expect(screen.getByRole('dialog')).toBe(drawer);
    expect(drawer.querySelectorAll('[data-version]')).toHaveLength(4);
    expect(drawer.querySelectorAll('[data-version] button')).toHaveLength(1);
    expect(drawer.querySelectorAll('[data-version]:not([data-version-state="current"]) button')).toHaveLength(0);
    fireEvent.click(within(drawer.querySelector('[data-version="4"]') as HTMLElement).getByRole('button', {name: english ? 'Actions for version 4' : 'Acțiuni pentru versiunea 4'}));
    expect(within(drawer).getAllByRole('menuitem')).toHaveLength(1);
    fireEvent.click(within(drawer).getByRole('menuitem', {name: english ? 'Open details' : 'Deschide detalii'}));
    expect(within(drawer).getByText('certificate-v4.pdf')).toBeVisible();
    expect(within(drawer).getByRole('button', {name: english ? 'Replace document' : 'Înlocuiește document'})).toBeEnabled();
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
    expect(version(2).getByRole('button', {name: english ? 'Download' : 'Descarcă'})).toBeEnabled();
    expect(version(2).queryByText(/Valabilă:|Valid until:|Motiv:|Reason:/)).not.toBeInTheDocument();
    expect(version(1).queryByRole('button', {name: english ? 'Download' : 'Descarcă'})).not.toBeInTheDocument();
    expect(within(drawer).queryByText(/certificate-v\d.pdf|Retained underlying note/)).not.toBeInTheDocument();
    expect(within(drawer).queryByText(english ? en.DocumentManagement.downloadUnavailable : ro.DocumentManagement.downloadUnavailable)).not.toBeInTheDocument();
    expect(within(drawer).queryByRole('button', {name: english ? 'Open details' : 'Deschide detalii'})).not.toBeInTheDocument();
    for (const number of [3, 2, 1]) {
      expect(version(number).queryByRole('button', {name: /Actions for version|Acțiuni pentru versiunea/})).not.toBeInTheDocument();
      expect(version(number).queryByRole('link')).not.toBeInTheDocument();
      expect(version(number).queryAllByRole('button', {hidden: true}).every((button) => button.textContent === (english ? 'Download' : 'Descarcă'))).toBe(true);
    }
    fireEvent.click(version(3).getByRole('button', {name: english ? 'Download' : 'Descarcă'}));
    fireEvent.click(version(2).getByRole('button', {name: english ? 'Download' : 'Descarcă'}));
    expect(download.mock.calls).toEqual([['demo-company', 'version-3', 'construct-pro'], ['demo-company', 'version-2', 'construct-pro']]);
    const trigger = version(4).getByRole('button', {name: english ? 'Actions for version 4' : 'Acțiuni pentru versiunea 4'});
    fireEvent.keyDown(trigger, {key: 'ArrowDown'});
    const menu = within(drawer).getByRole('menu');
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(2);
    expect(within(menu).getByRole('menuitem', {name: english ? 'Download' : 'Descarcă'})).toBeEnabled();
    fireEvent.keyDown(menu, {key: 'Escape'});
    expect(within(drawer).queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(drawer).toHaveAttribute('data-phase', 'open');
  });

  it.each([false, true])('reports an unavailable/stale historical file safely and clears feedback on a successful retry (EN=%s)', (english) => {
    access.outcomes = true; access.downloadable = true;
    download.mockReturnValueOnce(false);
    const drawer = open(english, 'history');
    const button = within(drawer.querySelector('[data-version="2"]') as HTMLElement).getByRole('button', {name: english ? 'Download' : 'Descarcă'});
    fireEvent.click(button);
    expect(within(drawer).getByRole('alert')).toHaveTextContent(english ? en.DocumentManagement.downloadUnavailable : ro.DocumentManagement.downloadUnavailable);
    expect(drawer.querySelectorAll('[data-version]')).toHaveLength(4);
    expect(within(drawer.querySelector('[data-version="2"]') as HTMLElement).getAllByRole('button')).toEqual([button]);
    fireEvent.click(button);
    expect(within(drawer).queryByRole('alert')).not.toBeInTheDocument();
  });
});
