import type {AppIconName} from '@/components/layout/AppIcon';

export const appearanceIcons = ['file', 'shield', 'box', 'building', 'construction', 'tools', 'target', 'safety', 'users', 'truck', 'computer', 'briefcase'] as const;
export const appearanceColors = ['blue', 'violet', 'green', 'teal', 'orange', 'rose', 'indigo', 'slate'] as const;
export type AppearanceIconKey = typeof appearanceIcons[number];
export type AppearanceColorKey = typeof appearanceColors[number];
export type Appearance = {iconKey: AppearanceIconKey; iconColorKey: AppearanceColorKey};

export const defaultAppearance: Appearance = {iconKey: 'file', iconColorKey: 'blue'};

export function validIconKey(value: unknown): AppearanceIconKey {
  return appearanceIcons.find((key) => key === value) ?? defaultAppearance.iconKey;
}

export function validColorKey(value: unknown): AppearanceColorKey {
  return appearanceColors.find((key) => key === value) ?? defaultAppearance.iconColorKey;
}

export const iconNames: Record<AppearanceIconKey, AppIconName> = {
  file: 'file', shield: 'shield', box: 'box', building: 'building', construction: 'construction', tools: 'tools',
  target: 'target', safety: 'safety', users: 'users', truck: 'truck', computer: 'computer', briefcase: 'briefcase'
};

export function starterAppearance(icon: 'construction' | 'materials' | 'maintenance' | 'software' | 'consulting' | 'logistics'): Appearance {
  const appearances: Record<typeof icon, Appearance> = {
    construction: {iconKey: 'construction', iconColorKey: 'blue'},
    materials: {iconKey: 'box', iconColorKey: 'blue'},
    maintenance: {iconKey: 'tools', iconColorKey: 'green'},
    software: {iconKey: 'computer', iconColorKey: 'blue'},
    consulting: {iconKey: 'users', iconColorKey: 'blue'},
    logistics: {iconKey: 'truck', iconColorKey: 'blue'}
  };
  return appearances[icon];
}
