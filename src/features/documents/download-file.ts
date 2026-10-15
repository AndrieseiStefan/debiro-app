'use client';

/** Browser transfer only. Ownership and actual byte availability are checked by each domain caller. */
export function downloadFile(file: Blob, filename: string) {
  let url: string | undefined;
  try {
    url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename;
    anchor.click();
    return true;
  } catch {return false;}
  finally {
    const downloadUrl = url;
    if (downloadUrl) window.setTimeout(() => {
      try {URL.revokeObjectURL(downloadUrl);} catch { /* The browser may already have invalidated this temporary reference. */ }
    }, 1000);
  }
}
