import {describe, expect, it} from 'vitest';
import en from '../../messages/en.json';
import ro from '../../messages/ro.json';
import {vendorsListFixture} from '@/features/vendors/fixtures';
import {toVendorListItem} from '@/features/vendors/created-vendors';
import {sortVendors, type VendorSortColumn} from '@/features/vendors/sorting';
import type {VendorListItem} from '@/features/vendors/types';

const vendor = (id: string, name: string, overrides: Partial<VendorListItem> = {}): VendorListItem => ({...vendorsListFixture.vendors[0], id, name, ...overrides});
const names = (rows: VendorListItem[]) => rows.map((item) => item.name);

for (const locale of ['ro', 'en'] as const) {
  const categories = (locale === 'ro' ? ro : en).Vendors.category;
  const sort = (rows: VendorListItem[], column: VendorSortColumn, direction: 'ascending' | 'descending') => sortVendors(rows, {column, direction}, locale, (category) => categories[category]);

  describe(`${locale} vendor sorting`, () => {
    it('normalizes names and sorts A–Z/Z–A without mutating source rows', () => {
      const rows = [vendor('z', 'Zulu'), vendor('b', 'beta'), vendor('a', '  Alpha   Team ')];
      const original = [...rows];
      expect(names(sort(rows, 'vendor', 'ascending'))).toEqual(['  Alpha   Team ', 'beta', 'Zulu']);
      expect(names(sort(rows, 'vendor', 'descending'))).toEqual(['Zulu', 'beta', '  Alpha   Team ']);
      expect(rows).toEqual(original);
      expect(sortVendors(rows, null, locale, (category) => categories[category])).toBe(rows);
    });

    it('sorts displayed category labels, then names ascending in both directions', () => {
      const rows = [vendor('z', 'Zulu', {category: 'cleaning'}), vendor('a', 'Alpha', {category: 'cleaning'}), vendor('f', 'Food', {category: 'food'})];
      const cleaningFirst = new Intl.Collator(locale, {sensitivity: 'base'}).compare(categories.cleaning, categories.food) < 0;
      expect(names(sort(rows, 'category', 'ascending'))).toEqual(cleaningFirst ? ['Alpha', 'Zulu', 'Food'] : ['Food', 'Alpha', 'Zulu']);
      expect(names(sort(rows, 'category', 'descending'))).toEqual(cleaningFirst ? ['Food', 'Alpha', 'Zulu'] : ['Alpha', 'Zulu', 'Food']);
    });

    it('orders compliance by severity, independent of inactive lifecycle', () => {
      const rows = [vendor('n', 'Noncompliant', {status: 'noncompliant'}), vendor('z', 'Zulu', {status: 'attention'}), vendor('c', 'Compliant', {lifecycleStatus: 'inactive', status: 'compliant'}), vendor('a', 'Alpha', {status: 'attention'})];
      expect(names(sort(rows, 'generalStatus', 'ascending'))).toEqual(['Compliant', 'Alpha', 'Zulu', 'Noncompliant']);
      expect(names(sort(rows, 'generalStatus', 'descending'))).toEqual(['Noncompliant', 'Alpha', 'Zulu', 'Compliant']);
      expect(rows[2]).toMatchObject({status: 'compliant', lifecycleStatus: 'inactive'});
    });

    it('orders numerical completion ratios, treating zero required documents as zero', () => {
      const rows = [vendor('h', 'Half', {documentCount: 1, documentTarget: 2}), vendor('a', 'Alpha', {documentCount: 4, documentTarget: 8}), vendor('f', 'Full', {documentCount: 5, documentTarget: 5}), vendor('z', 'Zero', {documentCount: 0, documentTarget: 0}), vendor('l', 'Low', {documentCount: 2, documentTarget: 5})];
      expect(names(sort(rows, 'documents', 'ascending'))).toEqual(['Zero', 'Low', 'Alpha', 'Half', 'Full']);
      expect(names(sort(rows, 'documents', 'descending'))).toEqual(['Full', 'Alpha', 'Half', 'Low', 'Zero']);
    });

    it('uses ISO dates, ignoring display text and keeping missing dates last in both directions', () => {
      const expiry = (date: string | null) => ({date, ro: 'Not a date', en: 'Not a date', tone: 'neutral' as const});
      const rows = [vendor('n', 'No expiry', {nextExpiry: expiry(null)}), vendor('f', 'Future', {nextExpiry: expiry('2026-01-01')}), vendor('z', 'Zulu', {nextExpiry: expiry('2024-12-31')}), vendor('a', 'Alpha', {nextExpiry: expiry('2024-12-31')}), vendor('m', 'Missing', {nextExpiry: expiry(null)})];
      expect(names(sort(rows, 'nextExpiry', 'ascending'))).toEqual(['Alpha', 'Zulu', 'Future', 'Missing', 'No expiry']);
      expect(names(sort(rows, 'nextExpiry', 'descending'))).toEqual(['Future', 'Alpha', 'Zulu', 'Missing', 'No expiry']);
    });

    it('uses identity as a final deterministic fallback for identical normalized names', () => {
      const rows = [vendor('b', 'Ａlpha'), vendor('a', 'alpha')];
      for (const direction of ['ascending', 'descending'] as const) expect(sort(rows, 'vendor', direction).map((row) => row.id)).toEqual(['a', 'b']);
    });
  });
}

it('does not invent independent fixture expiries or local expiry values', () => {
  for (const item of vendorsListFixture.vendors) {
    expect(item.nextExpiry).toEqual({date: null, ro: '—', en: '—', tone: 'neutral'});
  }
  expect(toVendorListItem({id: 'local-sort', name: 'Local', cui: 'RO1234', category: 'software', email: 'local@example.test', lifecycleStatus: 'active'}).nextExpiry.date).toBeNull();
});
