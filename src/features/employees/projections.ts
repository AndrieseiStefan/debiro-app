import {normalizeDocumentName} from '@/features/requirements/catalog';
import type {Employee, EmployeeSort, EmployeeWorkspace} from './types';

export const employeeName = (employee: Employee) => `${employee.firstName} ${employee.lastName}`;
export function departmentName(workspace: EmployeeWorkspace, employee: Employee) {return workspace.departments.find((item) => item.id === employee.departmentId)?.name ?? '';}
export function filterEmployees(workspace: EmployeeWorkspace, query: string, status: string, departmentId: string) {
  const needle = normalizeDocumentName(query);
  return workspace.employees.filter((employee) => (status === 'all' || employee.employmentStatus === status) && (departmentId === 'all' || (departmentId === 'none' ? employee.departmentId === null : employee.departmentId === departmentId)) &&
    (!needle || normalizeDocumentName(`${employeeName(employee)} ${employee.email} ${employee.jobTitle} ${departmentName(workspace, employee)}`).includes(needle)));
}
export function sortEmployees(employees: Employee[], workspace: EmployeeWorkspace, sort: EmployeeSort, locale: string) {
  const collator = new Intl.Collator(locale, {sensitivity: 'base', numeric: true});
  const value = (employee: Employee) => sort.column === 'name' ? employeeName(employee) : sort.column === 'department' ? departmentName(workspace, employee) : employee[sort.column];
  return employees.toSorted((a, b) => collator.compare(value(a), value(b)) * (sort.direction === 'ascending' ? 1 : -1) || a.id.localeCompare(b.id));
}
export function jobTitleSuggestions(workspace: EmployeeWorkspace, query: string) {
  const seen = new Set<string>(), needle = normalizeDocumentName(query);
  return workspace.employees.flatMap((employee) => {
    const key = employee.jobTitle.toLowerCase();
    if (seen.has(key) || !normalizeDocumentName(employee.jobTitle).includes(needle)) return [];
    seen.add(key); return [employee.jobTitle];
  }).sort((a, b) => a.localeCompare(b));
}
