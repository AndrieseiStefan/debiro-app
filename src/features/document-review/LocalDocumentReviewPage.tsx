'use client';

import {useSyncExternalStore} from 'react';
import {useTranslations} from 'next-intl';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {EmptyState} from '@/components/ui/EmptyState';
import {Link} from '@/i18n/navigation';
import {isoToReviewDate, useCreatedDocuments} from '@/features/documents/created-documents';
import {documentsFixture} from '@/features/documents/fixtures';
import {DocumentReviewPage} from './DocumentReviewPage';
import type {DocumentReviewViewModel} from './types';

const subscribeToNothing = () => () => {};

export function LocalDocumentReviewPage({locale, documentId}: {locale: string; documentId: string}) {
  const t = useTranslations('DocumentReview');
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const document = useCreatedDocuments().find((item) => item.id === documentId && item.status === 'review');
  if (!hydrated) return null;
  if (!document) return <AuthenticatedAppShell locale={locale} currentPath={`/documents/${documentId}/review`} organizationName={documentsFixture.organization.name} userName={documentsFixture.user.fullName} userInitials={documentsFixture.user.initials} notificationCount={documentsFixture.notificationCount}><EmptyState title={t('localDocumentUnavailable')} action={<Link href="/documents">{t('backToDocuments')}</Link>}/></AuthenticatedAppShell>;
  const view: DocumentReviewViewModel = {
    id: document.id,
    source: 'demo-simulation',
    vendor: {id: document.vendorId, name: document.vendorName, registrationNumber: document.vendorRegistrationNumber, registrationCode: document.vendorRegistrationCode},
    organization: documentsFixture.organization,
    user: documentsFixture.user,
    notificationCount: documentsFixture.notificationCount,
    file: {name: document.filename, sizeLabel: document.fileSize < 1024 ? `${document.fileSize} B` : `${(document.fileSize / 1024).toFixed(1)} KB`, pageCount: null, uploadedAt: isoToReviewDate(document.uploadedAt), sourcePage: {width: 480, height: 679}},
    extraction: {confidencePercent: 0, values: {documentType: document.documentType === 'tax' ? 'tax-certificate' : 'registration-certificate', companyName: document.vendorName, documentNumber: document.documentNumber ?? '', issuedAt: isoToReviewDate(document.issuedAt), expiresAt: isoToReviewDate(document.expiresAt), issuer: document.issuer ?? ''}}
  };
  return <DocumentReviewPage locale={locale} view={view}/>;
}
