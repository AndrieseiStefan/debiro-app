import type {SupplierPortalViewModel} from './types';
import {fixtureReferenceDate} from '@/lib/fixture-clock';

const demoPortal: SupplierPortalViewModel = {
  token: 'demo-construct-pro',
  companyId: 'demo-company',
  vendorId: 'construct-pro',
  requester: {name: 'Global Clean Services', tagline: {ro: 'Un mediu mai curat, împreună.', en: 'A cleaner environment, together.'}},
  supplier: {name: 'Construct Pro SRL', registrationNumber: 'RO12345678'},
  help: {email: 'achizitii@globalclean.ro', phone: '+40 21 555 0185'},
  footerYear: Number(fixtureReferenceDate.slice(0, 4))
};

const portalsByToken: Record<string, SupplierPortalViewModel> = {[demoPortal.token]: demoPortal};

export function getSupplierPortalFixture(token: string): SupplierPortalViewModel | undefined {
  return Object.hasOwn(portalsByToken, token) ? portalsByToken[token] : undefined;
}
