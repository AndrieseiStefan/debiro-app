'use client';

import {createOwnedDocumentEngine} from '@/features/documents/owned-document-engine';
import {documentAccess} from '@/features/documents/document-access';
import {fixtureReferenceTime} from '@/lib/fixture-clock';
import {availableCompanyFile, commitCompanyDocuments, readCompanyDocumentsState} from './company-documents-state';
import {projectCompanyDocuments} from './projections';
import type {CompanyDocumentWorkspace} from './types';
export type {CompanyDocumentInput} from '@/features/documents/owned-document-engine';

const empty: CompanyDocumentWorkspace = {requirements: [], documents: []};
function engine(companyId: string) {
  return createOwnedDocumentEngine({
    scope: 'company', access: () => documentAccess(companyId), now: () => fixtureReferenceTime,
    read: (id) => {
      const snapshot = readCompanyDocumentsState();
      return id === companyId && documentAccess(id).visible && !projectCompanyDocuments(snapshot, id, 'ro').error ? snapshot.byCompany[id] ?? empty : null;
    },
    commit: commitCompanyDocuments, file: availableCompanyFile
  });
}
export const listCompanyRequirements = (...args: Parameters<ReturnType<typeof engine>['listCompanyRequirements']>) => engine(args[0]).listCompanyRequirements(...args);
export const companyDocumentHistory = (...args: Parameters<ReturnType<typeof engine>['companyDocumentHistory']>) => engine(args[0]).companyDocumentHistory(...args);
export const getCompanyDocumentDetails = (...args: Parameters<ReturnType<typeof engine>['getCompanyDocumentDetails']>) => engine(args[0]).getCompanyDocumentDetails(...args);
export const applyCompanyTemplate = (...args: Parameters<ReturnType<typeof engine>['applyCompanyTemplate']>) => engine(args[0]).applyCompanyTemplate(...args);
export const addCompanyDocument = (...args: Parameters<ReturnType<typeof engine>['addCompanyDocument']>) => engine(args[0]).addCompanyDocument(...args);
export const replaceCompanyDocument = (...args: Parameters<ReturnType<typeof engine>['replaceCompanyDocument']>) => engine(args[0]).replaceCompanyDocument(...args);
export const reviewCompanyDocument = (...args: Parameters<ReturnType<typeof engine>['reviewCompanyDocument']>) => engine(args[0]).reviewCompanyDocument(...args);
export const updateCompanyDocumentMetadata = (...args: Parameters<ReturnType<typeof engine>['updateCompanyDocumentMetadata']>) => engine(args[0]).updateCompanyDocumentMetadata(...args);
export const markCompanyDocumentExpired = (...args: Parameters<ReturnType<typeof engine>['markCompanyDocumentExpired']>) => engine(args[0]).markCompanyDocumentExpired(...args);
export const companyDocumentFile = (...args: Parameters<ReturnType<typeof engine>['companyDocumentFile']>) => engine(args[0]).companyDocumentFile(...args);
export const downloadCompanyDocument = (...args: Parameters<ReturnType<typeof engine>['downloadCompanyDocument']>) => engine(args[0]).downloadCompanyDocument(...args);
