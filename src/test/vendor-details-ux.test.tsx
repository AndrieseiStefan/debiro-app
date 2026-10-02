import {createRef} from 'react';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import en from '../../messages/en.json';
import ro from '../../messages/ro.json';
import {VendorDocumentsPanel} from '@/features/vendors/VendorDocumentsPanel';
import {VendorNotesPanel, type NotesNavigation} from '@/features/vendors/VendorNotesPanel';
import {getVendorDetailsFixture} from '@/features/vendors/detail-fixtures';
import {createLocalVendor, getVendorNoteThreads, getVendorState, saveVendorNote, toVendorDetailsView} from '@/features/vendors/created-vendors';
import {vendorsListFixture} from '@/features/vendors/fixtures';
import {applyVendorTemplates, getVendorRequirements, readVendorRequirements, removeVendorRequirement} from '@/features/vendors/vendor-requirements';

vi.mock('next/navigation', () => ({useRouter: () => ({push: vi.fn()})}));
vi.mock('@/i18n/navigation', () => ({Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props}/>}));
const companyId = 'demo-company';

describe('Vendor Details UX cleanup', () => {
  for (const language of ['ro', 'en'] as const) {
    const messages = language === 'ro' ? ro : en;
    it(`${language}: displays the missing count from requirements, independent of query and template associations`, () => {
      const fixture = getVendorDetailsFixture('construct-pro')!;
      const rendered = render(<NextIntlClientProvider locale={language} messages={messages}><VendorDocumentsPanel view={fixture} companyId={companyId} language={language} query="no-match" setQuery={vi.fn()} onUpload={vi.fn()}/></NextIntlClientProvider>);
      const notice = rendered.container.querySelector('[data-missing-requirements]')!;
      expect(notice).toHaveTextContent(language === 'ro' ? '1 document lipsește' : '1 document is missing');
      expect(notice.querySelector('button, a')).toBeNull();
      rendered.unmount();
      const vendor = createLocalVendor({name: `UX ${language}`, cui: `RO-UX-${language}`, category: 'construction', email: 'ux@example.test'});
      const view = toVendorDetailsView(vendor, vendorsListFixture);
      const local = render(<NextIntlClientProvider locale={language} messages={messages}><VendorDocumentsPanel view={view} companyId={companyId} language={language} query="no-match" setQuery={vi.fn()} onUpload={vi.fn()}/></NextIntlClientProvider>);
      expect(local.container.querySelector('[data-missing-requirements]')).toBeNull();
      act(() => {applyVendorTemplates(companyId, vendor.id, ['maintenance']);});
      expect(local.container.querySelector('[data-missing-requirements]')).toHaveTextContent(language === 'ro' ? '5 documente lipsesc' : '5 documents are missing');
      for (const requirement of getVendorRequirements(readVendorRequirements(), companyId, vendor.id).requirements) act(() => {removeVendorRequirement(companyId, vendor.id, requirement.id);});
      expect(local.container.querySelector('[data-missing-requirements]')).toBeNull();
    });
    it(`${language}: has one creation control and preserves title/content save and discard semantics`, async () => {
      const vendor = createLocalVendor({name: `Notes UX ${language}`, cui: `RO-NOTES-UX-${language}`, category: 'construction', email: 'notes-ux@example.test'});
      const navigationRef = createRef<NotesNavigation>();
      render(<NextIntlClientProvider locale={language} messages={messages}><VendorNotesPanel companyId={companyId} vendorId={vendor.id} language={language} navigationRef={navigationRef}/></NextIntlClientProvider>);
      const panel = screen.getByRole('tabpanel');
      expect(within(panel).getAllByRole('button')).toHaveLength(1);
      fireEvent.click(within(panel).getByRole('button'));
      const title = screen.getByRole('textbox', {name: language === 'ro' ? 'Titlul thread-ului' : 'Thread title'}) as HTMLInputElement;
      expect(title).toHaveFocus(); expect(title.selectionStart).toBe(0); expect(title.selectionEnd).toBe(title.value.length);
      const content = screen.getByRole('textbox', {name: language === 'ro' ? 'Conținutul notiței' : 'Note content'});
      const save = screen.getByRole('button', {name: language === 'ro' ? 'Salvează modificările' : 'Save changes'});
      fireEvent.change(title, {target: {value: '   '}}); expect(save).toBeDisabled();
      expect(title).toHaveAccessibleDescription(language === 'ro' ? 'Introdu un titlu pentru thread.' : 'Enter a thread title.');
      fireEvent.change(title, {target: {value: '  Saved title  '}}); fireEvent.change(content, {target: {value: 'Saved content'}}); fireEvent.click(save);
      expect(title).toHaveValue('Saved title'); expect(save).toBeDisabled();
      fireEvent.change(title, {target: {value: 'Renamed'}}); expect(save).toBeEnabled(); fireEvent.click(save);
      expect(getVendorNoteThreads(getVendorState(), companyId, vendor.id)[0]).toMatchObject({title: 'Renamed', content: 'Saved content'});
      expect(within(panel).getByRole('button', {name: /^Renamed/})).toBeVisible(); expect(save).toBeDisabled();
      fireEvent.change(title, {target: {value: 'Discard title'}}); fireEvent.change(content, {target: {value: 'Discard content'}});
      fireEvent.click(within(panel).getByRole('button', {name: language === 'ro' ? 'Creează un thread' : 'Create a thread'}));
      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: language === 'ro' ? 'Continuă editarea' : 'Continue editing'}));
      expect(title).toHaveValue('Discard title'); expect(content).toHaveValue('Discard content');
      const leave = vi.fn();
      act(() => navigationRef.current!.requestLeave(leave));
      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: language === 'ro' ? 'Renunță la modificări' : 'Discard changes'}));
      await waitFor(() => expect(leave).toHaveBeenCalledOnce());
      expect(title).toHaveValue('Renamed'); expect(content).toHaveValue('Saved content'); expect(save).toBeDisabled();
      // A failed blank-title save must never mutate the committed thread.
      expect(saveVendorNote(companyId, vendor.id, {title: ' ', content: 'Invalid'}, getVendorNoteThreads(getVendorState(), companyId, vendor.id)[0].id)).toBeNull();
      expect(getVendorNoteThreads(getVendorState(), companyId, vendor.id)[0]).toMatchObject({title: 'Renamed', content: 'Saved content'});
    });
  }
});
