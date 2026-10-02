import type {DashboardViewModel} from './types';

export const dashboardFixture: DashboardViewModel = {
  user: {
    firstName: 'Andrei',
    fullName: 'Andrei Popescu',
    initials: 'AP'
  },
  organization: {name: 'Demo Company SRL'},
  notificationCount: 3,
  suppliers: {
    total: 0,
    compliant: 0,
    attention: 0,
    noncompliant: 0,
    missingDocuments: 0,
    monthlyIncrease: 3,
    percentages: {compliant: 0, attention: 0, noncompliant: 0, missingDocuments: 0}
  },
  documentsRequiringAttention: [],
  recentActivity: []
};
