import {notFound} from 'next/navigation';
import {setRequestLocale} from 'next-intl/server';
import {SupplierUploadPortalPage} from '@/features/supplier-portal/SupplierUploadPortalPage';
import {getSupplierPortalFixture} from '@/features/supplier-portal/fixtures';

export default async function SupplierUploadRoute({params}: {params: Promise<{locale: string; token: string}>}) {
  const {locale, token} = await params;
  setRequestLocale(locale);
  const view = getSupplierPortalFixture(token);
  if (!view) notFound();
  return <SupplierUploadPortalPage locale={locale} view={view} />;
}
