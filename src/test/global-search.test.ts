import {describe, expect, it} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {defaultAppearance} from '@/features/requirements/appearance';
import {activeDocuments} from '@/features/documents/created-documents';
import {getVendorRequirements} from '@/features/vendors/vendor-requirements';
import {projectVendorDocuments} from '@/features/vendors/projections';
import type {EmployeeDocumentRequirement, EmployeeDocumentVersion, EmployeeDocumentWorkspace} from '@/features/employees/employee-document-types';
import {normalizeSearchQuery, readWorkspaceSearchData, searchGroups, searchHighlightParts, searchResultDestination, searchResultHref, searchWorkspace, type SearchLabels, type WorkspaceSearchData} from '@/features/global-search/search-workspace';

const companyId = 'demo-company';
const labels = (language: 'ro' | 'en'): SearchLabels => ({categories: (language === 'ro' ? ro : en).Vendors.category, documentTypes: (language === 'ro' ? ro : en).Documents.documentType, draftTitle: (language === 'ro' ? ro : en).Requirements.creation.draftListTitle, companyDocuments: (language === 'ro' ? ro : en).GlobalSearch.groups.companyDocuments, employeeDocuments: (language === 'ro' ? ro : en).GlobalSearch.groups.employeeDocuments});
const snapshot = () => structuredClone(readWorkspaceSearchData());
const search = (data: WorkspaceSearchData, query: unknown, language: 'ro' | 'en' = 'ro') => searchWorkspace(data, companyId, query, language, labels(language));

describe('global workspace search normalization and highlighting', () => {
  it('normalizes case, Romanian/composed accents, whitespace and partial text', () => {
    expect(normalizeSearchQuery('  ÎNTREȚINERE\t ȘI  S\u0326ANTIER\n')).toBe('intretinere si santier');
    const data = snapshot();
    expect(search(data, '  CONSTRUCT   PRO ').vendors.map((item) => item.id)).toContain('construct-pro');
    expect(search(data, 'intretinere').requirements.length).toBeGreaterThan(0);
    expect(search(data, 'certif').documents.length).toBeGreaterThan(0);
    expect(search(data, 'certificate', 'en').documents.length).toBeGreaterThan(0);
  });

  it('maps accents and normalized spaces back to safe original fragments without losing text', () => {
    for (const [title, query, matched] of [
      ['Întreținere', 'intretinere', 'Întreținere'], ['  Certificat\t  fiscal ', 'certificat fiscal', 'Certificat\t  fiscal'],
      ['S\u0326antier S\u0326antier', 'santier', 'S\u0326antier'], ['<script>Șantier</script>', '<script>', '<script>'], ['📄 Șantier 📄', '📄', '📄']
    ]) {
      const parts = searchHighlightParts(title, query);
      expect(parts.map((part) => part.text).join('')).toBe(title);
      expect(parts.filter((part) => part.match).map((part) => part.text)).toContain(matched);
    }
    expect(searchHighlightParts('No match', 'zzz')).toEqual([{text: 'No match', match: false}]);
    expect(searchHighlightParts('Întreținere', ' ')).toEqual([{text: 'Întreținere', match: false}]);
  });

  it('returns ready/empty for invalid and whitespace-only queries without reading entity stores', () => {
    const data = snapshot();
    Object.defineProperty(data, 'vendors', {get() {throw new Error('Unexpected workspace scan');}});
    for (const query of ['', ' \n\t ', '\u0301', null, undefined, 42, {}, ['x']]) expect(search(data, query).totalCount).toBe(0);
  });
});

describe('canonical scoped result projection', () => {
  it('searches only approved vendor fields and derives the current compliance badge', () => {
    const data = snapshot();
    const vendor = data.vendors.fixtureVendors.find((item) => item.id === 'construct-pro')!;
    for (const term of [vendor.name, vendor.registrationNumber, labels('ro').categories[vendor.category]]) expect(search(data, term).vendors.map((item) => item.id)).toContain(vendor.id);
    const current = search(data, vendor.name).vendors.find((item) => item.id === vendor.id)!;
    expect(current).toMatchObject({type: 'vendor', status: projectVendorDocuments(vendor, getVendorRequirements(data.vendorRequirements, companyId, vendor.id), data.documents, companyId).status});
    data.vendors.fixtureMetadata[vendor.id] = {name: vendor.name, cui: vendor.registrationNumber, category: vendor.category, email: 'secret@example.com', contactName: 'Private Contact', industry: 'Private Industry', notes: 'Secret Notes'};
    for (const term of ['secret@example.com', 'Private Contact', 'Private Industry', 'Secret Notes']) expect(search(data, term).vendors).toEqual([]);
  });

  it('searches document title, filename and actual type, but not vendor name/content/history', () => {
    const data = snapshot();
    const document = data.documents.find((item) => item.id === 'construct-pro-fire-2024')!;
    expect(search(data, 'Autorizatie_ISU.pdf').documents.map((item) => item.id)).toEqual([document.id]);
    expect(search(data, document.documentName.ro).documents.map((item) => item.id)).toContain(document.id);
    expect(search(data, document.typeSnapshot!.name.en, 'en').documents.map((item) => item.id)).toContain(document.id);
    expect(search(data, 'Autorizatie_ISU_v1.pdf').documents).toEqual([]);
    expect(search(data, 'Construct Pro SRL').documents).toEqual([]);
    data.documents.push({...document, id: 'rejected', filename: 'rejected-needle.pdf', reviewOutcome: 'rejected'});
    expect(search(data, 'rejected-needle').totalCount).toBe(0);
    const ids = search(data, 'a').documents.map((item) => item.id);
    expect(ids.every((id) => activeDocuments(data.documents, companyId).some((item) => item.id === id))).toBe(true);
  });

  it('returns one company template, not contained rules/starters, and keeps incomplete drafts', () => {
    const data = snapshot(), workspace = data.requirements.byCompany[companyId];
    workspace.templates = [{...workspace.templates[0], title: {ro: 'Întreținere firmă', en: 'Company maintenance'}, subtitle: {ro: 'Descriere unică', en: 'Unique description'}}];
    expect(search(data, 'intretinere').requirements).toHaveLength(1);
    expect(search(data, 'descriere unica').requirements).toHaveLength(1);
    expect(search(data, labels('ro').categories[workspace.templates[0].categoryId!]).requirements).toHaveLength(1);
    expect(search(data, 'Certificat fiscal').requirements).toHaveLength(0);
    expect(search(data, 'Servicii IT').requirements).toHaveLength(0);
    workspace.draft = {id: 'draft-general', scope: 'vendor', name: 'Șablon general', description: 'Incomplete setup', categoryId: '', ...defaultAppearance, documents: [], isNew: true, isDirty: true};
    const before = structuredClone(workspace);
    expect(search(data, 'sablon general').requirements).toMatchObject([{id: 'draft-general', isDraft: true}]);
    expect(search(data, 'incomplete setup').requirements).toHaveLength(1);
    expect(searchResultHref({type: 'requirement', id: 'draft-general', companyId}, data)).toBe('/requirements?template=draft-general');
    expect(workspace).toEqual(before);
  });

  it('searches category-free scoped templates through the existing owned details route', () => {
    const data = snapshot(), workspace = data.requirements.byCompany[companyId];
    workspace.templates.push({...workspace.templates[0], id: 'company-scoped', scope: 'company', categoryId: null, title: {ro: 'Cerințe companie', en: 'Company requirements'}, subtitle: {ro: '', en: ''}});
    expect(search(data, 'Company requirements', 'en').requirements).toMatchObject([{id: 'company-scoped', subtitle: ''}]);
    expect(searchResultHref({type: 'requirement', id: 'company-scoped', companyId}, data)).toBe('/requirements?template=company-scoped');
  });

  it('uses exact/start/contains/secondary priority, alphabetical/ID ties and exposes every match', () => {
    const data = snapshot(), vendor = data.vendors.fixtureVendors[0];
    data.vendors.fixtureVendors = [
      {...vendor, id: 'tie-b', name: 'Needle Beta'}, {...vendor, id: 'secondary', name: 'Zeta', registrationNumber: 'needle'},
      {...vendor, id: 'contains', name: 'A Needle'}, {...vendor, id: 'exact', name: 'Needle'},
      {...vendor, id: 'tie-a', name: 'Needle Beta'}, {...vendor, id: 'starts', name: 'Needle Alpha'}
    ];
    expect(search(data, 'needle').vendors.map((item) => item.id)).toEqual(['exact', 'starts', 'tie-a', 'tie-b', 'contains', 'secondary']);
    data.vendors.fixtureVendors = Array.from({length: 51}, (_, index) => ({...vendor, id: `v${index}`, name: `Needle ${index}`}));
    const before = JSON.stringify(data), result = search(data, 'needle');
    expect(result.vendors).toHaveLength(51);
    expect(result.totalCount).toBe(searchGroups.reduce((count, group) => count + result[group].length, 0));
    expect(search(data, 'needle')).toEqual(result);
    expect(JSON.stringify(data)).toBe(before);
  });

  it('cannot expose foreign entities, inactive memberships, missing active company or wrong ownership', () => {
    const data = snapshot(), foreign = 'global-clean-services';
    const vendor = data.vendors.fixtureVendors[0], document = data.documents[0], template = data.requirements.byCompany[companyId].templates[0];
    data.vendors.fixtureVendors.push({...vendor, id: 'foreign-vendor', name: 'Foreign Needle', companyId: foreign});
    data.documents.push({...document, id: 'foreign-doc', documentName: {ro: 'Foreign Needle', en: 'Foreign Needle'}, companyId: foreign});
    data.requirements.byCompany[companyId].templates.push({...template, id: 'foreign-template', companyId: foreign, title: {ro: 'Foreign Needle', en: 'Foreign Needle'}});
    expect(search(data, 'foreign needle').totalCount).toBe(0);
    data.companies.activeCompanyId = foreign;
    expect(search(data, 'a').totalCount).toBe(0);
    expect(searchWorkspace(data, foreign, 'foreign needle', 'ro', labels('ro')).vendors).toMatchObject([{id: 'foreign-vendor'}]);
    expect(searchWorkspace(data, foreign, 'construct pro', 'ro', labels('ro')).totalCount).toBe(0);
    data.companies.activeCompanyId = null; expect(search(data, 'a').totalCount).toBe(0);
    data.companies.activeCompanyId = companyId;
    data.companies.companies.find((item) => item.company.id === companyId)!.members.forEach((member) => {member.status = 'invited';});
    expect(search(data, 'a').totalCount).toBe(0);
  });
});

function personnelDocuments(data: WorkspaceSearchData, index = 0) {
  const employee = data.employees.byCompany[companyId].employees[index];
  const base = data.companyDocuments.byCompany[companyId];
  const requirement: EmployeeDocumentRequirement = {...base.requirements[0], id: 'shared-rule', name: {ro: 'Fișă de aptitudine', en: 'Fitness certificate'}, employeeId: employee.id, sourceTemplateIds: [], currentDocumentId: 'shared-file'};
  const document: EmployeeDocumentVersion = {...base.documents.find((item) => item.id === 'company-document:registration')!, id: 'shared-file', requirementId: requirement.id, employeeId: employee.id, documentName: requirement.name, filename: 'personnel-current.pdf', issuer: 'Private Authority', version: 1, previousDocumentId: undefined, supersededById: undefined, reviewApplicability: 'not_required', reviewOutcome: 'not_required'};
  const owned: EmployeeDocumentWorkspace = {requirements: [requirement], documents: [document]};
  data.employees.byCompany[companyId].documentWorkspaces = {...data.employees.byCompany[companyId].documentWorkspaces, [employee.id]: owned};
  return {employee, owned, requirement, document};
}

describe('all-domain search uses existing authorized operational projections', () => {
  it.each(['ro', 'en'] as const)('matches Employee names, email, job title and department without copying or translating user data (%s)', (locale) => {
    const data = snapshot(), staff = data.employees.byCompany[companyId], employee = staff.employees[0];
    const department = staff.departments.find((item) => item.id === employee.departmentId)!;
    const before = structuredClone(data);
    for (const query of [employee.firstName, employee.lastName, `${employee.firstName} ${employee.lastName}`, employee.email, employee.jobTitle, department.name]) {
      expect(search(data, query, locale).employees.map((item) => item.id)).toContain(employee.id);
    }
    expect(search(data, employee.email, locale).employees).toMatchObject([{title: `${employee.firstName} ${employee.lastName}`, subtitle: `${employee.jobTitle} · ${department.name}`}]);
    expect(data).toEqual(before);
  });
  it('matches Company current name, requirement name, type, issuer and filename, not historical versions', () => {
    const data = snapshot(), owned = data.companyDocuments.byCompany[companyId], record = owned.documents.find((item) => item.id === 'company-document:registration')!;
    const requirement = owned.requirements.find((item) => item.currentDocumentId === record.id)!;
    record.documentName = {ro: 'Denumire actualizată', en: 'Updated name'}; record.issuer = 'Authority Needle';
    for (const query of [record.documentName.ro, requirement.name.ro, labels('ro').documentTypes[record.documentType], record.issuer, record.filename]) {
      expect(search(data, query).companyDocuments.map((item) => item.id)).toContain(requirement.id);
    }
    expect(search(data, 'registration-v1').companyDocuments).toEqual([]);
    expect(search(data, record.filename).companyDocuments).toHaveLength(1);
    expect(searchResultDestination({type: 'company_document', id: requirement.id, companyId}, data)).toEqual({href: '/company/documents', companyDocument: {requirementId: requirement.id, documentId: record.id}});
  });
  it('uses actual company names and keeps missing requirements truthful without unsupported focus URLs', () => {
    const data = snapshot(); data.companies.companies.find((item) => item.company.id === companyId)!.company.name = 'Owned Organization';
    const result = search(data, 'cazier').companyDocuments[0];
    expect(result).toMatchObject({status: 'missing', subtitle: 'Documente companie · Owned Organization'});
    expect(searchResultDestination(result, data)).toEqual({href: '/company/documents'});
  });
  it('indexes each Employee current row once, including owner/type/issuer and missing requirements, without historical metadata', () => {
    const data = snapshot(), {employee, owned, document} = personnelDocuments(data);
    for (const query of ['fisa de aptitudine', 'Private Authority', 'personnel-current.pdf', `${employee.firstName} ${employee.lastName}`, labels('ro').documentTypes[document.documentType]]) expect(search(data, query).employeeDocuments).toHaveLength(1);
    owned.documents.push({...document, id: 'rejected-history', version: 2, filename: 'forbidden-history.pdf', documentName: {ro: 'History Ghost', en: 'History Ghost'}, reviewOutcome: 'rejected'});
    expect(search(data, 'forbidden-history').employeeDocuments).toEqual([]); expect(search(data, 'History Ghost').employeeDocuments).toEqual([]);
    expect(searchResultHref(search(data, 'aptitudine').employeeDocuments[0], data)).toBe(`/company/employees/${encodeURIComponent(employee.id)}`);
    owned.documents = []; owned.requirements[0].currentDocumentId = null;
    const missing = search(data, 'aptitudine').employeeDocuments[0]; expect(missing).toMatchObject({status: 'missing'});
    expect(searchResultHref(missing, data)).toBe(`/company/employees/${encodeURIComponent(employee.id)}`);
  });
  it('keeps identical document/requirement IDs distinct across employees with deterministic identities and destinations', () => {
    const data = snapshot(), first = personnelDocuments(data), second = personnelDocuments(data, 1);
    const found = search(data, 'aptitudine').employeeDocuments;
    expect(found).toHaveLength(2); expect(new Set(found.map((item) => item.id)).size).toBe(2);
    expect(new Set(found.map((item) => searchResultHref(item, data)))).toEqual(new Set([first, second].map(({employee}) => `/company/employees/${encodeURIComponent(employee.id)}`)));
    expect(search(data, 'aptitudine').employeeDocuments).toEqual(found);
  });
  it.each(['viewer', 'reviewer'] as const)('allows directory profiles but never reads personnel document sources for %s', (role) => {
    const data = snapshot(), {employee} = personnelDocuments(data);
    data.companies.companies[0].members.find((item) => item.isCurrentUser)!.role = role;
    Object.defineProperty(data.employees.byCompany[companyId], 'documentWorkspaces', {get() {throw new Error('Private document metadata must not be read');}});
    const result = search(data, 'Private Authority'); expect(result.employeeDocuments).toEqual([]); expect(result.totalCount).toBe(0);
    expect(search(data, employee.email).employees).toHaveLength(1);
    expect(searchResultHref({type: 'employee', id: employee.id, companyId}, data)).toBe(`/company/employees/${encodeURIComponent(employee.id)}`);
    expect(searchResultHref({type: 'employee_document', id: `${encodeURIComponent(employee.id)}:shared-rule`, companyId}, data)).toBeNull();
  });
  it('refreshes Employee edits/department/status and Company document versions from the canonical snapshot', () => {
    const data = snapshot(), {employee} = personnelDocuments(data), department = data.employees.byCompany[companyId].departments[0];
    employee.firstName = 'Alexandra'; employee.jobTitle = 'Engineer Needle'; employee.departmentId = department.id; employee.employmentStatus = 'inactive';
    expect(search(data, 'Engineer Needle').employees).toMatchObject([{id: employee.id, title: `Alexandra ${employee.lastName}`}]);
    expect(search(data, department.name).employees.map((item) => item.id)).toContain(employee.id);
    const current = search(data, 'aptitudine').employeeDocuments[0]; expect(current.subtitle).toContain('Alexandra');
    const owned = data.companyDocuments.byCompany[companyId], requirement = owned.requirements[0], old = owned.documents.find((item) => item.id === requirement.currentDocumentId)!;
    const identity = {companyId, type: 'company_document' as const, id: requirement.id};
    owned.documents.push({...old, id: 'replacement-current', documentName: {ro: 'New Current Needle', en: 'New Current Needle'}, filename: 'new-current.pdf', previousDocumentId: old.id}); old.supersededById = 'replacement-current'; requirement.currentDocumentId = 'replacement-current';
    expect(search(data, 'New Current Needle').companyDocuments).toHaveLength(1);
    expect(searchResultDestination(identity, data)?.companyDocument?.documentId).toBe('replacement-current');
  });
  it('isolates malformed/foreign sources and revalidates deleted entities, current rows, roles and company switches', () => {
    const data = snapshot(), {employee, owned} = personnelDocuments(data);
    const identity = search(data, 'aptitudine').employeeDocuments[0];
    owned.documents[0].employeeId = 'another-employee'; expect(search(data, 'Private Authority').employeeDocuments).toEqual([]); expect(searchResultHref(identity, data)).toBeNull();
    data.companyDocuments.byCompany[companyId].documents[0].expiresAt = 'invalid'; expect(search(data, 'certificat').companyDocuments).toEqual([]); expect(search(data, 'Construct Pro').vendors).toHaveLength(1);
    data.employees.byCompany[companyId].employees = data.employees.byCompany[companyId].employees.filter((item) => item.id !== employee.id); expect(searchResultHref({type: 'employee', id: employee.id, companyId}, data)).toBeNull();
    data.companies.activeCompanyId = 'global-clean-services';
    expect(search(data, 'a').totalCount).toBe(0);
    expect(searchWorkspace(data, 'global-clean-services', 'Private Authority', 'ro', labels('ro')).totalCount).toBe(0);
    expect(searchResultDestination(identity, data)).toBeNull();
  });
  it('tolerates incomplete legacy type labels without parsing or inventing document metadata', () => {
    const data = snapshot(), {requirement} = personnelDocuments(data);
    requirement.typeSnapshot = {documentTypeSource: 'catalog', catalogDocumentTypeId: 'tax'} as NonNullable<typeof requirement.typeSnapshot>;
    expect(search(data, 'aptitudine').employeeDocuments).toHaveLength(1);
    expect(search(data, labels('ro').documentTypes[requirement.documentType]).employeeDocuments).toHaveLength(1);
  });
});

describe('result activation revalidates type, ownership, existence and membership', () => {
  it('reuses stable vendor, Review, Details and Requirements entry routes', () => {
    const data = snapshot();
    expect(searchResultHref({type: 'vendor', id: 'construct-pro', companyId}, data)).toBe('/vendors/construct-pro');
    for (const document of activeDocuments(data.documents, companyId)) {
      const href = searchResultHref({type: 'document', id: document.id, companyId}, data);
      expect(href).toBe(document.complianceStatus === 'needs_review' ? `/documents/${document.id}/review` : `/documents?document=${encodeURIComponent(document.id)}`);
    }
    expect(searchResultHref({type: 'requirement', id: 'software', companyId}, data)).toBe('/requirements?template=software');
  });

  it('sends Viewer pending docs to safe existing Details and Reviewer to existing Review', () => {
    const data = snapshot(), pending = data.documents.find((item) => item.complianceStatus === 'needs_review')!;
    const member = data.companies.companies.find((item) => item.company.id === companyId)!.members.find((item) => item.isCurrentUser)!;
    const identity = {type: 'document' as const, id: pending.id, companyId};
    member.role = 'viewer'; expect(searchResultHref(identity, data)).toBe(`/documents?document=${pending.id}`);
    member.role = 'reviewer'; expect(searchResultHref(identity, data)).toBe(`/documents/${pending.id}/review`);
    member.status = 'invited'; expect(searchResultHref(identity, data)).toBeNull();
  });

  it('rejects stale, superseded, rejected, mistyped and switched-company identities', () => {
    const data = snapshot();
    for (const type of ['vendor', 'document', 'requirement'] as const) expect(searchResultHref({type, id: 'missing', companyId}, data)).toBeNull();
    expect(searchResultHref({type: 'document', id: 'construct-pro', companyId}, data)).toBeNull();
    expect(searchResultHref({type: 'vendor', id: 'software', companyId}, data)).toBeNull();
    expect(searchResultHref({type: 'requirement', id: 'starter-software', companyId}, data)).toBeNull();
    expect(searchResultHref({type: 'document', id: 'construct-pro-fire-2024-v1', companyId}, data)).toBeNull();
    const document = data.documents.find((item) => item.id === 'construct-pro-fire-2024')!;
    document.reviewOutcome = 'rejected'; expect(searchResultHref({type: 'document', id: document.id, companyId}, data)).toBeNull();
    data.companies.activeCompanyId = 'global-clean-services';
    expect(searchResultHref({type: 'vendor', id: 'construct-pro', companyId}, data)).toBeNull();
    expect(searchResultHref({type: 'requirement', id: 'construction', companyId}, data)).toBeNull();
  });
});
