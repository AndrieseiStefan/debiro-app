/** Deterministic marketing-screen values; not account credentials or persisted domain data. */
export const onboardingFixture = {
  companyName: 'Demo Company SRL',
  taxId: 'RO12345678',
  administratorName: 'Andrei Popescu',
  email: 'andrei.popescu@demo.ro',
  password: 'DemoSecure1!',
  acceptedTerms: true
} as const;

export type OnboardingFixture = typeof onboardingFixture;
