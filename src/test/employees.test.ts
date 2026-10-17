import {afterEach, describe, expect, it, vi} from 'vitest';
import {createCompany, readCompanyState, switchActiveCompany} from '@/features/companies/company-state';
import {employeeInput, validateEmployeeInput, validHireDate} from '@/features/employees/employee-form';
import {createEmployee, employeeAccess, employeeWorkspace, getEmployee, listDepartments, listEmployees, readEmployeeState, setEmployeeStatus, updateEmployee} from '@/features/employees/employees-state';
import {departmentName, employeeName, filterEmployees, jobTitleSuggestions, sortEmployees} from '@/features/employees/projections';
import type {EmployeeInput, EmployeeState} from '@/features/employees/types';
import {readCompanyDocumentsState} from '@/features/company-documents/company-documents-state';
import {readRequirementsState} from '@/features/requirements/requirements-state';
import {readDocumentRecords} from '@/features/documents/created-documents';

const companyId = 'demo-company';
const owner = () => Reflect.get(window, Symbol.for('debiro.employees-session')) as {state: EmployeeState};
const companyOwner = () => Reflect.get(window, Symbol.for('debiro.company-session')) as {state: ReturnType<typeof readCompanyState>};
const initial = readEmployeeState(), initialCompanies = readCompanyState();
const input = (overrides: Partial<EmployeeInput> = {}): EmployeeInput => ({...employeeInput(), firstName: ' Ana ', lastName: ' Marinescu ', email: ' ana@example.test ', phone: ' +44 (0)20 1234 ext 9 ', jobTitle: ' Tehnician mentenanță ', hireDate: '2026-02-28', ...overrides});
afterEach(() => {owner().state = initial; companyOwner().state = initialCompanies; vi.restoreAllMocks();});

describe('company-owned employees and departments', () => {
  it('creates trimmed employee text, no department, no user or document side effects, and preserves state across module reinitialization', async () => {
    const companies = structuredClone(readCompanyState()), documents = structuredClone(readCompanyDocumentsState()), templates = structuredClone(readRequirementsState()), vendorDocuments = structuredClone(readDocumentRecords());
    const result = createEmployee(companyId, input()); expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.employee).toMatchObject({companyId, firstName: 'Ana', lastName: 'Marinescu', email: 'ana@example.test', phone: '+44 (0)20 1234 ext 9', jobTitle: 'Tehnician mentenanță', departmentId: null, employmentStatus: 'active'});
    expect(result.employee.createdAt).toBe(result.employee.updatedAt); expect(getEmployee(companyId, result.employee.id)).toEqual(result.employee);
    const snapshot = readEmployeeState(); vi.resetModules();
    expect((await import('@/features/employees/employees-state')).readEmployeeState()).toBe(snapshot);
    expect(readCompanyState()).toEqual(companies); expect(readCompanyDocumentsState()).toEqual(documents); expect(readRequirementsState()).toEqual(templates); expect(readDocumentRecords()).toEqual(vendorDocuments);
  });

  it('atomically creates/reuses departments without case-only duplicates or orphan records on validation/save failure', () => {
    const before = readEmployeeState();
    expect(createEmployee(companyId, input({email: 'invalid', department: {kind: 'new', name: ' Producție '}})).ok).toBe(false); expect(readEmployeeState()).toBe(before);
    const uuid = vi.spyOn(crypto, 'randomUUID').mockImplementationOnce(() => {throw new Error('unavailable');});
    expect(createEmployee(companyId, input({department: {kind: 'new', name: 'Producție'}}))).toEqual({ok: false, reason: 'save'}); expect(readEmployeeState()).toBe(before); uuid.mockRestore();
    const first = createEmployee(companyId, input({department: {kind: 'new', name: ' Producție '}})); expect(first.ok).toBe(true); if (!first.ok) return;
    const department = listDepartments(companyId).find((item) => item.id === first.employee.departmentId)!;
    expect(department).toMatchObject({companyId, name: 'Producție'});
    const count = listDepartments(companyId).length;
    const second = createEmployee(companyId, input({email: 'second@example.test', department: {kind: 'new', name: ' PRODUCȚIE '}}));
    expect(second.ok && second.employee.departmentId).toBe(department.id); expect(listDepartments(companyId)).toHaveLength(count);
    const third = createEmployee(companyId, input({email: 'third@example.test', department: {kind: 'existing', id: department.id}}));
    expect(third.ok && third.employee.departmentId).toBe(department.id);
  });

  it('rejects duplicate company emails, allows unchanged self email, and preserves identity, creation and future associations on edit/status changes', () => {
    const original = listEmployees(companyId)[0], associations = {futureDocumentIds: ['future-document']};
    owner().state = structuredClone(initial); Object.assign(owner().state.byCompany[companyId].employees[0], associations);
    const before = readEmployeeState();
    expect(createEmployee(companyId, input({email: ` ${original.email.toUpperCase()} `}))).toMatchObject({ok: false, errors: {email: 'duplicateEmail'}}); expect(readEmployeeState()).toBe(before);
    const result = updateEmployee(companyId, original.id, {...employeeInput(original), firstName: 'Updated', email: original.email.toUpperCase()}); expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.employee).toMatchObject({...associations, id: original.id, companyId, createdAt: original.createdAt, firstName: 'Updated'}); expect(listEmployees(companyId)).toHaveLength(initial.byCompany[companyId].employees.length);
    expect(setEmployeeStatus(companyId, original.id, 'inactive').ok).toBe(true); expect(getEmployee(companyId, original.id)?.employmentStatus).toBe('inactive');
    expect(setEmployeeStatus(companyId, original.id, 'active').ok).toBe(true);
  });

  it('enforces active-company membership, Administrator writes, no foreign departments, and empty newly created workspaces', () => {
    const original = listEmployees(companyId)[0], before = readEmployeeState();
    switchActiveCompany('global-clean-services'); expect(employeeAccess('global-clean-services')).toEqual({visible: true, manage: false});
    expect(listEmployees(companyId)).toEqual([]); expect(listDepartments(companyId)).toEqual([]); expect(getEmployee(companyId, original.id)).toBeNull();
    expect(createEmployee('global-clean-services', input())).toMatchObject({ok: false, reason: 'access'});
    expect(updateEmployee(companyId, original.id, input())).toMatchObject({ok: false, reason: 'access'}); expect(readEmployeeState()).toBe(before);
    const created = createCompany({name: 'Owned B', industry: 'professional', taxId: 'RO-EMPLOYEES-B', country: 'RO'}); expect(created.ok).toBe(true); if (!created.ok) return;
    expect(listEmployees(created.id)).toEqual([]); expect(listDepartments(created.id)).toEqual([]);
    expect(createEmployee(created.id, input({department: {kind: 'existing', id: initial.byCompany[companyId].departments[0].id}}))).toMatchObject({ok: false, errors: {department: 'department'}});
    expect(createEmployee(created.id, input({email: original.email})).ok).toBe(true);
    expect(updateEmployee(created.id, original.id, input())).toMatchObject({ok: false, reason: 'unavailable'});
    switchActiveCompany(companyId); expect(getEmployee(companyId, original.id)).toEqual(original); expect(listEmployees(created.id)).toEqual([]);
  });

  it('never repairs, leaks or overwrites malformed employee/department state', () => {
    for (const mutate of [
      (state: EmployeeState) => {state.byCompany[companyId].employees[0].companyId = 'foreign';},
      (state: EmployeeState) => {state.byCompany[companyId].departments[0].companyId = 'foreign';},
      (state: EmployeeState) => {state.byCompany[companyId].employees[0].hireDate = '2026-02-31';},
      (state: EmployeeState) => {state.byCompany[companyId].departments[1].name = state.byCompany[companyId].departments[0].name.toUpperCase();}
    ]) {
      const state = structuredClone(initial); mutate(state); owner().state = state;
      expect(employeeWorkspace(companyId)).toEqual({employees: [], departments: [], error: true});
      expect(createEmployee(companyId, input())).toEqual({ok: false, reason: 'unavailable'}); expect(readEmployeeState()).toBe(state);
    }
    for (const state of [null, {}, {byCompany: []}, {byCompany: {[companyId]: {employees: [null], departments: []}}}]) {
      owner().state = state as unknown as EmployeeState; expect(employeeWorkspace(companyId).error).toBe(true);
    }
  });

  it('validates required/length/calendar/status/department constraints without restrictive phone formatting', () => {
    const workspace = employeeWorkspace(companyId);
    expect(validateEmployeeInput(input(), workspace)).toEqual({});
    const errors = validateEmployeeInput(input({firstName: ' ', lastName: 'x'.repeat(81), email: 'x'.repeat(255), phone: 'x'.repeat(33), jobTitle: 'x'.repeat(101), hireDate: '2026-02-31', employmentStatus: 'bad' as 'active', department: {kind: 'new', name: ' '}}), workspace);
    expect(errors).toEqual({firstName: 'required', lastName: 'nameLength', email: 'email', phone: 'phoneLength', jobTitle: 'jobTitleLength', hireDate: 'date', employmentStatus: 'status', department: 'department'});
    expect(validHireDate('2024-02-29')).toBe(true); for (const date of ['2025-02-29', '2026-13-01', '2026-1-01', 'not-a-date']) expect(validHireDate(date)).toBe(false);
    expect(validateEmployeeInput(input({jobTitle: '', department: {kind: 'new', name: 'x'.repeat(81)}}), workspace)).toMatchObject({jobTitle: 'required', department: 'department'});
  });

  it('normalizes search across fields, composes filters, and sorts deterministically without mutating storage', () => {
    const workspace = employeeWorkspace(companyId), before = structuredClone(workspace);
    for (const query of [' andrei ', 'POPESCU', 'andrei   popescu', 'andrei.popescu@demo.ro', 'director general', 'management']) expect(filterEmployees(workspace, query, 'all', 'all').map(employeeName)).toEqual(['Andrei Popescu']);
    const operations = workspace.departments.find((item) => item.name === 'Operațional')!;
    expect(filterEmployees(workspace, 'operational', 'inactive', operations.id).map(employeeName)).toEqual(['Marius Radu']);
    expect(filterEmployees(workspace, '', 'all', 'none')).toEqual([]);
    for (const column of ['name', 'jobTitle', 'department', 'employmentStatus'] as const) for (const direction of ['ascending', 'descending'] as const) expect(sortEmployees(workspace.employees, workspace, {column, direction}, 'ro')).toHaveLength(workspace.employees.length);
    const ties = ['b', 'a'].map((id) => ({...workspace.employees[0], id})); expect(sortEmployees(ties, workspace, {column: 'name', direction: 'descending'}, 'en').map((item) => item.id)).toEqual(['a', 'b']);
    expect(jobTitleSuggestions(workspace, 'vanzari')).toEqual(['Specialist Vânzări']); expect(jobTitleSuggestions({employees: [], departments: []}, '')).toEqual([]);
    expect(departmentName(workspace, workspace.employees[0])).toBe('Management'); expect(workspace).toEqual(before);
  });
});
