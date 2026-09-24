import {vendorsListFixture} from './fixtures';
import type {VendorDetailsViewModel} from './types';

const canonicalVendor = vendorsListFixture.vendors.find((vendor) => vendor.id === 'construct-pro');
if (!canonicalVendor) throw new Error('Canonical vendor fixture is missing');

const detailsById: Record<string, VendorDetailsViewModel> = {
  [canonicalVendor.id]: {
    user: vendorsListFixture.user,
    organization: vendorsListFixture.organization,
    notificationCount: vendorsListFixture.notificationCount,
    vendor: canonicalVendor,
    registrationCode: 'J40/1234/2018',
    categoryDetail: {ro: 'Construcții și infrastructură', en: 'Construction and infrastructure'},
    validDocumentCount: 4,
    contact: {
      name: 'Ion Popescu', role: {ro: 'Director General', en: 'General Manager'},
      email: 'ion.popescu@scconstruct.ro', phone: '+40 722 345 678',
      address: {ro: 'Str. Constructorilor nr. 12\nBucurești, Sector 2', en: '12 Constructorilor Street\nBucharest, Sector 2'},
      website: 'www.constructpro.ro'
    },
    documents: [
      {id: 'tax', name: 'Certificat fiscal', issuer: 'ANAF', status: 'valid', issued: {ro: '12 ian. 2024', en: 'Jan 12, 2024'}, expires: {ro: '12 ian. 2025', en: 'Jan 12, 2025'}, countdown: {ro: 'În 132 zile', en: 'In 132 days'}, uploadedBy: 'Andrei Popescu', uploadedOn: {ro: '12 ian. 2024', en: 'Jan 12, 2024'}},
      {id: 'fire', name: 'Autorizație ISU', issuer: 'Inspectoratul pentru Situații de Urgență', status: 'expiring', issued: {ro: '28 apr. 2023', en: 'Apr 28, 2023'}, expires: {ro: '28 apr. 2025', en: 'Apr 28, 2025'}, countdown: {ro: 'În 25 zile', en: 'In 25 days'}, uploadedBy: 'Maria Ionescu', uploadedOn: {ro: '10 mar. 2024', en: 'Mar 10, 2024'}},
      {id: 'registration', name: 'Certificat de înregistrare', issuer: 'ONRC', status: 'expired', issued: {ro: '03 mai 2021', en: 'May 3, 2021'}, expires: {ro: '03 mai 2024', en: 'May 3, 2024'}, countdown: {ro: 'Acum 287 zile', en: '287 days ago'}, uploadedBy: 'Andrei Popescu', uploadedOn: {ro: '15 apr. 2021', en: 'Apr 15, 2021'}},
      {id: 'insurance', name: 'Asigurare Răspundere Civilă', issuer: 'Asigurator ABC', status: 'valid', issued: {ro: '10 feb. 2024', en: 'Feb 10, 2024'}, expires: {ro: '10 feb. 2025', en: 'Feb 10, 2025'}, countdown: {ro: 'În 161 zile', en: 'In 161 days'}, uploadedBy: 'Elena Marin', uploadedOn: {ro: '10 feb. 2024', en: 'Feb 10, 2024'}},
      {id: 'iso', name: 'Certificat ISO 9001', issuer: 'SR EN ISO 9001:2015', status: 'missing', issued: null, expires: null}
    ]
  }
};

export function getVendorDetailsFixture(vendorId: string): VendorDetailsViewModel | undefined {
  return Object.hasOwn(detailsById, vendorId) ? detailsById[vendorId] : undefined;
}
