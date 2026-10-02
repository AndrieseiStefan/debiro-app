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
};

export type NewDocument = Omit<CreatedDocument, 'id' | 'status' | 'reviewRoute' | 'extractionState' | 'reviewOutcome' | 'complianceStatus' | 'vendorRequirementId' | 'extractedMetadata' | 'confirmedMetadata' | 'reviewedAt' | 'reviewedBy' | 'origin' | 'globalVisible'> & {reviewRequired: boolean};
function seededDocument(summary: DocumentSummary): CreatedDocument {
  const view = getVendorDetailsFixture(summary.vendorId);
  const extraction = getDocumentReviewFixture(summary.id)?.extraction.values;
  const catalogId = summary.documentType === 'insurance' ? 'liability' : summary.documentType;
  const type = catalogDocument(catalogId);
  return {...summary, reviewRoute: summary.status === 'review' ? `/documents/${summary.id}/review` : null, companyId: 'demo-company', reviewOutcome: summary.status === 'review' ? 'pending' : 'approved',
    complianceStatus: summary.status === 'review' ? 'needs_review' : summary.status === 'expiring' ? 'expiring_soon' : summary.status,
    origin: 'fixture', globalVisible: true, fileType: 'application/pdf', fileSize: 0, uploadedBy: view?.user.fullName ?? '',
    vendorRegistrationNumber: view?.vendor.registrationNumber ?? '', vendorRegistrationCode: view?.registrationCode ?? '',
    documentNumber: extraction?.documentNumber, issuedAt: extraction ? reviewDateToIso(extraction.issuedAt) ?? undefined : undefined,
    issuer: extraction?.issuer, extractedMetadata: extraction ? {...extraction} : undefined, extractionRequested: Boolean(extraction), extractionState: extraction ? 'simulated' : 'none',
    createdAt: `${summary.uploadedAt}T12:00:00.000Z`,
    typeSnapshot: type ? {documentTypeSource: 'catalog', catalogDocumentTypeId: type.id, name: type.canonicalName, description: type.description, iconKey: type.iconKey, iconColorKey: type.iconColorKey} : undefined,
    vendorRequirementId: summary.vendorId === 'construct-pro' ? `vendor-requirement:construct-pro:${catalogId}` : undefined};
}
// Fixture documents become initial domain records, not disconnected outcome overrides.
const initialDocuments: CreatedDocument[] = documentsFixture.documents.map(seededDocument);
initialDocuments.push({...seededDocument({id: 'vendor-document:construct-pro:insurance', vendorId: 'construct-pro', vendorName: 'Construct Pro SRL',
  documentName: {ro: 'Asigurare Răspundere Civilă', en: 'Liability insurance'}, filename: 'Asigurare_ConstructPro.pdf', documentType: 'insurance', status: 'valid', uploadedAt: '2024-02-10', expiresAt: '2025-02-10', reviewRoute: null}), globalVisible: false});
let documents: CreatedDocument[] = initialDocuments;
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
  return records.filter((document) => (document.companyId ?? 'demo-company') === companyId && document.reviewOutcome !== 'rejected' && (!globalOnly || document.globalVisible));
}
export function useDeletedDocumentIds() {return useSyncExternalStore(subscribe, () => deletedIds, () => emptyDeletedIds);}
export function deleteLocalDocument(companyId: string, id: string) {
  const found = documents.find((document) => document.id === id);
  if (found && (found.companyId ?? 'demo-company') !== companyId) return false;
  if (!found && companyId !== 'demo-company') return false;
  documents = documents.filter((document) => document.id !== id);
  deletedIds = [...new Set([...deletedIds, id])];
  listeners.forEach((listener) => listener());
  return true;
}

export function createLocalDocument(input: NewDocument): CreatedDocument {
  const id = `local-document-${crypto.randomUUID()}`;
  const {reviewRequired, ...data} = input;
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
  recordLocalAuditEvent(document.companyId ?? 'demo-company', {vendorId: document.vendorId, documentId: document.id, actorName: document.uploadedBy,
    eventType: 'document_upload', action: {ro: 'Document încărcat', en: 'Document uploaded'}, description: document.documentName, occurredAt: document.createdAt});
  listeners.forEach((listener) => listener());
  return document;
}

export function getSimulatedExtraction(vendorId: string, filename: string, type: DocumentType | '') {
  const fixture = getDocumentReviewFixture('construct-pro-tax-2024');
  if (vendorId !== fixture?.vendor.id || filename !== fixture.file.name || type !== 'tax') return null;
  return fixture.extraction.values;
}

function displayDate(value: string): {ro: string; en: string} {
  const date = new Date(`${value}T12:00:00Z`);
  return {
    ro: new Intl.DateTimeFormat('ro-RO', {day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(date),
    en: new Intl.DateTimeFormat('en-US', {day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(date)
  };
}

export function toVendorDocumentRow(document: CreatedDocument, locale: 'ro' | 'en'): VendorDocumentRow {
  return {
    id: document.id,
    name: document.documentName[locale],
    issuer: document.issuer ?? '—',
    subtitle: document.issuer ?? document.filename,
    status: document.status,
    issued: document.issuedAt ? displayDate(document.issuedAt) : null,
    expires: document.expiresAt ? displayDate(document.expiresAt) : null,
    uploadedBy: document.uploadedBy,
    uploadedOn: displayDate(document.uploadedAt)
  };
}

export function reviewDateToIso(value: string): string | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day) ? `${year}-${month}-${day}` : null;
}

export function approvedCompliance(expiresAt: string | null, warningDays: number, now: string): DocumentComplianceStatus {
  if (!expiresAt) return 'valid';
  const days = (Date.parse(`${expiresAt}T00:00:00Z`) - Date.parse(`${now.slice(0, 10)}T00:00:00Z`)) / 86_400_000;
  return days < 0 ? 'expired' : days <= warningDays ? 'expiring_soon' : 'valid';
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
