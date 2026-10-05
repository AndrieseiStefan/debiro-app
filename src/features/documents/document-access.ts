import {getCurrentMembership, readCompanyState} from '@/features/companies/company-state';

/** E1 membership checks, not backend authorization or a new role system. */
export function documentAccess(companyId: string, snapshot = readCompanyState()) {
  const company = snapshot.activeCompanyId === companyId ? snapshot.companies.find((item) => item.company.id === companyId) : undefined;
  const member = company ? getCurrentMembership(company) : null;
  return {visible: Boolean(member), replace: member?.role === 'administrator', review: member?.role === 'administrator' || member?.role === 'reviewer', member};
}
