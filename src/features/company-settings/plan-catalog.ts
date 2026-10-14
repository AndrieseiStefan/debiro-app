/** E1 demo catalog, not final pricing or entitlement enforcement. Only existing tiers/capabilities. */
export const planCatalog = [
  {id: 'Starter', name: {ro: 'Starter', en: 'Starter'}, rank: 0, available: true, monthlyPriceEur: 0, seatLimit: 5, capabilities: {unlimitedDocuments: false, customRequirements: false, notificationsAudit: false}},
  {id: 'Professional', name: {ro: 'Professional', en: 'Professional'}, rank: 1, available: true, monthlyPriceEur: 29, seatLimit: 5, capabilities: {unlimitedDocuments: true, customRequirements: true, notificationsAudit: true}},
  {id: 'Business', name: {ro: 'Business', en: 'Business'}, rank: 2, available: true, monthlyPriceEur: 49, seatLimit: 10, capabilities: {unlimitedDocuments: true, customRequirements: true, notificationsAudit: true}}
] as const;
export type CompanyPlanId = typeof planCatalog[number]['id'];
export function companyPlan(id: string) {return planCatalog.find((plan) => plan.id === id);}
export function nextCompanyPlan(id: string) {const current = companyPlan(id); return current ? planCatalog.find((plan) => plan.available && plan.rank > current.rank) : undefined;}
export function planSubscriptionFields(id: CompanyPlanId) {
  const plan = companyPlan(id)!;
  return {plan: plan.id, monthlyPriceEur: plan.monthlyPriceEur, seatLimit: plan.seatLimit, capabilities: {...plan.capabilities}};
}
