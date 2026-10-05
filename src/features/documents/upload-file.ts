export function uploadFileError(file: Pick<File, 'name' | 'type' | 'size'>): 'type' | 'size' | null {
  const types: Record<string, string> = {pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png'};
  const mime = types[file.name.split('.').pop()?.toLowerCase() ?? ''];
  return !mime || (file.type && file.type !== mime) ? 'type' : file.size > 10 * 1024 * 1024 ? 'size' : null;
}
