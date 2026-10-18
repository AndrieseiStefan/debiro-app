'use client';

import {createOwnedDocumentEngine} from '@/features/documents/owned-document-engine';
import {documentIdentityKey} from '@/features/requirements/document-types';
import {catalogDocument} from '@/features/requirements/catalog';
import {commitEmployeeDocuments, employeeDocumentAccess, employeeDocumentBytes, employeeDocumentWorkspace} from './employees-state';
import type {EmployeeDocumentRequirement, EmployeeDocumentWorkspace} from './employee-document-types';
import type {DocumentManagementAdapter} from '@/features/company-documents/document-adapter';

/** Ownership/permission/storage adaptation only; lifecycle and status rules are shared. */
export function employeeDocumentEngine(companyId: string, employeeId: string) {
  return createOwnedDocumentEngine({
    scope: 'employee', access: () => employeeDocumentAccess(companyId, employeeId), now: () => new Date().toISOString(),
    read: (id) => id === companyId ? employeeDocumentWorkspace(companyId, employeeId) : null,
    commit: (id, workspace, file, _permission, event) => id === companyId && commitEmployeeDocuments(companyId, employeeId, workspace as EmployeeDocumentWorkspace, file, event),
    file: (id, documentId) => id === companyId ? employeeDocumentBytes(companyId, employeeId, documentId) : null,
    requirement: (requirement, typeSnapshot) => {
      const catalog = !typeSnapshot && catalogDocument(requirement.documentType === 'insurance' ? 'liability' : requirement.documentType);
      const snapshot = typeSnapshot ?? (catalog ? {documentTypeSource: 'catalog' as const, catalogDocumentTypeId: catalog.id, name: catalog.canonicalName, iconKey: catalog.iconKey, iconColorKey: catalog.iconColorKey} : undefined);
      return {...requirement, employeeId, typeSnapshot: snapshot, sourceTemplateIds: requirement.templateId ? [requirement.templateId] : []};
    },
    record: (record) => ({...record, employeeId}),
    findTemplateRequirement: (requirements, type, templateId, ruleId) => requirements.find((value) => {
      const item = value as EmployeeDocumentRequirement;
      return item.templateId === templateId && item.templateRequirementId === ruleId || item.typeSnapshot && documentIdentityKey(item.typeSnapshot) === documentIdentityKey(type);
    }),
    associateTemplate: (value, template) => {
      const item = value as EmployeeDocumentRequirement;
      return item.sourceTemplateIds.includes(template.id) ? item : {...item, sourceTemplateIds: [...item.sourceTemplateIds, template.id]};
    }
  });
}

export function employeeDocumentAdapter(companyId: string, employeeId: string): DocumentManagementAdapter {
  return {...employeeDocumentEngine(companyId, employeeId), scope: 'employee', access: (id) => employeeDocumentAccess(id, employeeId)};
}
