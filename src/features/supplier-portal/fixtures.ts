import type {SupplierPortalViewModel} from './types';

const demoPortal: SupplierPortalViewModel = {
  token: 'demo-construct-pro',
  requester: {name: 'Global Clean Services', tagline: {ro: 'Un mediu mai curat, împreună.', en: 'A cleaner environment, together.'}},
  supplier: {name: 'Construct Pro SRL', registrationNumber: 'RO12345678'},
  documents: [
    {id: 'registration', catalogDocumentTypeId: 'registration', required: true, status: 'uploaded', uploadedFile: 'Certificat_inregistrare_ConstructPro.pdf', uploadedAt: {ro: '12 mar. 2024, 10:24', en: '12 Mar 2024, 10:24'}},
    {id: 'tax', catalogDocumentTypeId: 'tax', required: true, status: 'pending', uploadedFile: 'certificat_fiscal.pdf', uploadedAt: {ro: '11 mar. 2024, 16:03', en: '11 Mar 2024, 16:03'}},
    {id: 'fire', catalogDocumentTypeId: 'fire', required: false, status: 'uploaded', uploadedFile: 'Autorizatie_ISU_ConstructPro.pdf', uploadedAt: {ro: '11 mar. 2024, 16:03', en: '11 Mar 2024, 16:03'}},
    {id: 'insurance', catalogDocumentTypeId: 'liability', required: true, status: 'missing'}
  ],
  help: {email: 'achizitii@globalclean.ro', phone: '+40 21 555 0185'},
  footerYear: 2024
};

const portalsByToken: Record<string, SupplierPortalViewModel> = {[demoPortal.token]: demoPortal};

export function getSupplierPortalFixture(token: string): SupplierPortalViewModel | undefined {
  return Object.hasOwn(portalsByToken, token) ? portalsByToken[token] : undefined;
}
