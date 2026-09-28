import type {LocalizedText, RequirementRuleView} from './types';

export type CatalogDocumentType = {
  id: string;
  canonicalName: LocalizedText;
  description: LocalizedText;
  aliases: string[];
  tone: RequirementRuleView['tone'];
  status: 'active';
};

export const catalogDocuments: CatalogDocumentType[] = [
  {id: 'registration', canonicalName: {ro: 'Certificat de înregistrare', en: 'Registration certificate'}, description: {ro: 'Certificat ONRC', en: 'Trade Register certificate'}, aliases: ['certificat registrul comerțului', 'company registration'], tone: 'blue', status: 'active'},
  {id: 'tax', canonicalName: {ro: 'Certificat fiscal', en: 'Tax certificate'}, description: {ro: 'Certificat ANAF privind obligațiile fiscale', en: 'ANAF tax obligations certificate'}, aliases: ['anaf', 'fiscal clearance'], tone: 'red', status: 'active'},
  {id: 'liability', canonicalName: {ro: 'Asigurare Răspundere Civilă', en: 'Liability insurance'}, description: {ro: 'Poliță RCA profesională', en: 'Professional liability policy'}, aliases: ['asigurare rc', 'insurance'], tone: 'green', status: 'active'},
  {id: 'fire', canonicalName: {ro: 'Autorizație ISU', en: 'Fire safety permit'}, description: {ro: 'Autorizație pentru securitate la incendiu', en: 'Fire safety authorization'}, aliases: ['isu', 'fire permit'], tone: 'red', status: 'active'},
  {id: 'iso', canonicalName: {ro: 'Certificare ISO 9001', en: 'ISO 9001 certification'}, description: {ro: 'Sistem de management al calității', en: 'Quality management system'}, aliases: ['iso', 'quality certification'], tone: 'amber', status: 'active'},
  {id: 'permit', canonicalName: {ro: 'Autorizație de lucru', en: 'Work permit'}, description: {ro: 'Autorizație ISC / avize specifice', en: 'ISC permit / specific approvals'}, aliases: ['aviz de lucru', 'isc'], tone: 'red', status: 'active'},
  {id: 'safety', canonicalName: {ro: 'Declarație SSM', en: 'Occupational safety declaration'}, description: {ro: 'Declarație privind securitatea muncii', en: 'Workplace safety declaration'}, aliases: ['ssm', 'workplace safety'], tone: 'purple', status: 'active'}
];

export function normalizeDocumentName(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

export function searchCatalog(query: string) {
  const normalized = normalizeDocumentName(query);
  if (!normalized) return catalogDocuments;
  return catalogDocuments.filter((document) => [document.canonicalName.ro, document.canonicalName.en, document.description.ro, document.description.en, ...document.aliases].some((value) => normalizeDocumentName(value).includes(normalized)));
}

export function catalogDocument(id: string) {
  return catalogDocuments.find((item) => item.id === id) ?? null;
}
