/** Deterministic marketing-screen values; not account credentials or persisted domain data. */
export const onboardingFixture = {
  companyName: 'Demo Company SRL',
  taxId: 'RO12345678',
  administratorName: 'Andrei Popescu',
  email: 'andrei.popescu@demo.ro',
  password: 'DemoSecure1!',
  acceptedTerms: true,
  requirementIds: ['registration', 'tax', 'insurance'],
  suppliers: [
    {id: 1, name: 'Construct Pro SRL', email: 'contact@constructpro.ro'},
    {id: 2, name: 'Global Clean Services', email: 'office@globalclean.ro'}
  ]
} as const;

export type OnboardingFixture = typeof onboardingFixture;
