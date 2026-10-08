import {fireEvent, render, screen} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {companyProfileDirty, companyProfileValues, normalizeCompanyProfile, validateCompanyProfile} from '@/features/company-settings/company-profile';
import {companySettingsFixture} from '@/features/company-settings/fixtures';
import {companyCountries, companyIndustries, companySizes} from '@/features/companies/company-options';
import {createCompany, currentUser, duplicateCompanyTaxId, getActiveCompany, initializeOnboardingCompany, readCompanyState, switchActiveCompany, updateCompanyProfile} from '@/features/companies/company-state';
import {CompanyProfilePage} from '@/features/company-settings/CompanyProfilePage';
import {SupplierUploadPortalPage} from '@/features/supplier-portal/SupplierUploadPortalPage';
import {getSupplierPortalFixture} from '@/features/supplier-portal/fixtures';

vi.mock('next/navigation', () => ({useRouter: () => ({push: vi.fn()})}));
vi.mock('@/i18n/navigation', () => ({Link: ({href, children}: {href: string; children: React.ReactNode}) => <a href={href}>{children}</a>}));
vi.mock('@/components/layout/AuthenticatedAppShell', () => ({AuthenticatedAppShell: ({children}: {children: React.ReactNode}) => <main>{children}</main>}));

function create() {
  const result = createCompany({name: 'Example SRL', taxId: `RO${crypto.randomUUID()}`, industry: 'construction', country: 'RO'});
  if (!result.ok) throw new Error(result.reason);
  return getActiveCompany(readCompanyState())!;
}
function page(locale: 'ro' | 'en' = 'ro') {return render(<NextIntlClientProvider locale={locale} messages={locale === 'ro' ? ro : en}><CompanyProfilePage locale={locale}/></NextIntlClientProvider>);}

describe('canonical company profile', () => {
  it('supports empty optional values, existing email/URL conventions and permissive phone values', () => {
    const values = companyProfileValues(create().company);
    expect(validateCompanyProfile(values)).toEqual({});
    expect(values.addressLine).toBe('');
    expect(values.contactPersonName).toBe('');
    expect(validateCompanyProfile({...values, contactPhone: 'extension 4', website: 'demo.ro', contactEmail: ' company@example.ro '})).toEqual({});
    expect(validateCompanyProfile({...values, name: ' ', taxId: ' ', contactEmail: 'invalid', website: 'javascript:alert(1)', industry: 'toString', country: 'XX', companySize: 'unknown'})).toEqual({name: 'nameRequired', taxId: 'taxIdRequired', contactEmail: 'invalidEmail', website: 'invalidUrl', industry: 'industryRequired', country: 'countryRequired', companySize: 'invalidOption'});
  });
  it('normalizes one whitelist of company-owned fields and excludes account/auth values', () => {
    const values = companyProfileValues(create().company);
    const normalized = normalizeCompanyProfile({...values, name: ' Company SRL ', taxId: ' ro123 ', contactEmail: ' contact@example.ro ', password: 'secret', administratorName: 'Personal identity'} as typeof values);
    expect(normalized).toMatchObject({name: 'Company SRL', taxId: 'RO123', contactEmail: 'contact@example.ro', companySize: undefined});
    expect(normalized).not.toHaveProperty('password');
    expect(normalized).not.toHaveProperty('administratorName');
    expect(companyProfileDirty({...values, name: ` ${values.name} `}, values)).toBe(false);
    expect(companyProfileDirty({...values, city: 'Iași'}, values)).toBe(true);
  });
  it('updates atomically, rejects duplicate/invalid values and preserves unrelated companies/members/subscriptions', () => {
    const active = create(), before = readCompanyState(), values = companyProfileValues(active.company);
    expect(duplicateCompanyTaxId(values.taxId, active.company.id)).toBe(false);
    expect(updateCompanyProfile(active.company.id, {...values, taxId: ' ro87654321 '})).toMatchObject({ok: false, reason: 'validation', errors: {taxId: 'duplicate'}});
    expect(updateCompanyProfile(active.company.id, {...values, contactEmail: 'invalid'}).ok).toBe(false);
    expect(readCompanyState()).toBe(before);
    expect(updateCompanyProfile(active.company.id, {...values, name: ' Updated SRL ', website: 'example.ro', companySize: '11-50'})).toEqual({ok: true});
    const after = readCompanyState();
    expect(getActiveCompany(after)?.company).toMatchObject({name: 'Updated SRL', website: 'example.ro', companySize: '11-50'});
    expect(getActiveCompany(after)?.members).toBe(active.members);
    expect(getActiveCompany(after)?.company.subscription).toBe(active.company.subscription);
    for (const record of before.companies.filter((item) => item.company.id !== active.company.id)) expect(after.companies.find((item) => item.company.id === record.company.id)).toBe(record);
  });
  it('rejects non-active and non-administrator mutations for both read-only roles', () => {
    const admin = create();
    switchActiveCompany('global-clean-services');
    const active = getActiveCompany(readCompanyState())!;
    expect(updateCompanyProfile(admin.company.id, companyProfileValues(admin.company))).toEqual({ok: false, reason: 'accessDenied'});
    for (const role of ['reviewer', 'viewer'] as const) {
      active.members[0].role = role;
      expect(updateCompanyProfile(active.company.id, {...companyProfileValues(active.company), name: 'Not allowed'})).toEqual({ok: false, reason: 'accessDenied'});
    }
    active.members[0].role = 'reviewer';
    expect(active.company.name).toBe('Global Clean Services');
  });
  it('binds every company-owned onboarding value using shared IDs without fabricated contact/address/user data', () => {
    const userBefore = {...currentUser};
    const result = initializeOnboardingCompany({name: ' Signup Company ', taxId: `ro${crypto.randomUUID()}`, industry: 'cleaning', companySize: '11-50', country: 'DE'});
    expect(result.ok).toBe(true);
    const active = getActiveCompany(readCompanyState())!;
    expect(active.company).toMatchObject({name: 'Signup Company', industry: 'cleaning', companySize: '11-50', country: 'DE'});
    expect(active.company.taxId).toBe(active.company.taxId.toUpperCase());
    expect(companyProfileValues(active.company)).toMatchObject({contactEmail: '', contactPersonName: '', addressLine: '', city: '', postalCode: ''});
    expect(currentUser).toEqual(userBefore);
    expect(active.company).not.toHaveProperty('password');
    expect(initializeOnboardingCompany({name: 'Duplicate', taxId: active.company.taxId, industry: 'cleaning', companySize: '11-50', country: 'RO'})).toEqual({ok: false, reason: 'duplicate'});
    expect(initializeOnboardingCompany({name: 'Invalid', taxId: 'ROOTHER', industry: 'cleaning', country: 'RO'})).toEqual({ok: false, reason: 'required'});
  });
  it('initializes the already-owned Demo onboarding sample without a duplicate company', () => {
    const before = readCompanyState();
    const result = initializeOnboardingCompany({name: companySettingsFixture.company.name, taxId: companySettingsFixture.company.taxId, industry: 'professional', companySize: '11-50', country: 'RO'});
    expect(result).toEqual({ok: true, id: companySettingsFixture.company.id});
    expect(readCompanyState().companies.length).toBe(before.companies.length);
  });
  it('renders the three canonical sections, shared options and an atomic Save/Cancel form', () => {
    const active = create(); page();
    for (const name of ['Informații companie', 'Date de contact', 'Adresă companie']) expect(screen.getByRole('region', {name})).toBeVisible();
    expect(screen.getByRole('button', {name: 'Salvează modificările'})).toBeDisabled();
    expect(screen.getByRole('combobox', {name: /Industrie/}).querySelectorAll('option')).toHaveLength(Object.keys(companyIndustries).length + 1);
    expect(screen.getByRole('combobox', {name: /Țară/}).querySelectorAll('option')).toHaveLength(Object.keys(companyCountries).length + 1);
    expect(screen.getByRole('combobox', {name: /Dimensiunea companiei/}).querySelectorAll('option')).toHaveLength(Object.keys(companySizes).length + 1);
    fireEvent.change(screen.getByLabelText(/Denumire companie/), {target: {value: 'Draft'}});
    expect(getActiveCompany(readCompanyState())?.company.name).toBe(active.company.name);
    expect(screen.getByRole('button', {name: 'Salvează modificările'})).toBeEnabled();
    fireEvent.click(screen.getByRole('button', {name: 'Anulează'}));
    expect(screen.getByLabelText(/Denumire companie/)).toHaveValue(active.company.name);
    fireEvent.change(screen.getByLabelText(/Denumire companie/), {target: {value: 'Saved'}});
    fireEvent.click(screen.getByRole('button', {name: 'Salvează modificările'}));
    expect(getActiveCompany(readCompanyState())?.company.name).toBe('Saved');
    expect(screen.getByText('Modificările au fost salvate.')).toBeVisible();
    expect(screen.getByRole('button', {name: 'Salvează modificările'})).toBeDisabled();
  });
  it.each(['reviewer', 'viewer'] as const)('renders deterministic read-only Company Profile for %s', (role) => {
    switchActiveCompany('global-clean-services');
    const active = getActiveCompany(readCompanyState())!;
    active.members[0].role = role;
    try {
      page('en');
      expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Company profile');
      expect(screen.getByText(/You have read-only access/)).toBeVisible();
      for (const element of [...screen.getAllByRole('textbox'), ...screen.getAllByRole('combobox')]) expect(element).toBeDisabled();
      expect(screen.queryByRole('button', {name: 'Save changes'})).not.toBeInTheDocument();
    } finally {active.members[0].role = 'reviewer';}
  });
  it('shows safe workspace recovery when the active company has no current active membership', () => {
    const active = create();
    active.members[0].status = 'invited';
    try {
      expect(updateCompanyProfile(active.company.id, companyProfileValues(active.company))).toEqual({ok: false, reason: 'accessDenied'});
      page();
      expect(screen.queryByLabelText(/Denumire companie/)).not.toBeInTheDocument();
      expect(screen.getByText(ro.AppShell.workspaceEmptyTitle)).toBeVisible();
    } finally {active.members[0].status = 'active';}
  });
  it('resolves the supplier requester by token ownership, never the active authenticated company', () => {
    switchActiveCompany('demo-company');
    const demo = getActiveCompany(readCompanyState())!;
    expect(updateCompanyProfile(demo.company.id, {...companyProfileValues(demo.company), name: 'Token Company SRL'})).toEqual({ok: true});
    switchActiveCompany('global-clean-services');
    render(<NextIntlClientProvider locale="ro" messages={ro}><SupplierUploadPortalPage locale="ro" view={getSupplierPortalFixture('demo-construct-pro')!}/></NextIntlClientProvider>);
    expect(screen.getByRole('region', {name: 'Detaliile solicitării'})).toHaveTextContent('Token Company SRL');
    expect(screen.getByRole('region', {name: 'Detaliile solicitării'})).not.toHaveTextContent('Global Clean Services');
  });
});
