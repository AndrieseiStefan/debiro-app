import type {VendorCategory, VendorListItem, VendorStatus} from './types';

export type VendorSortColumn = 'vendor' | 'category' | 'generalStatus' | 'documents' | 'nextExpiry';
export type VendorSort = {column: VendorSortColumn; direction: 'ascending' | 'descending'};

const severity: Record<VendorStatus, number> = {compliant: 0, attention: 1, noncompliant: 2};
const normalizedName = (name: string) => name.normalize('NFKC').trim().replace(/\s+/g, ' ');
const completion = (vendor: VendorListItem) => vendor.documentTarget > 0 ? vendor.documentCount / vendor.documentTarget : 0;

/** Sort filtered rows without mutating the vendor store or using formatted dates. */
export function sortVendors(vendors: VendorListItem[], sort: VendorSort | null, locale: string, categoryLabel: (category: VendorCategory) => string): VendorListItem[] {
  if (!sort) return vendors;
  const collator = new Intl.Collator(locale, {sensitivity: 'base'});
  const byName = (a: VendorListItem, b: VendorListItem) => collator.compare(normalizedName(a.name), normalizedName(b.name));
  const direction = sort.direction === 'ascending' ? 1 : -1;
  return [...vendors].sort((a, b) => {
    let primary = 0;
    switch (sort.column) {
      case 'vendor': primary = byName(a, b); break;
      case 'category': primary = collator.compare(categoryLabel(a.category), categoryLabel(b.category)); break;
      case 'generalStatus': primary = severity[a.status] - severity[b.status]; break;
      case 'documents': primary = completion(a) - completion(b); break;
      case 'nextExpiry':
        // Missing expiries remain last even when dated rows are descending.
        if (a.nextExpiry.date === null && b.nextExpiry.date !== null) return 1;
        if (a.nextExpiry.date !== null && b.nextExpiry.date === null) return -1;
        if (a.nextExpiry.date !== null && b.nextExpiry.date !== null) primary = a.nextExpiry.date.localeCompare(b.nextExpiry.date);
        break;
    }
    return primary * direction || byName(a, b) || a.id.localeCompare(b.id);
  });
}
