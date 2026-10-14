import type {VendorStatus} from './types';

/** Route entry initializes the existing page-local filter, never a second filter. */
export function vendorComplianceFilter(value?: string | string[]): VendorStatus | 'all' {
  return value === 'compliant' || value === 'attention' || value === 'noncompliant' ? value : 'all';
}
