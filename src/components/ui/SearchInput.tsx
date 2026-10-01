import {type InputHTMLAttributes, type ReactNode} from 'react';
import {AppIcon} from '@/components/layout/AppIcon';
import styles from './SearchInput.module.css';

export function SearchInput({label, className, endAdornment, disabled, ...props}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {label: string; endAdornment?: ReactNode}) {
  return <div className={[styles.search, className].filter(Boolean).join(' ')} data-search-control data-disabled={disabled || undefined}>
    <AppIcon name="search" size={21}/>
    <input {...props} type="search" aria-label={label} disabled={disabled}/>
    {endAdornment}
  </div>;
}
