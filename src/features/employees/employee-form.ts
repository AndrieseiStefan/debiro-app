import type {Employee, EmployeeErrors, EmployeeInput, EmployeeWorkspace} from './types';

export const normalizedEmployeeKey = (value: string) => value.trim().toLowerCase();
export function validHireDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function employeeInput(employee?: Employee): EmployeeInput {
  return employee ? {firstName: employee.firstName, lastName: employee.lastName, email: employee.email, phone: employee.phone ?? '', jobTitle: employee.jobTitle,
    department: employee.departmentId ? {kind: 'existing', id: employee.departmentId} : {kind: 'none'}, hireDate: employee.hireDate, employmentStatus: employee.employmentStatus}
    : {firstName: '', lastName: '', email: '', phone: '', jobTitle: '', department: {kind: 'none'}, hireDate: '', employmentStatus: 'active'};
}
export function validateEmployeeInput(input: EmployeeInput, workspace: EmployeeWorkspace, excludeId?: string): EmployeeErrors {
  const errors: EmployeeErrors = {};
  for (const key of ['firstName', 'lastName', 'jobTitle'] as const) {
    const value = typeof input[key] === 'string' ? input[key].trim() : '';
    if (!value) errors[key] = 'required';
    else if (value.length > (key === 'jobTitle' ? 100 : 80)) errors[key] = key === 'jobTitle' ? 'jobTitleLength' : 'nameLength';
  }
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'email';
  else if (workspace.employees.some((item) => item.id !== excludeId && normalizedEmployeeKey(item.email) === normalizedEmployeeKey(email))) errors.email = 'duplicateEmail';
  if (typeof input.phone !== 'string' || input.phone.trim().length > 32) errors.phone = 'phoneLength';
  if (!validHireDate(input.hireDate)) errors.hireDate = 'date';
  if (!['active', 'inactive'].includes(input.employmentStatus)) errors.employmentStatus = 'status';
  const department = input.department;
  if (!department || !['none', 'existing', 'new'].includes(department.kind) ||
    department.kind === 'existing' && !workspace.departments.some((item) => item.id === department.id) ||
    department.kind === 'new' && (typeof department.name !== 'string' || !department.name.trim() || department.name.trim().length > 80)) errors.department = 'department';
  return errors;
}
