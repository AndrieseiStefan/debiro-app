'use client';

import {useEffect, useRef, useSyncExternalStore, type ReactNode} from 'react';

const subscribe = () => () => {};

/** Actual private tab-memory bytes only. No sample rendering, OCR, or stored object URL. */
export function DocumentFilePreview({file, mime, title, unavailable, unsupported, action}: {file: Blob | null; mime?: string; title: string; unavailable: string; unsupported: string; action: ReactNode}) {
  const frame = useRef<HTMLIFrameElement>(null), image = useRef<HTMLImageElement>(null), notice = useRef<HTMLParagraphElement>(null);
  const type = mime || file?.type;
  const nativePdf = useSyncExternalStore(subscribe, () => navigator.pdfViewerEnabled === true, () => false);
  useEffect(() => {
    const element = type === 'application/pdf' ? frame.current : image.current;
    if (!file || !file.size || !element || !['application/pdf', 'image/jpeg', 'image/png'].includes(type ?? '')) return;
    let url: string;
    try {url = URL.createObjectURL(new Blob([file], {type: mime || file.type}));} catch {return;}
    element.src = url; element.hidden = false; if (notice.current) notice.current.hidden = true;
    return () => {element.removeAttribute('src'); URL.revokeObjectURL(url);};
  }, [file, mime, type, nativePdf]);
  if (!file) return <p>{unavailable}</p>;
  if (type === 'application/pdf' && !nativePdf) return <div><p>{unsupported}</p>{action}</div>;
  return <div><p ref={notice}>{unsupported}</p>{type === 'application/pdf'
    // Native PDF plugins reject sandboxed frames. Only the owned, PDF-MIME-forced Blob above is
    // embedded, never an arbitrary URL/HTML document; parsing/rendering is browser-managed.
    ? <iframe ref={frame} hidden title={title} referrerPolicy="no-referrer" style={{border: 0, width: '100%', height: '60vh', minHeight: 260}}/>
    // User-selected raster content is not a Next optimized/remote image.
    // eslint-disable-next-line @next/next/no-img-element
    : <img ref={image} hidden alt={title} onError={(event) => {event.currentTarget.hidden = true; if (notice.current) notice.current.hidden = false;}} style={{maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', marginInline: 'auto'}}/>}{action}</div>;
}
