'use client';

import {useSyncExternalStore} from 'react';
import {getDocumentReviewFixture} from '@/features/document-review/fixtures';
import type {DocumentSummary, DocumentType} from './types';
import type {VendorDocumentRow} from '@/features/vendors/types';
import type {DocumentTypeSnapshot} from '@/features/requirements/document-types';

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
};

type NewDocument = Omit<CreatedDocument, 'id' | 'status' | 'reviewRoute' | 'extractionState'> & {reviewRequired: boolean};
const emptyDocuments: CreatedDocument[] = [];
let documents: CreatedDocument[] = emptyDocuments;
const listeners = new Set<() => void>();
const emptyDeletedIds: string[] = [];
let deletedIds = emptyDeletedIds;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCreatedDocuments() {
  return useSyncExternalStore(subscribe, () => documents, () => emptyDocuments);
}
export function readCreatedDocuments() {return documents;}
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
  const document: CreatedDocument = {
    ...data,
    id,
    status: reviewRequired ? 'review' : 'uploaded',
    reviewRoute: reviewRequired ? `/documents/${id}/review` : null,
    extractionState: reviewRequired ? 'simulated' : 'none'
  };
  documents = [document, ...documents];
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
    status: document.status === 'review' ? 'review' : 'uploaded',
    issued: document.issuedAt ? displayDate(document.issuedAt) : null,
    expires: document.expiresAt ? displayDate(document.expiresAt) : null,
    uploadedBy: document.uploadedBy,
    uploadedOn: displayDate(document.uploadedAt)
  };
}

export function isoToReviewDate(value?: string | null): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}
