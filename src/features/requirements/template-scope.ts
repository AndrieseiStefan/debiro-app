import {vendorCategories, type VendorCategory} from '@/features/vendors/types';
import type {RequirementTemplateScope} from './types';

export const requirementTemplateScopes = ['vendor', 'company', 'employee'] as const;
export function isRequirementTemplateScope(value: unknown): value is RequirementTemplateScope {
  return requirementTemplateScopes.some((scope) => scope === value);
}

/** Missing scope is the legacy vendor contract; explicit invalid values never become vendor. */
export function requirementTemplateScope(template: {scope?: unknown}): RequirementTemplateScope | null {
  return template.scope === undefined ? 'vendor' : isRequirementTemplateScope(template.scope) ? template.scope : null;
}

export function templateAppliesToTarget(template: {scope?: unknown; categoryId?: unknown}, target: RequirementTemplateScope, categoryId?: VendorCategory): boolean {
  if (!isRequirementTemplateScope(target) || requirementTemplateScope(template) !== target) return false;
  return target !== 'vendor' || (vendorCategories.includes(template.categoryId as VendorCategory) && template.categoryId === categoryId);
}
