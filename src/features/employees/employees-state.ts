'use client';

import {useSyncExternalStore} from 'react';
import {browserSession} from '@/lib/browser-session';
import {getActiveCompany, getCurrentMembership, managedCompany, readCompanyState} from '@/features/companies/company-state';
import {employeesFixture} from './fixtures';
import {employeeInput, normalizedEmployeeKey, validateEmployeeInput, validHireDate} from './employee-form';
import {emptyEmployeeDocuments, projectEmployeeDocuments} from './employee-document-projections';
import type {EmployeeActivity, EmployeeDocumentWorkspace} from './employee-document-types';
import type {DocumentMutation} from '@/features/documents/owned-document-engine';
import type {Department, Employee, EmployeeErrors, EmployeeInput, EmployeeWorkspace, EmploymentStatus} from './types';

const empty: EmployeeWorkspace = {employees: [], departments: []};
type EmployeeSession = {state: typeof employeesFixture; listeners: Set<() => void>; files?: Map<string, Map<string, Map<string, Blob>>>};
const session = browserSession<EmployeeSession>(Symbol.for('debiro.employees-session'), () => ({state: employeesFixture, listeners: new Set<() => void>()}));
export const readEmployeeState = () => session.state;
function subscribe(listener: () => void) {session.listeners.add(listener); return () => {session.listeners.delete(listener);};}
export function useEmployeeState() {return useSyncExternalStore(subscribe, () => session.state, () => employeesFixture);}
/** Reuses active membership/company-management rules; personnel is not a document permission. */
export function employeeAccess(companyId: string, state = readCompanyState()) {
  const company = getActiveCompany(state), member = company?.company.id === companyId ? getCurrentMembership(company) : null;
  return {visible: Boolean(member), manage: member?.role === 'administrator'};
}
const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max && value === value.trim();
const timestamp = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
function validWorkspace(value: EmployeeWorkspace, companyId: string) {
  if (!value || !Array.isArray(value.employees) || !Array.isArray(value.departments)) return false;
  if (!value.departments.every((item) => item && text(item.id, 200) && item.companyId === companyId && text(item.name, 80) && timestamp(item.createdAt) && timestamp(item.updatedAt))) return false;
  const employees = value.employees, departments = value.departments;
  if (new Set(departments.map((item) => item.id)).size !== departments.length || new Set(departments.map((item) => normalizedEmployeeKey(item.name))).size !== departments.length) return false;
  if (!employees.every((item) => item && text(item.id, 200) && item.companyId === companyId && text(item.firstName, 80) && text(item.lastName, 80) && text(item.email, 254) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email) &&
    (item.phone === null || text(item.phone, 32)) && text(item.jobTitle, 100) && validHireDate(item.hireDate) && ['active', 'inactive'].includes(item.employmentStatus) &&
    (item.departmentId === null || departments.some((department) => department.id === item.departmentId)) && timestamp(item.createdAt) && timestamp(item.updatedAt))) return false;
  return new Set(employees.map((item) => item.id)).size === employees.length && new Set(employees.map((item) => normalizedEmployeeKey(item.email))).size === employees.length;
}
export function employeeWorkspace(companyId: string, state = session.state, companies = readCompanyState()) {
  if (!employeeAccess(companyId, companies).visible) return {...empty, error: false};
  if (!state?.byCompany || typeof state.byCompany !== 'object' || Array.isArray(state.byCompany)) return {...empty, error: true};
  const workspace = state.byCompany[companyId];
  if (workspace === undefined) return {...empty, error: false};
  if (!validWorkspace(workspace, companyId)) return {...empty, error: true};
  const permitted: EmployeeWorkspace = employeeAccess(companyId, companies).manage ? workspace : {employees: workspace.employees, departments: workspace.departments};
  return {...permitted, error: false};
}
export const listEmployees = (companyId: string) => employeeWorkspace(companyId).employees;
export const listDepartments = (companyId: string) => employeeWorkspace(companyId).departments;
export const getEmployee = (companyId: string, employeeId: string) => listEmployees(companyId).find((employee) => employee.id === employeeId) ?? null;
export type EmployeeResult = {ok: true; employee: Employee} | {ok: false; reason: 'access' | 'unavailable' | 'validation' | 'save'; errors?: EmployeeErrors};

/** Employee and optional inline Department are one transaction; failures publish neither. */
function saveEmployee(companyId: string, input: EmployeeInput, employeeId?: string): EmployeeResult {
  if (!managedCompany(companyId)) return {ok: false, reason: 'access'};
  const workspace = employeeWorkspace(companyId);
  if (workspace.error) return {ok: false, reason: 'unavailable'};
  const previous = employeeId ? workspace.employees.find((item) => item.id === employeeId) : undefined;
  if (employeeId && !previous) return {ok: false, reason: 'unavailable'};
  const errors = validateEmployeeInput(input, workspace, employeeId);
  if (Object.keys(errors).length) return {ok: false, reason: 'validation', errors};
  try {
    const now = new Date().toISOString();
    let department: Department | undefined;
    const choice = input.department;
    if (choice.kind === 'existing') department = workspace.departments.find((item) => item.id === choice.id);
    if (choice.kind === 'new') {
      const name = choice.name.trim();
      department = workspace.departments.find((item) => normalizedEmployeeKey(item.name) === normalizedEmployeeKey(name)) ?? {id: `employee-department:${crypto.randomUUID()}`, companyId, name, createdAt: now, updatedAt: now};
    }
    const employee: Employee = {...previous, id: previous?.id ?? `employee:${crypto.randomUUID()}`, companyId, createdAt: previous?.createdAt ?? now, updatedAt: now,
      firstName: input.firstName.trim(), lastName: input.lastName.trim(), email: input.email.trim(), phone: input.phone.trim() || null,
      jobTitle: input.jobTitle.trim(), departmentId: department?.id ?? null, hireDate: input.hireDate, employmentStatus: input.employmentStatus};
    const activity = employeeEvent(companyId, employee.id, previous ? 'employee_edited' : 'employee_created', now);
    if (workspace.activity !== undefined && !Array.isArray(workspace.activity)) return {ok: false, reason: 'unavailable'};
    const next: EmployeeWorkspace = {...(session.state.byCompany[companyId] ?? empty), activity: [...(workspace.activity ?? []), activity], employees: previous ? workspace.employees.map((item) => item.id === employeeId ? employee : item) : [...workspace.employees, employee],
      departments: department && !workspace.departments.some((item) => item.id === department.id) ? [...workspace.departments, department] : workspace.departments};
    if (!validWorkspace(next, companyId)) return {ok: false, reason: 'save'};
    session.state = {...session.state, byCompany: {...session.state.byCompany, [companyId]: next}};
    session.listeners.forEach((listener) => listener());
    return {ok: true, employee};
  } catch {return {ok: false, reason: 'save'};}
}
export function createEmployee(companyId: string, input: EmployeeInput) {return saveEmployee(companyId, input);}
export function updateEmployee(companyId: string, employeeId: string, input: EmployeeInput) {return saveEmployee(companyId, input, employeeId);}
export function setEmployeeStatus(companyId: string, employeeId: string, status: EmploymentStatus): EmployeeResult {
  const employee = getEmployee(companyId, employeeId);
  return employee ? updateEmployee(companyId, employeeId, {...employeeInput(employee), employmentStatus: status}) : {ok: false, reason: employeeAccess(companyId).manage ? 'unavailable' : 'access'};
}

function employeeEvent(companyId: string, employeeId: string, type: EmployeeActivity['type'], now: string, event?: DocumentMutation): EmployeeActivity {
  const company = managedCompany(companyId), member = company && getCurrentMembership(company);
  if (!member) throw new Error('unavailable');
  return {...event, id: `employee-event:${crypto.randomUUID()}`, companyId, employeeId, type, occurredAt: now, actorId: member.userId ?? member.id, actorName: member.fullName};
}
export function employeeDocumentAccess(companyId: string, employeeId: string) {
  const company = managedCompany(companyId), member = company && getCurrentMembership(company), visible = Boolean(member && getEmployee(companyId, employeeId));
  return {visible, replace: visible, review: false, member: visible ? member : null};
}
export function employeeDocumentWorkspace(companyId: string, employeeId: string, snapshot = session.state) {
  if (!employeeDocumentAccess(companyId, employeeId).visible) return null;
  const workspace = employeeWorkspace(companyId, snapshot);
  if (workspace.error || workspace.documentWorkspaces !== undefined && (!workspace.documentWorkspaces || typeof workspace.documentWorkspaces !== 'object' || Array.isArray(workspace.documentWorkspaces))) return null;
  const stored = workspace.documentWorkspaces?.[employeeId];
  const documents = stored === undefined ? emptyEmployeeDocuments : stored;
  return projectEmployeeDocuments(documents, companyId, employeeId, 'ro').error ? null : documents;
}
export function commitEmployeeDocuments(companyId: string, employeeId: string, documents: EmployeeDocumentWorkspace, file?: {id: string; bytes: File}, event?: DocumentMutation) {
  if (!employeeDocumentAccess(companyId, employeeId).replace || !employeeDocumentWorkspace(companyId, employeeId) || projectEmployeeDocuments(documents, companyId, employeeId, 'ro').error) return false;
  const workspace = employeeWorkspace(companyId);
  if (workspace.activity !== undefined && !Array.isArray(workspace.activity) || session.files !== undefined && !(session.files instanceof Map)) return false;
  if (file && (!(file.bytes instanceof File) || !file.bytes.size || !documents.documents.some((item) => item.id === file.id))) return false;
  const files = new Map(session.files), owned = files.get(companyId);
  if (owned !== undefined && !(owned instanceof Map)) return false;
  const employeeFiles = owned?.get(employeeId);
  if (employeeFiles !== undefined && !(employeeFiles instanceof Map)) return false;
  const activity = event ? employeeEvent(companyId, employeeId, event.type, new Date().toISOString(), event) : null;
  if (file) files.set(companyId, new Map([...(owned ?? []), [employeeId, new Map([...(employeeFiles ?? []), [file.id, file.bytes]])]]));
  const next = {...session.state.byCompany[companyId], documentWorkspaces: {...workspace.documentWorkspaces, [employeeId]: documents}, activity: [...(workspace.activity ?? []), ...(activity ? [activity] : [])]};
  session.files = files; session.state = {...session.state, byCompany: {...session.state.byCompany, [companyId]: next}};
  session.listeners.forEach((notify) => notify()); return true;
}
export function employeeDocumentBytes(companyId: string, employeeId: string, documentId: string) {
  const workspace = employeeDocumentWorkspace(companyId, employeeId);
  if (!workspace?.documents.some((item) => item.id === documentId)) return null;
  const company = session.files instanceof Map ? session.files.get(companyId) : null, files = company instanceof Map ? company.get(employeeId) : null;
  const file = files instanceof Map ? files.get(documentId) : null;
  return file instanceof Blob && file.size > 0 ? file : null;
}
export function companyEmployeeActivity(companyId: string, snapshot = session.state) {
  if (!employeeAccess(companyId).manage) return [];
  const events = employeeWorkspace(companyId, snapshot).activity;
  return Array.isArray(events) ? events.filter((event) => event && event.companyId === companyId && typeof event.employeeId === 'string' && typeof event.id === 'string' && typeof event.actorName === 'string' &&
    ['employee_created', 'employee_edited', 'template_applied', 'document_upload', 'document_replaced', 'document_confirmed', 'document_rejected', 'metadata_updated', 'document_marked_expired'].includes(event.type) && typeof event.occurredAt === 'string' && Number.isFinite(Date.parse(event.occurredAt)))
    .toSorted((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id)) : [];
}
export function getEmployeeActivity(companyId: string, employeeId: string) {
  return employeeDocumentAccess(companyId, employeeId).visible ? companyEmployeeActivity(companyId).filter((event) => event.employeeId === employeeId) : [];
}
