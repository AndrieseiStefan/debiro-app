/** Deterministic marketing-screen values; not account credentials or persisted domain data. */
export const onboardingFixture = {
  companyName: 'Demo Company SRL',
  taxId: 'RO12345678',
  industry: 'professional',
  companySize: '11-50',
  country: 'RO',
  administratorName: 'Andrei Popescu',
  email: 'andrei.popescu@demo.ro',
  password: 'DemoSecure1!',
  acceptedTerms: true,
  constructionRequirementIds: ['registration', 'tax', 'insurance'],
  generalRequirementIds: ['registration', 'tax']
} as const;

export type OnboardingFixture = typeof onboardingFixture;
