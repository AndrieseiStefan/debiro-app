/** E1 browser-memory demo reference only; never overrides the runtime/global clock. */
export const fixtureReferenceTime = '2026-10-02T12:00:00.000Z';
export const fixtureReferenceDate = fixtureReferenceTime.slice(0, 10);

/** Signed UTC calendar days, independent of time-of-day, locale and DST. */
export function calendarDaysUntil(value: string, referenceTime: string = fixtureReferenceTime) {
  return (Date.parse(`${value.slice(0, 10)}T00:00:00Z`) - Date.parse(`${referenceTime.slice(0, 10)}T00:00:00Z`)) / 86_400_000;
}

export function localizedDate(value: string) {
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  const options: Intl.DateTimeFormatOptions = {day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'};
  return {ro: new Intl.DateTimeFormat('ro-RO', options).format(date), en: new Intl.DateTimeFormat('en-US', options).format(date)};
}

export function expiryCountdown(value: string, referenceTime: string = fixtureReferenceTime) {
  const days = calendarDaysUntil(value, referenceTime);
  return days < 0 ? {ro: `Acum ${-days} zile`, en: `${-days} days ago`} : {ro: `În ${days} zile`, en: `In ${days} days`};
}
