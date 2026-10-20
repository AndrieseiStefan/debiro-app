'use client';

import {useCompanyState} from '@/features/companies/company-state';
import {useVendorState} from '@/features/vendors/created-vendors';
import {useVendorRequirements} from '@/features/vendors/vendor-requirements';
import {useDocumentRecords} from '@/features/documents/created-documents';
import {useCompanyDocumentsState} from '@/features/company-documents/company-documents-state';
import {useEmployeeState} from '@/features/employees/employees-state';
import {useLocalAuditEvents} from './local-audit';
import {notificationWorkspace} from './workspace-projections';
import {notificationsFixture} from './fixtures';
import type {NotificationsViewModel} from './types';

export function useNotificationWorkspace(locale: string, fixtures: Pick<NotificationsViewModel, 'notifications' | 'auditEvents'> = notificationsFixture) {
  const companyId = useCompanyState().activeCompanyId ?? '';
  return notificationWorkspace(companyId, locale === 'en' ? 'en' : 'ro', {vendorState: useVendorState(), requirements: useVendorRequirements(), documents: useDocumentRecords(), companyDocuments: useCompanyDocumentsState(), employees: useEmployeeState(), events: useLocalAuditEvents()}, fixtures);
}
