import type {ReactNode} from 'react';

export type AppIconName =
  | 'home' | 'users' | 'file' | 'shield' | 'bell' | 'bars' | 'settings'
  | 'search' | 'chevronRight' | 'chevronDown' | 'plus' | 'target'
  | 'check' | 'clock' | 'close' | 'more' | 'calendar' | 'info'
  | 'building' | 'arrowRight' | 'userPlus' | 'fileX';

const paths: Record<AppIconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" /><path d="M9 21v-7h6v7" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  file: <><path d="M6 2h8l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" /><path d="M14 2v6h5M8 13h8M8 17h8" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="M12 4v16" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></>,
  bars: <><rect x="3" y="12" width="3" height="9" rx="1" /><rect x="10.5" y="4" width="3" height="17" rx="1" /><rect x="18" y="9" width="3" height="12" rx="1" /></>,
  settings: <><path d="M10.4 2h3.2l.6 2.6a8 8 0 0 1 1.5.9L18.2 4l2.3 2.3-1.5 2.5c.4.5.7 1 .9 1.6l2.6.6v3.2l-2.6.6a8 8 0 0 1-.9 1.5l1.5 2.5-2.3 2.3-2.5-1.5a8 8 0 0 1-1.5.9l-.6 2.6h-3.2l-.6-2.6a8 8 0 0 1-1.5-.9l-2.5 1.5-2.3-2.3 1.5-2.5a8 8 0 0 1-.9-1.5L2 14.2V11l2.6-.6a8 8 0 0 1 .9-1.6L4 6.3 6.3 4l2.5 1.5a8 8 0 0 1 1.6-.9L10.4 2Z" /><circle cx="12" cy="12.6" r="3" /></>,
  search: <><circle cx="10.5" cy="10.5" r="7" /><path d="m16 16 5 5" /></>,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  chevronDown: <path d="m5 9 7 7 7-7" />,
  plus: <path d="M12 4v16M4 12h16" />,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /><path d="m12 12 9-9" /></>,
  check: <path d="m5 12 5 5L20 7" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l4 3" /></>,
  close: <path d="M6 6 18 18M18 6 6 18" />,
  more: <><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 2v6M17 2v6M3 10h18" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  building: <><path d="M4 21V6l8-3 8 3v15M2 21h20M8 9h2M14 9h2M8 13h2M14 13h2M10 21v-4h4v4" /></>,
  arrowRight: <><path d="M4 12h16" /><path d="m14 6 6 6-6 6" /></>,
  userPlus: <><circle cx="9" cy="8" r="4" /><path d="M2 21v-2a6 6 0 0 1 12 0v2M19 8v8M15 12h8" /></>,
  fileX: <><path d="M6 2h8l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" /><path d="M14 2v6h5M9 13l6 6m0-6-6 6" /></>
};

export function AppIcon({name, size = 20, className}: {name: AppIconName; size?: number; className?: string}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
