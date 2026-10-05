/** Small, real demo PDFs, not vendor-submitted evidence or simulated download success. */
function demoPdf(id: string, version: number) {
  // ASCII-only content keeps PDF byte offsets identical to string offsets.
  const reference = id.replace(/[\\()]/g, '\\$&');
  const content = `BT /F1 12 Tf 24 150 Td (DEBIRO demo fixture - no legal validity) Tj 0 -24 Td (Document version ${version}) Tj 0 -24 Td (${reference}) Tj ET\n`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 420 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return pdf;
}

// The domain's existing version ID remains the file reference; filenames never resolve ownership.
export function createDocumentFixtureFile({id, filename, createdAt, version = 1}: {id: string; filename: string; createdAt: string; version?: number}) {
  return new File([demoPdf(id, version)], filename, {type: 'application/pdf', lastModified: Date.parse(createdAt)});
}
