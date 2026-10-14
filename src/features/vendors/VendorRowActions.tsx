'use client';

import {useTranslations} from 'next-intl';
import {RowActionMenu} from '@/components/ui/RowActionMenu';
import {setVendorLifecycle} from './created-vendors';
import type {VendorListItem} from './types';

export function VendorRowActions({vendor, open, onOpenChange}: {vendor: VendorListItem; open: boolean; onOpenChange: (open: boolean) => void}) {
  const t = useTranslations('Vendors');
  return <RowActionMenu label={t('rowAction', {name: vendor.name})} open={open} onOpenChange={onOpenChange} items={[
    {label: t('openVendor'), href: `/vendors/${vendor.id}`},
    {label: t(vendor.lifecycleStatus === 'active' ? 'markInactive' : 'markActive'), onSelect: () => {setVendorLifecycle(vendor.id, vendor.lifecycleStatus === 'active' ? 'inactive' : 'active');}}
  ]}/>;
}
