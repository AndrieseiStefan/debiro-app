'use client';

import {useSyncExternalStore} from 'react';
import {getDocumentReviewFixture} from '@/features/document-review/fixtures';
import type {DocumentComplianceStatus, DocumentReviewOutcome, DocumentSummary, DocumentType} from './types';
import type {ReviewValues} from '@/features/document-review/types';
import {documentsFixture} from './fixtures';
import {getVendorDetailsFixture} from '@/features/vendors/detail-fixtures';
import {catalogDocument} from '@/features/requirements/catalog';
import type {VendorDocumentRow} from '@/features/vendors/types';
import type {DocumentTypeSnapshot} from '@/features/requirements/document-types';
import {recordLocalAuditEvent} from '@/features/notifications/local-audit';
import {notificationsFixture} from '@/features/notifications/fixtures';
import {expiryCountdown, localizedDate} from '@/lib/fixture-clock';
import {documentAccess} from './document-access';
export {approvedCompliance} from './compliance';

export type CreatedDocument = DocumentSummary & {
  companyId?: string;
  typeSnapshot?: DocumentTypeSnapshot;
  fileType: string;
  fileSize: number;
  documentNumber?: string;
  issuedAt?: string;
  issuer?: string;
  extractionRequested: boolean;
  extractionState: 'none' | 'simulated';
  createdAt: string;
  uploadedBy: string;
  vendorRegistrationNumber: string;
  vendorRegistrationCode: string;
  reviewOutcome: DocumentReviewOutcome;
  complianceStatus: DocumentComplianceStatus;
  vendorRequirementId?: string;
  extractedMetadata?: ReviewValues;
  confirmedMetadata?: ReviewValues;
  reviewedAt?: string;
  reviewedBy?: string;
  origin: 'fixture' | 'local';
  globalVisible: boolean;
  versionGroupId?: string;
  version?: number;
  previousDocumentId?: string;
  supersededById?: string;
  updateSource?: 'internal';
  notes?: string;
};

export type NewDocument = Omit<CreatedDocument, 'id' | 'status' | 'reviewRoute' | 'extractionState' | 'reviewOutcome' | 'complianceStatus' | 'vendorRequirementId' | 'extractedMetadata' | 'confirmedMetadata' | 'reviewedAt' | 'reviewedBy' | 'origin' | 'globalVisible' | 'versionGroupId' | 'version' | 'previousDocumentId' | 'supersededById' | 'updateSource'> & {reviewRequired: boolean; file?: File};
function seededDocument(summary: DocumentSummary): CreatedDocument {
  const view = getVendorDetailsFixture(summary.vendorId);
  const extraction = getDocumentReviewFixture(summary.id)?.extraction.values;
  const catalogId = summary.documentType === 'insurance' ? 'liability' : summary.documentType;
  const type = catalogDocument(catalogId);
  const uploadEvent = notificationsFixture.auditEvents.find((event) => event.eventType === 'document_upload' && event.documentId === summary.id);
  return {...summary, reviewRoute: summary.status === 'review' ? `/documents/${summary.id}/review` : null, companyId: 'demo-company', reviewOutcome: summary.status === 'review' ? 'pending' : 'approved',
    complianceStatus: summary.status === 'review' ? 'needs_review' : summary.status === 'expiring' ? 'expiring_soon' : summary.status,
    origin: 'fixture', globalVisible: true, fileType: 'application/pdf', fileSize: 0, uploadedBy: uploadEvent?.actorName ?? view?.user.fullName ?? '',
    vendorRegistrationNumber: view?.vendor.registrationNumber ?? '', vendorRegistrationCode: view?.registrationCode ?? '',
    documentNumber: extraction?.documentNumber, issuedAt: extraction ? reviewDateToIso(extraction.issuedAt) ?? undefined : undefined,
    issuer: extraction?.issuer, extractedMetadata: extraction ? {...extraction} : undefined, extractionRequested: Boolean(extraction), extractionState: extraction ? 'simulated' : 'none',
    createdAt: uploadEvent?.occurredAt ?? `${summary.uploadedAt}T12:00:00.000Z`,
    typeSnapshot: type ? {documentTypeSource: 'catalog', catalogDocumentTypeId: type.id, name: type.canonicalName, description: type.description, iconKey: type.iconKey, iconColorKey: type.iconColorKey} : undefined,
    vendorRequirementId: summary.vendorId === 'construct-pro' ? `vendor-requirement:construct-pro:${catalogId}` : undefined};
}
// Fixture documents become initial domain records, not disconnected outcome overrides.
const initialDocuments: CreatedDocument[] = documentsFixture.documents.flatMap((summary) => {
  const current = seededDocument(summary);
  if (current.id !== 'construct-pro-fire-2024') return [current];
  // Retain the current route/requirement identity; the older fixture is history only.
  const historicalId = `${current.id}-v1`;
  return [
    {...current, version: 2, versionGroupId: historicalId, previousDocumentId: historicalId},
    {...current, id: historicalId, version: 1, versionGroupId: historicalId, supersededById: current.id,
      uploadedAt: '2026-02-15', createdAt: '2026-02-15T12:00:00.000Z', expiresAt: '2026-09-15', status: 'expired', complianceStatus: 'expired'}
  ];
});
initialDocuments.push({...seededDocument({id: 'vendor-document:construct-pro:insurance', vendorId: 'construct-pro', vendorName: 'Construct Pro SRL',
  documentName: {ro: 'Asigurare Răspundere Civilă', en: 'Liability insurance'}, filename: 'Asigurare_ConstructPro.pdf', documentType: 'insurance', status: 'valid', uploadedAt: '2026-09-20', expiresAt: '2027-02-10', reviewRoute: null}), globalVisible: false});
let documents: CreatedDocument[] = initialDocuments;
// Actual selected bytes only, private to this tab. Fixture files have no invented download.
const files = new Map<string, Blob>();
const listeners = new Set<() => void>();
const emptyDeletedIds: string[] = [];
let deletedIds = emptyDeletedIds;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCreatedDocuments() {
  return useDocumentRecords().filter((document) => document.origin === 'local');
}
export function useDocumentRecords() {return useSyncExternalStore(subscribe, () => documents, () => initialDocuments);}
export function readDocumentRecords() {return documents;}
export function readCreatedDocuments() {return documents.filter((document) => document.origin === 'local');}
export function activeDocuments(records: CreatedDocument[], companyId: string, globalOnly = false) {
  return records.filter((document) => (document.companyId ?? 'demo-company') === companyId && !document.supersededById && document.reviewOutcome !== 'rejected' && (!globalOnly || document.globalVisible));
}
export function useDeletedDocumentIds() {return useSyncExternalStore(subscribe, () => deletedIds, () => emptyDeletedIds);}
export function deleteLocalDocument(companyId: string, id: string) {
  const found = documents.find((document) => document.id === id);
  if (found && (found.companyId ?? 'demo-company') !== companyId) return false;
  if (!found && companyId !== 'demo-company') return false;
  documents = documents.filter((document) => document.id !== id);
  files.delete(id);
  deletedIds = [...new Set([...deletedIds, id])];
  listeners.forEach((listener) => listener());
  return true;
}

export function createLocalDocument(input: NewDocument): CreatedDocument {
  const id = `local-document-${crypto.randomUUID()}`;
  const {reviewRequired, file, ...data} = input;
  const extraction = reviewRequired ? getSimulatedExtraction(input.vendorId, input.filename, input.documentType) : null;
  const document: CreatedDocument = {
    ...data,
    id,
    status: 'review', complianceStatus: 'needs_review', reviewOutcome: 'pending', origin: 'local', globalVisible: true,
    reviewRoute: `/documents/${id}/review`,
    extractionState: extraction ? 'simulated' : 'none',
    extractedMetadata: extraction ? {...extraction} : undefined
  };
  documents = [document, ...documents];
  if (file) files.set(id, file);
  recordLocalAuditEvent(document.companyId ?? 'demo-company', {vendorId: document.vendorId, documentId: document.id, actorName: document.uploadedBy,
    eventType: 'document_upload', action: {ro: 'Document încărcat', en: 'Document uploaded'}, description: document.documentName, occurredAt: document.createdAt});
  listeners.forEach((listener) => listener());
  return document;
}

export function documentFile(companyId: string, id: string) {
  return documentAccess(companyId).visible && documents.some((item) => item.id === id && (item.companyId ?? 'demo-company') === companyId) ? files.get(id) : undefined;
}

/** The guarded domain transaction owns validation and requirement synchronization. */
export function commitDocumentVersion(previous: CreatedDocument, replacement: CreatedDocument, file: File, synchronize: () => void) {
  files.set(replacement.id, file);
  documents = [replacement, ...documents.map((item) => item.id === previous.id ? {...item, supersededById: replacement.id} : item)];
  synchronize();
  listeners.forEach((listener) => listener());
}

export function getSimulatedExtraction(vendorId: string, filename: string, type: DocumentType | '') {
  const fixture = getDocumentReviewFixture('construct-pro-tax-2024');
  if (vendorId !== fixture?.vendor.id || filename !== fixture.file.name || type !== 'tax') return null;
  return fixture.extraction.values;
}

export function toVendorDocumentRow(document: CreatedDocument, locale: 'ro' | 'en'): VendorDocumentRow {
  return {
    id: document.id,
    name: document.documentName[locale],
    issuer: document.issuer ?? '—',
    subtitle: document.issuer ?? document.filename,
    status: document.status,
    issued: document.issuedAt ? localizedDate(document.issuedAt) : null,
    expires: document.expiresAt ? localizedDate(document.expiresAt) : null,
    countdown: document.expiresAt ? expiryCountdown(document.expiresAt) : undefined,
    uploadedBy: document.uploadedBy,
    uploadedOn: localizedDate(document.uploadedAt)
  };
}

export function reviewDateToIso(value: string): string | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day) ? `${year}-${month}-${day}` : null;
}

/** Used only by the requirement/review transaction after ownership/reference validation. */
export function updateDocumentRecord(id: string, patch: Partial<CreatedDocument>, synchronize?: () => void) {
  documents = documents.map((document) => document.id === id ? {...document, ...patch} : document);
  synchronize?.();
  listeners.forEach((listener) => listener());
}

export function isoToReviewDate(value?: string | null): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}
