import {getActiveCompany, getCurrentMembership, readCompanyState} from '@/features/companies/company-state';
import {getVendorState, vendorListItems} from '@/features/vendors/created-vendors';
import {getVendorRequirements, readVendorRequirements} from '@/features/vendors/vendor-requirements';
import {projectVendorDocuments} from '@/features/vendors/projections';
import {activeDocuments, readDocumentRecords, type CreatedDocument} from '@/features/documents/created-documents';
import {documentDetailsHref, documentManagementHref} from '@/features/documents/document-management';
import {documentAccess} from '@/features/documents/document-access';
import {readCompanyDocumentsState} from '@/features/company-documents/company-documents-state';
import {projectCompanyDocuments} from '@/features/company-documents/projections';
import type {CompanyDocumentListRow} from '@/features/company-documents/types';
import {employeeAccess, employeeWorkspace, readEmployeeState} from '@/features/employees/employees-state';
import {departmentName, employeeName} from '@/features/employees/projections';
import {emptyEmployeeDocuments, projectEmployeeDocuments} from '@/features/employees/employee-document-projections';
import {getRequirementsWorkspace, readRequirementsState} from '@/features/requirements/requirements-state';
import {normalizeDocumentName} from '@/features/requirements/catalog';
import type {Appearance} from '@/features/requirements/appearance';
import type {VendorCategory, VendorStatus} from '@/features/vendors/types';
import type {DocumentStatus, DocumentType} from '@/features/documents/types';

export const normalizeSearchQuery = normalizeDocumentName;
type Base = {id: string; companyId: string; title: string; subtitle: string};
export type GlobalSearchResult =
  | Base & {type: 'vendor'; status: VendorStatus; inactive: boolean}
  | Base & {type: 'document'; vendorId: string; vendorName: string; status: DocumentStatus; expiresAt: string | null}
  | Base & {type: 'requirement'; isDraft: boolean; appearance: Appearance}
  | Base & {type: 'employee'}
  | Base & {type: 'company_document' | 'employee_document'; status: CompanyDocumentListRow['status']};
export type SearchIdentity = Pick<GlobalSearchResult, 'type' | 'id' | 'companyId'>;
export function isSearchResultType(value: string | undefined): value is GlobalSearchResult['type'] {return ['vendor', 'document', 'requirement', 'company_document', 'employee', 'employee_document'].some((type) => type === value);}
export type SearchDestination = {href: string; companyDocument?: {requirementId: string; documentId: string}};
export const searchGroups = ['vendors', 'documents', 'requirements', 'companyDocuments', 'employees', 'employeeDocuments'] as const;
export type WorkspaceSearchData = {companies: ReturnType<typeof readCompanyState>; vendors: ReturnType<typeof getVendorState>; documents: CreatedDocument[]; vendorRequirements: ReturnType<typeof readVendorRequirements>; requirements: ReturnType<typeof readRequirementsState>; companyDocuments: ReturnType<typeof readCompanyDocumentsState>; employees: ReturnType<typeof readEmployeeState>};
export type SearchLabels = {categories: Record<VendorCategory, string>; documentTypes: Record<DocumentType, string>; draftTitle: string; companyDocuments: string; employeeDocuments: string};
export function readWorkspaceSearchData(): WorkspaceSearchData {
  return {companies: readCompanyState(), vendors: getVendorState(), documents: readDocumentRecords(), vendorRequirements: readVendorRequirements(), requirements: readRequirementsState(), companyDocuments: readCompanyDocumentsState(), employees: readEmployeeState()};
}
function accessibleCompany(data: WorkspaceSearchData, companyId: string) {
  const active = getActiveCompany(data.companies);
  return active?.company.id === companyId && Boolean(getCurrentMembership(active));
}
function priority(title: string, secondary: string[], query: string) {
  const name = normalizeSearchQuery(title);
  return name === query ? 0 : name.startsWith(query) ? 1 : name.includes(query) ? 2 : secondary.some((field) => normalizeSearchQuery(field).includes(query)) ? 3 : -1;
}

/** Authorization precedes even reading personnel document workspaces. Existing
 * domain projections retain validation, current-version and missing-row rules. */
function companySearchSources(data: WorkspaceSearchData, companyId: string, locale: 'ro' | 'en') {
  const companyRows = documentAccess(companyId, data.companies).visible ? projectCompanyDocuments(data.companyDocuments, companyId, locale).rows : [];
  const staff = employeeWorkspace(companyId, data.employees, data.companies);
  const employeeRows = employeeAccess(companyId, data.companies).manage ? staff.employees.flatMap((employee) => {
    const owned = staff.documentWorkspaces?.[employee.id] ?? emptyEmployeeDocuments;
    return projectEmployeeDocuments(owned, companyId, employee.id, locale).rows.map((row) => ({employee, row, owned, id: `${encodeURIComponent(employee.id)}:${encodeURIComponent(row.id)}`}));
  }) : [];
  return {companyRows, staff, employeeRows};
}

/** Pure, scoped projection of canonical stores. No fixtures, full-text/OCR, preview limit or mutation. */
export function searchWorkspace(data: WorkspaceSearchData, companyId: string, query: unknown, locale: 'ro' | 'en', labels: SearchLabels) {
  const empty = {vendors: [] as GlobalSearchResult[], documents: [] as GlobalSearchResult[], requirements: [] as GlobalSearchResult[], companyDocuments: [] as GlobalSearchResult[], employees: [] as GlobalSearchResult[], employeeDocuments: [] as GlobalSearchResult[], totalCount: 0};
  if (typeof query !== 'string' || !normalizeSearchQuery(query) || !accessibleCompany(data, companyId)) return empty;
  const needle = normalizeSearchQuery(query);
  const vendors = vendorListItems(data.vendors, companyId);
  const ownedVendorIds = new Set(vendors.map((vendor) => vendor.id));
  const workspace = getRequirementsWorkspace(data.requirements, companyId);
  const matches: {result: GlobalSearchResult; rank: number}[] = [];
  function add(result: GlobalSearchResult, secondary: string[]) {
    const rank = priority(result.title, secondary, needle);
    if (rank >= 0) matches.push({result, rank});
  }
  for (const vendor of vendors) {
    const projected = projectVendorDocuments(vendor, getVendorRequirements(data.vendorRequirements, companyId, vendor.id), data.documents, companyId);
    add({type: 'vendor', id: vendor.id, companyId, title: vendor.name, subtitle: labels.categories[vendor.category], status: projected.status, inactive: vendor.lifecycleStatus === 'inactive'}, [vendor.registrationNumber, labels.categories[vendor.category]]);
  }
  for (const document of activeDocuments(data.documents, companyId).filter((item) => ownedVendorIds.has(item.vendorId))) {
    const type = document.typeSnapshot?.name[locale] ?? labels.documentTypes[document.documentType];
    add({type: 'document', id: document.id, companyId, title: document.documentName[locale], subtitle: `${document.filename} · ${type}`, vendorId: document.vendorId, vendorName: vendors.find((vendor) => vendor.id === document.vendorId)!.name, status: document.status, expiresAt: document.expiresAt}, [document.filename, type]);
  }
  for (const template of workspace.templates.filter((item) => item.companyId === companyId)) {
    const category = template.categoryId ? labels.categories[template.categoryId] : '';
    add({type: 'requirement', id: template.id, companyId, title: template.title[locale], subtitle: template.subtitle[locale] || category, isDraft: false, appearance: template}, [template.subtitle[locale], category]);
  }
  const draft = workspace.draft;
  if (draft && [draft.name, draft.description, draft.categoryId ? labels.categories[draft.categoryId] : ''].some((field) => normalizeSearchQuery(field).includes(needle))) {
    add({type: 'requirement', id: draft.id, companyId, title: draft.name.trim() || labels.draftTitle, subtitle: draft.description || (draft.categoryId ? labels.categories[draft.categoryId] : ''), isDraft: true, appearance: draft}, [draft.description, draft.categoryId ? labels.categories[draft.categoryId] : '']);
  }
  const {companyRows, staff, employeeRows} = companySearchSources(data, companyId, locale);
  const companyName = getActiveCompany(data.companies)!.company.name;
  for (const row of companyRows) {
    const owned = data.companyDocuments.byCompany[companyId];
    const record = owned.documents.find((item) => item.id === row.currentDocumentId), requirement = owned.requirements.find((item) => item.id === row.requirementId);
    add({type: 'company_document', id: row.id, companyId, title: row.name, subtitle: `${labels.companyDocuments} · ${companyName}`, status: row.status}, [requirement?.name[locale] ?? '', labels.documentTypes[row.documentType], row.issuer ?? '', record?.filename ?? '']);
  }
  for (const employee of staff.employees) {
    const department = departmentName(staff, employee);
    add({type: 'employee', id: employee.id, companyId, title: employeeName(employee), subtitle: [employee.jobTitle, department].filter(Boolean).join(' · ')}, [employee.firstName, employee.lastName, employee.email, employee.jobTitle, department]);
  }
  for (const {employee, row, owned, id} of employeeRows) {
    const record = owned.documents.find((item) => item.id === row.currentDocumentId), requirement = owned.requirements.find((item) => item.id === row.requirementId);
    const snapshotName = requirement?.typeSnapshot?.name?.[locale];
    add({type: 'employee_document', id, companyId, title: row.name, subtitle: `${employeeName(employee)} · ${labels.employeeDocuments}`, status: row.status}, [requirement?.name[locale] ?? '', typeof snapshotName === 'string' ? snapshotName : labels.documentTypes[row.documentType], row.issuer ?? '', record?.filename ?? '', employeeName(employee)]);
  }
  const alphabetic = new Intl.Collator(locale, {sensitivity: 'base', numeric: true});
  matches.sort((a, b) => a.rank - b.rank || alphabetic.compare(a.result.title, b.result.title) || a.result.id.localeCompare(b.result.id));
  const unique = [...new Map(matches.map(({result}) => [`${result.type}:${result.id}`, result])).values()];
  return {vendors: unique.filter((item) => item.type === 'vendor'), documents: unique.filter((item) => item.type === 'document'), requirements: unique.filter((item) => item.type === 'requirement'), companyDocuments: unique.filter((item) => item.type === 'company_document'), employees: unique.filter((item) => item.type === 'employee'), employeeDocuments: unique.filter((item) => item.type === 'employee_document'), totalCount: unique.length};
}

/** Revalidate identity and permissions at activation; never trust rendered metadata or hrefs. */
export function searchResultDestination(identity: SearchIdentity, data: WorkspaceSearchData): SearchDestination | null {
  const {companyId, id, type} = identity;
  if (!accessibleCompany(data, companyId)) return null;
  const vendors = vendorListItems(data.vendors, companyId);
  if (type === 'vendor') return vendors.some((vendor) => vendor.id === id) ? {href: `/vendors/${encodeURIComponent(id)}`} : null;
  if (type === 'document') {
    const document = activeDocuments(data.documents, companyId).find((item) => item.id === id && vendors.some((vendor) => vendor.id === item.vendorId));
    if (!document) return null;
    return {href: documentAccess(companyId, data.companies).review ? documentDetailsHref(document, '/documents') : documentManagementHref(document, '/documents')};
  }
  if (type === 'requirement') {
    const workspace = getRequirementsWorkspace(data.requirements, companyId);
    return workspace.templates.some((item) => item.id === id && item.companyId === companyId) || workspace.draft?.id === id ? {href: `/requirements?template=${encodeURIComponent(id)}`} : null;
  }
  const {companyRows, staff, employeeRows} = companySearchSources(data, companyId, 'ro');
  if (type === 'company_document') {
    const row = companyRows.find((item) => item.id === id);
    return row ? {href: '/company/documents', ...(row.requirementId && row.currentDocumentId ? {companyDocument: {requirementId: row.requirementId, documentId: row.currentDocumentId}} : {})} : null;
  }
  if (type === 'employee') return staff.employees.some((item) => item.id === id) ? {href: `/company/employees/${encodeURIComponent(id)}`} : null;
  if (type === 'employee_document') {
    const found = employeeRows.find((item) => item.id === id);
    return found ? {href: `/company/employees/${encodeURIComponent(found.employee.id)}`} : null;
  }
  return null;
}

export function searchResultHref(identity: SearchIdentity, data: WorkspaceSearchData) {return searchResultDestination(identity, data)?.href ?? null;}

/** Map normalized matches back to source offsets, preserving accents/whitespace without HTML. */
export function searchHighlightParts(title: string, query: string) {
  const needle = normalizeSearchQuery(query);
  if (!needle) return [{text: title, match: false}];
  let normalized = '', offset = 0;
  const positions: {start: number; end: number}[] = [];
  for (const character of title) {
    const value = character.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
    if (!value && positions.length) positions[positions.length - 1].end += character.length;
    // indexOf reports UTF-16 offsets, so retain a source mapping for every code unit (including emoji).
    for (const part of value.split('')) {
      const space = /\s/.test(part);
      if (space && (!normalized || normalized.endsWith(' '))) {if (positions.length) positions[positions.length - 1].end = offset + character.length; continue;}
      normalized += space ? ' ' : part; positions.push({start: offset, end: offset + character.length});
    }
    offset += character.length;
  }
  const parts: {text: string; match: boolean}[] = [];
  let cursor = 0, from = 0, found: number;
  while ((found = normalized.indexOf(needle, from)) >= 0) {
    const start = positions[found].start, end = positions[found + needle.length - 1].end;
    if (start > cursor) parts.push({text: title.slice(cursor, start), match: false});
    parts.push({text: title.slice(start, end), match: true}); cursor = end; from = found + needle.length;
  }
  if (cursor < title.length) parts.push({text: title.slice(cursor), match: false});
  return parts;
}
