'use client';

import {useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {Button} from '@/components/ui/Button';
import styles from './AddDocumentDrawer.module.css';

/** Existing Add Document presentation, independent of owner, extraction, or mutation handlers. */
export function DocumentFileDropzone({file, error, onSelect}: {file: File | null; error?: string; onSelect: (file: File) => void}) {
  const t = useTranslations('AddDocument');
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return <>
    <div className={styles.dropzone} data-add-document-dropzone data-dragging={dragging || undefined} onDragEnter={(event) => {event.preventDefault(); setDragging(true);}} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => {event.preventDefault(); if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);}} onDrop={(event) => {event.preventDefault(); setDragging(false); const selected = event.dataTransfer.files[0]; if (selected) onSelect(selected);}}>
      <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png" className={styles.fileInput} aria-label={t('chooseFile')} aria-invalid={Boolean(error)} aria-describedby={error ? 'add-document-file-error' : undefined} onChange={(event) => {const selected = event.currentTarget.files?.[0]; if (selected) onSelect(selected); event.currentTarget.value = '';}}/>
      <span className={styles.uploadIcon}><AppIcon name="upload" size={29}/></span>
      {file ? <strong className={styles.filename} title={file.name}>{file.name}</strong> : <strong>{t('dropPrompt')}</strong>}
      <Button type="button" onClick={() => input.current?.click()}><AppIcon name="upload" size={18}/>{t('chooseFile')}</Button>
      <small>{file ? t('selectedSize', {size: file.size < 1024 ? `${file.size} B` : `${(file.size / 1024).toFixed(1)} KB`}) : t('fileHint')}</small>
    </div>
    {error && <p id="add-document-file-error" className={styles.error} role="alert">{error}</p>}
  </>;
}
