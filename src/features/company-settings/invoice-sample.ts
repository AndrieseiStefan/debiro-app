import {getActiveCompany, getCurrentMembership, readCompanyState} from '@/features/companies/company-state';
import {csvCell} from '@/lib/csv';

/** Owner-approved local sample, never an official fiscal document or provider invoice. */
export function invoiceSample(companyId: string, invoiceId: string, locale: string) {
  const record = getActiveCompany(readCompanyState());
  if (record?.company.id !== companyId || !getCurrentMembership(record)) return null;
  const invoice = record.company.subscription.invoices.find((item) => item.id === invoiceId);
  if (!invoice) return null;
  const english = locale === 'en';
  const rows = [
    [english ? 'DEBIRO LOCAL SAMPLE — NOT AN OFFICIAL INVOICE' : 'DEBIRO EXEMPLU LOCAL — NU ESTE O FACTURĂ OFICIALĂ'],
    english ? ['Company', 'Tax ID', 'Invoice', 'Date', 'Amount', 'Currency', 'Status'] : ['Companie', 'CUI', 'Factură', 'Dată', 'Sumă', 'Monedă', 'Status'],
    [record.company.name, record.company.taxId, invoice.number, invoice.date, invoice.amountEur.toFixed(2), 'EUR', english ? 'Paid' : 'Plătită']
  ];
  return {filename: `${invoice.number}-sample.csv`, csv: rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'};
}
