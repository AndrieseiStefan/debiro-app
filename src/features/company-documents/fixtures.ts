import {fixtureReferenceDate} from '@/lib/fixture-clock';
import {companySettingsFixture} from '@/features/company-settings/fixtures';
import type {CompanyDocumentRecord, CompanyDocumentRequirement, CompanyDocumentsState} from './types';

const companyId = companySettingsFixture.company.id;
function date(days: number) {return new Date(Date.parse(`${fixtureReferenceDate}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);}
const definitions = [
  {id: 'registration', name: {ro: 'Certificat constatator', en: 'Company registration certificate'}, documentType: 'registration', issuer: 'ONRC', expires: 160},
  {id: 'tax', name: {ro: 'Certificat fiscal ANAF', en: 'ANAF tax certificate'}, documentType: 'tax', issuer: 'ANAF', expires: 16},
  {id: 'insurance', name: {ro: 'Poliță asigurare profesională', en: 'Professional insurance policy'}, documentType: 'insurance', issuer: null, expires: 220},
  {id: 'iso', name: {ro: 'Certificare ISO 9001', en: 'ISO 9001 certification'}, documentType: 'iso', issuer: null, expires: 60},
  {id: 'criminal-record', name: {ro: 'Cazier fiscal', en: 'Tax clearance record'}, documentType: 'tax', issuer: 'ANAF', expires: null},
  {id: 'vat', name: {ro: 'Certificat TVA', en: 'VAT certificate'}, documentType: 'tax', issuer: 'ANAF', expires: -8}
] as const;
const requirements: CompanyDocumentRequirement[] = definitions.map((item) => ({id: `company-requirement:${item.id}`, companyId, name: item.name,
  documentType: item.documentType, issuer: item.issuer, required: true, expiryWarningDays: 30,
  currentDocumentId: item.expires === null ? null : `company-document:${item.id}`}));
const documents: CompanyDocumentRecord[] = definitions.flatMap((item, index) => item.expires === null ? [] : [{
  id: `company-document:${item.id}`, companyId, documentName: item.name, documentType: item.documentType, issuer: item.issuer,
  filename: `${item.id}.pdf`, uploadedAt: date(-60 - index), expiresAt: date(item.expires), reviewOutcome: item.id === 'iso' ? 'pending' : 'approved',
  updatedAt: `${date(-15 - index)}T12:00:00.000Z`, updatedByDisplayName: companySettingsFixture.members[index % 2].fullName
}]);
// A metadata-only historical version never contributes a row, status or KPI.
documents.push({...documents[0], id: 'company-document:registration-v1', expiresAt: date(-40), supersededById: documents[0].id, version: 1});

/** Explicit, isolated E1 demo metadata; no file bytes, sharing links or automatic template assignment. */
export const companyDocumentsFixture: CompanyDocumentsState = {byCompany: {[companyId]: {requirements, documents}}};
