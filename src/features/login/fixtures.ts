/** Local E1 navigation outcome, not credentials or an authenticated session. */
export const loginFixture = {successPath: '/dashboard'} as const;

export type LoginFixture = typeof loginFixture;
