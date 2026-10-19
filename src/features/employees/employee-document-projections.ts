import {projectCompanyDocuments} from '@/features/company-documents/projections';
import type {CompanyDocumentListRow} from '@/features/company-documents/types';
import type {EmployeeDocumentWorkspace, EmployeeTrackingStatus} from './employee-document-types';
import type {Employee} from './types';

export const emptyEmployeeDocuments: EmployeeDocumentWorkspace = {requirements: [], documents: []};
/** Reuses the existing document validator/status engine, then adds strict employee references. */
export function projectEmployeeDocuments(workspace: EmployeeDocumentWorkspace, companyId: string, employeeId: string, locale: 'ro' | 'en', files?: ReadonlyMap<string, Blob>) {
  const result = projectCompanyDocuments({byCompany: {[companyId]: workspace}}, companyId, locale, files, undefined, 'not_required');
  if (result.error || !workspace.requirements.every((item) => item.employeeId === employeeId && Array.isArray(item.sourceTemplateIds) && item.sourceTemplateIds.every((id) => typeof id === 'string') &&
    (!item.typeSnapshot || (item.typeSnapshot.documentTypeSource === 'catalog' ? typeof item.typeSnapshot.catalogDocumentTypeId === 'string' : item.typeSnapshot.documentTypeSource === 'company' && typeof item.typeSnapshot.companyDocumentTypeId === 'string'))) ||
    !workspace.documents.every((item) => item.employeeId === employeeId && typeof item.requirementId === 'string' && Number.isInteger(item.version) && item.version > 0 && workspace.requirements.some((requirement) => requirement.id === item.requirementId) &&
      (!item.previousDocumentId || workspace.documents.some((previous) => previous.id === item.previousDocumentId && previous.requirementId === item.requirementId && previous.version < item.version)) &&
      (!item.supersededById || workspace.documents.some((next) => next.id === item.supersededById && next.requirementId === item.requirementId && next.version > item.version))) ||
    workspace.requirements.some((item) => item.currentDocumentId !== null && !workspace.documents.some((record) => record.id === item.currentDocumentId && record.requirementId === item.id)) ||
    workspace.requirements.some((item) => {const versions = workspace.documents.filter((record) => record.requirementId === item.id).map((record) => record.version); return new Set(versions).size !== versions.length;})) return {rows: [] as CompanyDocumentListRow[], error: true};
  return result;
}

export function employeeDocumentMetrics(rows: CompanyDocumentListRow[]) {
  const obligations = [...new Map(rows.map((row) => [row.requirementId ?? row.id, row])).values()];
  const required = obligations.filter((row) => row.required);
  const tracking: EmployeeTrackingStatus = !obligations.length ? 'not_configured' : required.some((row) => row.status !== 'valid') ? 'attention' : 'complete';
  const dates = obligations.flatMap((row) => row.currentDocumentId && row.expiresAt ? [row.expiresAt] : []).sort();
  return {total: obligations.length, uploaded: obligations.filter((row) => row.currentDocumentId).length, valid: obligations.filter((row) => row.status === 'valid').length,
    expiring: obligations.filter((row) => row.status === 'expiring_soon').length, missing: required.filter((row) => row.status === 'missing').length,
    tracking, nextDeadline: dates[0] ?? null};
}

export function employeeListDocumentMetrics(employees: Employee[], metrics: ReadonlyMap<string, ReturnType<typeof employeeDocumentMetrics> | null>) {
  const active = employees.filter((employee) => employee.employmentStatus === 'active').map((employee) => metrics.get(employee.id));
  return {attention: active.filter((item) => item?.tracking === 'attention').length, expiring: active.reduce((count, item) => count + (item?.expiring ?? 0), 0), error: active.some((item) => !item)};
}
