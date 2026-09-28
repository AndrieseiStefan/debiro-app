import type {CompanyMembership, CompanySettingsViewModel} from './types';

export function getCompanyMembershipSummary(view: CompanySettingsViewModel, localInvitations: CompanyMembership[]) {
  const members = [...view.members, ...localInvitations].filter((member) => member.companyId === view.company.id);
  const activeCount = members.filter((member) => member.status === 'active').length;
  const pendingCount = members.filter((member) => member.status === 'invited').length;
  return {
    members,
    activeCount,
    pendingCount,
    availableSeats: Math.max(0, view.company.subscription.seatLimit - activeCount)
  };
}
