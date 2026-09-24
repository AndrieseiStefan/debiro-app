import type {SupplierPortalViewModel} from './types';

const demoPortal: SupplierPortalViewModel = {
  token: 'demo-construct-pro',
  requester: {name: 'Global Clean Services', tagline: {ro: 'Un mediu mai curat, împreună.', en: 'A cleaner environment, together.'}},
  supplier: {name: 'Construct Pro SRL', registrationNumber: 'RO12345678'},
  documents: [
    {id: 'registration', title: {ro: 'Certificat de înregistrare', en: 'Registration certificate'}, description: {ro: 'Certificatul de înregistrare al companiei (ONRC)', en: 'Company registration certificate (ONRC)'}, status: 'uploaded', uploadedFile: 'Certificat_inregistrare_ConstructPro.pdf', uploadedAt: {ro: '12 mar. 2024, 10:24', en: '12 Mar 2024, 10:24'}},
    {id: 'tax', title: {ro: 'Certificat fiscal', en: 'Tax certificate'}, description: {ro: 'Certificat fiscal valabil, emis de ANAF', en: 'Valid tax certificate issued by ANAF'}, status: 'pending'},
    {id: 'fire', title: {ro: 'Autorizație ISU', en: 'Fire safety authorization'}, description: {ro: 'Autorizație de securitate la incendiu (valabilă)', en: 'Valid fire safety authorization'}, status: 'uploaded', uploadedFile: 'Autorizatie_ISU_ConstructPro.pdf', uploadedAt: {ro: '11 mar. 2024, 16:03', en: '11 Mar 2024, 16:03'}},
    {id: 'insurance', title: {ro: 'Asigurare Răspundere Civilă', en: 'Liability insurance'}, description: {ro: 'Poliță de asigurare valabilă', en: 'Valid insurance policy'}, status: 'missing'}
  ],
  help: {email: 'achizitii@globalclean.ro', phone: '+40 21 555 0185'},
  footerYear: 2024
};

const portalsByToken: Record<string, SupplierPortalViewModel> = {[demoPortal.token]: demoPortal};

export function getSupplierPortalFixture(token: string): SupplierPortalViewModel | undefined {
  return Object.hasOwn(portalsByToken, token) ? portalsByToken[token] : undefined;
}
