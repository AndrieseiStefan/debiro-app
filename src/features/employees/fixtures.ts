import {fixtureReferenceTime} from '@/lib/fixture-clock';
import type {EmployeeState} from './types';

const companyId = 'demo-company';
const departments = [
  ['management', 'Management'], ['hr', 'Resurse Umane'], ['finance', 'Financiar'],
  ['sales', 'Vânzări'], ['operations', 'Operațional'], ['marketing', 'Marketing'], ['it', 'IT']
].map(([id, name]) => ({id: `employee-department:${id}`, companyId, name, createdAt: fixtureReferenceTime, updatedAt: fixtureReferenceTime}));
const people = [
  ['andrei-popescu', 'Andrei', 'Popescu', 'Director General', 'management'],
  ['cristina-mihai', 'Cristina', 'Mihai', 'Specialist HR', 'hr'],
  ['vlad-ionescu', 'Vlad', 'Ionescu', 'Contabil', 'finance'],
  ['elena-stan', 'Elena', 'Stan', 'Specialist Vânzări', 'sales'],
  ['marius-radu', 'Marius', 'Radu', 'Tehnician', 'operations'],
  ['alexandra-ionescu', 'Alexandra', 'Ionescu', 'Specialist Marketing', 'marketing'],
  ['daniel-ciobanu', 'Daniel', 'Ciobanu', 'IT Support', 'it'],
  ['ioana-radu', 'Ioana', 'Radu', 'Office Manager', 'operations']
];
/** Isolated demo personnel only: no company membership, documents or compliance fixtures. */
export const employeesFixture: EmployeeState = {byCompany: {[companyId]: {departments, employees: people.map(([id, firstName, lastName, jobTitle, department]) => ({
  id: `employee:${id}`, companyId, firstName, lastName, email: `${id.replace('-', '.')}@demo.ro`, phone: null,
  jobTitle, departmentId: `employee-department:${department}`, hireDate: '2025-03-10',
  employmentStatus: id === 'marius-radu' ? 'inactive' : 'active', createdAt: fixtureReferenceTime, updatedAt: fixtureReferenceTime
}))}}};
