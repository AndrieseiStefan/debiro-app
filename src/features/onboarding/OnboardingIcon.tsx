import type {ReactNode} from 'react';

type IconName = 'arrow' | 'bolt' | 'building' | 'check' | 'chevron' | 'eye' | 'eyeOff' | 'file' | 'helmet' | 'help' | 'info' | 'lock' | 'mail' | 'plus' | 'send' | 'shield' | 'trash' | 'user' | 'users';

export function OnboardingIcon({name, size = 20}: {name: IconName; size?: number}) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M4 12h16" /><path d="m14 6 6 6-6 6" /></>,
    bolt: <path d="m13 2-9 11h7l-1 9 10-12h-7V2Z" />,
    building: <><path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h1m4 0h1m-6 4h1m4 0h1M9 21v-4h6v4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
    eyeOff: <><path d="M3 3 21 21M10.6 6.1A11 11 0 0 1 12 6c6.5 0 10 6 10 6a15 15 0 0 1-3.1 3.5M6.2 7.5C3.5 9.2 2 12 2 12s3.5 6 10 6c1.6 0 3-.3 4.2-.9" /><path d="M10 10a2.8 2.8 0 0 0 4 4" /></>,
    file: <><path d="M6 2h8l4 4v16H6V2Z" /><path d="M14 2v5h4M9 12h6M9 16h6" /></>,
    helmet: <><path d="M3 17h18M5 17v-3a7 7 0 0 1 14 0v3M9 7v7m6-7v7M2 20h20" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.7 2.7 0 0 1 5.1 1.2c0 1.8-2.6 2.2-2.6 4M12 17h.01" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    plus: <path d="M12 4v16M4 12h16" />,
    send: <><path d="m22 2-7 20-4-9-9-4L22 2Z" /><path d="M11 13 22 2" /></>,
    shield: <><path d="m12 2 8 3v6c0 5-3 8-8 11-5-3-8-6-8-11V5l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6m4-6v6" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M17 5a3 3 0 0 1 0 6m0 3a5 5 0 0 1 4 6" /></>
  };

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
