'use client';

import {useSyncExternalStore} from 'react';
import {browserSession} from '@/lib/browser-session';
import {getActiveCompany, getCurrentMembership, managedCompany, readCompanyState} from '@/features/companies/company-state';
import {employeesFixture} from './fixtures';
import {employeeInput, normalizedEmployeeKey, validateEmployeeInput, validHireDate} from './employee-form';
import type {Department, Employee, EmployeeErrors, EmployeeInput, EmployeeWorkspace, EmploymentStatus} from './types';

const empty: EmployeeWorkspace = {employees: [], departments: []};
const session = browserSession(Symbol.for('debiro.employees-session'), () => ({state: employeesFixture, listeners: new Set<() => void>()}));
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
export function employeeWorkspace(companyId: string, state = session.state) {
  if (!employeeAccess(companyId).visible) return {...empty, error: false};
  if (!state?.byCompany || typeof state.byCompany !== 'object' || Array.isArray(state.byCompany)) return {...empty, error: true};
  const workspace = state.byCompany[companyId];
  return workspace === undefined ? {...empty, error: false} : validWorkspace(workspace, companyId) ? {...workspace, error: false} : {...empty, error: true};
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
    const next: EmployeeWorkspace = {employees: previous ? workspace.employees.map((item) => item.id === employeeId ? employee : item) : [...workspace.employees, employee],
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
