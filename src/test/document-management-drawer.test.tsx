import {fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {DocumentManagementDrawer} from '@/features/documents/DocumentManagementDrawer';

const access = vi.hoisted(() => ({replace: true}));
vi.mock('@/features/documents/document-access', () => ({documentAccess: () => ({visible: true, replace: access.replace, review: true})}));
vi.mock('@/features/documents/created-documents', async (original) => {
  const documentsModule = await original<typeof import('@/features/documents/created-documents')>();
  const initial = documentsModule.readDocumentRecords().find((item) => item.id === 'construct-pro-registration-2024')!;
  const records = [4, 3, 2, 1].map((version) => ({...initial, id: `version-${version}`, version, versionGroupId: initial.id,
    filename: `certificate-v${version}.pdf`, supersededById: version < 4 ? `version-${version + 1}` : undefined}));
  return {...documentsModule, useDocumentRecords: () => records};
});
vi.mock('@/i18n/navigation', () => ({useRouter: () => ({replace: vi.fn()}), Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props}/> }));

beforeEach(() => {access.replace = true;});
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
      ? ['Name', 'Requirement', 'Compliance status', 'Expiry date', 'Uploaded at', 'Uploaded by', 'Notes']
      : ['Nume', 'Cerință', 'Status conformitate', 'Dată expirare', 'Încărcat la', 'Încărcat de', 'Notițe']);
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
    fireEvent.click(within(drawer.querySelector('[data-version="1"]') as HTMLElement).getByRole('button', {name: english ? 'Open details' : 'Deschide detalii'}));
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
});
