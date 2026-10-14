/** Existing local audit-export download mechanics, shared with sample invoices. */
export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], {type: 'text/csv;charset=utf-8'}));
  try {
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  } finally {window.setTimeout(() => URL.revokeObjectURL(url), 0);}
}
