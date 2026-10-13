import {act, fireEvent, render, screen} from '@testing-library/react';
import {useState} from 'react';
import {createPortal} from 'react-dom';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {CompanyWorkspaceNavigation} from '@/features/companies/CompanyWorkspaceNavigation';
import {createCompany, currentUser, readCompanyState, switchActiveCompany, useCompanyState} from '@/features/companies/company-state';

const navigation = vi.hoisted(() => ({pathname: '/requirements', push: vi.fn()}));
const router = {push: navigation.push};
vi.mock('@/i18n/navigation', () => ({usePathname: () => navigation.pathname, useRouter: () => router}));

function Page() {
  const companyId = useCompanyState().activeCompanyId;
  const [open, setOpen] = useState(false);
  return <main><span data-owner={companyId}>{companyId}</span><button onClick={() => setOpen(true)}>Open drawer</button>{open && createPortal(<aside role="dialog">Old company drawer</aside>, document.body)}</main>;
}
function view() {return <CompanyWorkspaceNavigation><Page/></CompanyWorkspaceNavigation>;}

beforeEach(() => {switchActiveCompany('demo-company'); navigation.pathname = '/requirements'; navigation.push.mockReset();});

describe('shared company workspace entry', () => {
  it('activates before navigation and unmounts the old page and portaled UI before entering Dashboard', () => {
    const companiesBefore = readCompanyState().companies;
    navigation.push.mockImplementation(() => expect(readCompanyState().activeCompanyId).toBe('global-clean-services'));
    const page = render(view()); fireEvent.click(screen.getByText('Open drawer'));
    act(() => {expect(switchActiveCompany('global-clean-services')).toBe(true);});
    expect(navigation.push).toHaveBeenCalledWith('/dashboard'); expect(screen.queryByRole('dialog')).toBeNull(); expect(screen.queryByRole('main')).toBeNull();
    navigation.pathname = '/dashboard'; page.rerender(view());
    expect(document.querySelector('[data-owner]')).toHaveAttribute('data-owner', 'global-clean-services');
    expect(readCompanyState().companies).toBe(companiesBefore); expect(currentUser.fullName).toBe('Andrei Popescu');
  });
  it('resets Dashboard-local overlays even when the current route is already Dashboard', () => {
    navigation.pathname = '/dashboard'; render(view()); fireEvent.click(screen.getByText('Open drawer'));
    act(() => {switchActiveCompany('global-clean-services');});
    expect(screen.queryByRole('dialog')).toBeNull(); expect(document.querySelector('[data-owner]')).toHaveAttribute('data-owner', 'global-clean-services');
  });
  it('keeps the page for same-company, invalid and inaccessible selections', () => {
    render(view()); fireEvent.click(screen.getByText('Open drawer'));
    act(() => {expect(switchActiveCompany('demo-company')).toBe(true); expect(switchActiveCompany('missing')).toBe(false);});
    const member = readCompanyState().companies.find((record) => record.company.id === 'global-clean-services')!.members[0];
    member.status = 'invited';
    try {act(() => {expect(switchActiveCompany('global-clean-services')).toBe(false);});} finally {member.status = 'active';}
    expect(navigation.push).not.toHaveBeenCalled(); expect(screen.getByRole('dialog')).toBeVisible(); expect(readCompanyState().activeCompanyId).toBe('demo-company');
  });
  it('does not treat existing state, locale reinitialization or public onboarding activation as a switch', () => {
    switchActiveCompany('global-clean-services'); const page = render(view()); expect(navigation.push).not.toHaveBeenCalled();
    navigation.pathname = '/en/requirements'; page.rerender(view()); expect(navigation.push).not.toHaveBeenCalled();
    navigation.pathname = '/onboarding'; page.rerender(view());
    act(() => {switchActiveCompany('demo-company');}); expect(navigation.push).not.toHaveBeenCalled(); expect(screen.getByRole('main')).toBeVisible();
  });
  it('uses the same entry contract after successful My Companies creation', () => {
    navigation.pathname = '/profile/companies'; render(view());
    act(() => {expect(createCompany({name: 'Entry Company', taxId: 'RO-ENTRY-COMPANY', country: 'RO', industry: 'professional'}).ok).toBe(true);});
    expect(navigation.push).toHaveBeenCalledWith('/dashboard'); expect(readCompanyState().activeCompanyId).toMatch(/^local-company-/);
  });
});
