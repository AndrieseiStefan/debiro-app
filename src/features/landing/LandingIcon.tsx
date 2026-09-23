import type {ReactNode} from 'react';

export type IconName = 'arrow' | 'chevron' | 'play' | 'check' | 'users' | 'file' | 'bell' | 'chart' | 'shield' | 'gear' | 'plus' | 'search' | 'target' | 'tag' | 'heart' | 'clock' | 'home';

export function LandingIcon({name, size = 18}: {name: IconName; size?: number}) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M4 12h16" /><path d="m14 6 6 6-6 6" /></>,
    chevron: <path d="m6 9 6 6 6-6" />,
    play: <path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none" />,
    check: <path d="m5 12 4 4L19 6" />,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 19v-2a6 6 0 0 1 12 0v2H3Z" /><path d="M17 6a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 4" /></>,
    file: <><path d="M6 2h8l4 4v16H6V2Z" /><path d="M14 2v5h4M9 12h6M9 16h6" /></>,
    bell: <><path d="M5 18h14l-2-3V9a5 5 0 0 0-10 0v6l-2 3Z" /><path d="M10 21h4" /></>,
    chart: <><path d="M4 20V12m5 8V7m5 13v-9m5 9V4" /></>,
    shield: <><path d="m12 2 8 3v6c0 5-3 8-8 11-5-3-8-6-8-11V5l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    tag: <><path d="M3 12 12 3h8v8l-9 9-8-8Z" /><circle cx="17" cy="7" r="1" /></>,
    heart: <path d="M20.8 8.4c0 4.1-8.8 11-8.8 11s-8.8-6.9-8.8-11a5 5 0 0 1 8.8-3.1 5 5 0 0 1 8.8 3.1Z" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></>,
    home: <><path d="m3 11 9-8 9 8v10H3V11Z" /><path d="M9 21v-7h6v7" /></>
  };

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
