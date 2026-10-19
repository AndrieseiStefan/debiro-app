export type GreetingDaypart = 'morning' | 'afternoon' | 'evening';

/** Stable presentation identifiers; all customer-facing copy lives in next-intl catalogs. */
export const dashboardGreetings = [
  {id: 'hello'}, {id: 'welcome_back'}, {id: 'good_day'}, {id: 'productive_day'},
  {id: 'good_to_see_you'}, {id: 'smooth_day'}, {id: 'steady_progress'}, {id: 'fresh_start'},
  {id: 'focus'}, {id: 'less_paperwork'}, {id: 'welcome'}, {id: 'lets_begin'},
  {id: 'important_things'}, {id: 'organized_day'}, {id: 'simple_steps'}, {id: 'nice_return'},
  {id: 'hello_there'}, {id: 'calm_day'},
  {id: 'morning', daypart: 'morning'}, {id: 'morning_start', daypart: 'morning'},
  {id: 'afternoon', daypart: 'afternoon'}, {id: 'afternoon_progress', daypart: 'afternoon'},
  {id: 'evening', daypart: 'evening'}, {id: 'quiet_evening', daypart: 'evening'}
] as const satisfies ReadonlyArray<{id: string; daypart?: GreetingDaypart}>;
export type DashboardGreetingId = typeof dashboardGreetings[number]['id'];

export function isDashboardGreetingId(value: unknown): value is DashboardGreetingId {
  return typeof value === 'string' && dashboardGreetings.some((variant) => variant.id === value);
}
export function greetingDaypart(hour: number): GreetingDaypart | undefined {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return undefined;
  return hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'evening';
}

/** Cycle from the previous session, skipping ineligible dayparts and immediate repeats. */
export function nextDashboardGreeting(previous: unknown, hour: number, exclude?: DashboardGreetingId): DashboardGreetingId {
  const start = dashboardGreetings.findIndex((variant) => variant.id === previous);
  for (let offset = 1; offset <= dashboardGreetings.length; offset++) {
    const variant = dashboardGreetings[(start + offset) % dashboardGreetings.length];
    if (variant.id !== previous && variant.id !== exclude && (!('daypart' in variant) || variant.daypart === greetingDaypart(hour))) return variant.id;
  }
  return 'hello'; // The catalog always contains multiple unrestricted variants.
}

export function greetingFirstName(profile: {firstName?: unknown; displayName?: unknown; fullName?: unknown} | null | undefined) {
  if (typeof profile?.firstName === 'string' && profile.firstName.trim()) return profile.firstName.trim();
  const display = [profile?.displayName, profile?.fullName].find((value) => typeof value === 'string' && value.trim());
  return typeof display === 'string' ? display.trim().split(/\s+/u)[0] : '';
}
