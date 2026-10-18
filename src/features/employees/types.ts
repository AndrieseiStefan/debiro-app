import type {EmployeeActivity, EmployeeDocumentWorkspace} from './employee-document-types';

export type EmploymentStatus = 'active' | 'inactive';
export type Employee = {
  id: string; companyId: string; firstName: string; lastName: string; email: string;
  phone: string | null; jobTitle: string; departmentId: string | null; hireDate: string;
  employmentStatus: EmploymentStatus; createdAt: string; updatedAt: string;
};
export type Department = {id: string; companyId: string; name: string; createdAt: string; updatedAt: string};
export type EmployeeWorkspace = {employees: Employee[]; departments: Department[]; documentWorkspaces?: Record<string, EmployeeDocumentWorkspace>; activity?: EmployeeActivity[]};
export type EmployeeState = {byCompany: Record<string, EmployeeWorkspace>};
export type DepartmentChoice = {kind: 'none'} | {kind: 'existing'; id: string} | {kind: 'new'; name: string};
export type EmployeeInput = Pick<Employee, 'firstName' | 'lastName' | 'email' | 'jobTitle' | 'hireDate' | 'employmentStatus'> & {phone: string; department: DepartmentChoice};
export type EmployeeField = keyof EmployeeInput;
export type EmployeeErrors = Partial<Record<EmployeeField, 'required' | 'nameLength' | 'email' | 'duplicateEmail' | 'phoneLength' | 'jobTitleLength' | 'date' | 'status' | 'department'>>;
export type EmployeeSort = {column: 'name' | 'jobTitle' | 'department' | 'employmentStatus'; direction: 'ascending' | 'descending'};
