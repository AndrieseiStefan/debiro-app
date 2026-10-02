import {vendorsListFixture} from './fixtures';
import type {VendorDetailsViewModel} from './types';
import {fixtureReferenceDate} from '@/lib/fixture-clock';

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
    invitationPreview: {demoUploadUrl: 'https://debiro.ro/upload/demo-construct-pro', demoUploadPath: '/upload/demo-construct-pro', referenceDate: fixtureReferenceDate},
    contact: {
      name: 'Ion Popescu', role: {ro: 'Director General', en: 'General Manager'},
      email: 'ion.popescu@scconstruct.ro', phone: '+40 722 345 678',
      address: {ro: 'Str. Constructorilor nr. 12\nBucurești, Sector 2', en: '12 Constructorilor Street\nBucharest, Sector 2'},
      website: 'www.constructpro.ro'
    },
    documents: [
      {id: 'tax', name: 'Certificat fiscal', issuer: 'ANAF', status: 'review', issued: null, expires: null},
      {id: 'fire', name: 'Autorizație ISU', issuer: 'Inspectoratul pentru Situații de Urgență', status: 'valid', issued: null, expires: null},
      {id: 'registration', name: 'Certificat de înregistrare', issuer: 'ONRC', status: 'valid', issued: null, expires: null},
      {id: 'insurance', name: 'Asigurare Răspundere Civilă', issuer: 'Asigurator ABC', status: 'valid', issued: null, expires: null},
      {id: 'iso', name: 'Certificat ISO 9001', issuer: 'SR EN ISO 9001:2015', status: 'missing', issued: null, expires: null}
    ]
  }
};

export function getVendorDetailsFixture(vendorId: string): VendorDetailsViewModel | undefined {
  if (Object.hasOwn(detailsById, vendorId)) return detailsById[vendorId];
  const vendor = vendorsListFixture.vendors.find((item) => item.id === vendorId);
  if (!vendor) return undefined;
  return {user: vendorsListFixture.user, organization: vendorsListFixture.organization, notificationCount: vendorsListFixture.notificationCount,
    vendor, contact: {name: vendor.contactName}, documents: []};
}
