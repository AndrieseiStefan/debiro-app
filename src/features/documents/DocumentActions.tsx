'use client';

import {useLocale, useTranslations} from 'next-intl';
import {useCompanyState} from '@/features/companies/company-state';
import {VendorDocumentActions} from '@/features/vendors/VendorDocumentActions';
import {documentFile, type CreatedDocument} from './created-documents';
import {documentAccess} from './document-access';
import {documentDetailsHref, documentManagementHref, downloadDocument} from './document-management';

export function DocumentActions({document, contextPath, includeVendor = false, className}: {document: CreatedDocument; contextPath: string; includeVendor?: boolean; className?: string}) {
  const t = useTranslations('DocumentManagement');
  const language = useLocale() === 'en' ? 'en' : 'ro';
  const companyId = useCompanyState().activeCompanyId ?? '';
  const actions = [
    {label: t('openDetails'), href: documentDetailsHref(document, contextPath)},
    ...(includeVendor ? [{label: t('openVendor'), href: `/vendors/${document.vendorId}`}] : []),
    {label: t('replaceAction'), href: documentManagementHref(document, contextPath, 'replace'), disabled: !documentAccess(companyId).replace},
    {label: t('historyAction'), href: documentManagementHref(document, contextPath, 'history')},
    {label: t('download'), onClick: () => downloadDocument(companyId, document.id), disabled: !documentFile(companyId, document.id)}
  ];
  return <VendorDocumentActions name={document.documentName[language]} actionLabel={t('rowActions', {name: document.documentName[language], vendor: document.vendorName})} actions={actions} className={className}/>;
}
