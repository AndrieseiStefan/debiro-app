import type {VendorsListViewModel, VendorListItem} from './types';

const vendors: VendorListItem[] = [
  {id: 'construct-pro', name: 'Construct Pro SRL', registrationNumber: 'RO12345678', contactName: 'Ion Popescu', category: 'construction', status: 'compliant', documentCount: 4, documentTarget: 5, nextExpiry: {ro: '12 ian. 2025', en: 'Jan 12, 2025', tone: 'danger'}},
  {id: 'global-clean', name: 'Global Clean Services', registrationNumber: 'RO87654321', contactName: 'Elena Marin', category: 'cleaning', status: 'attention', documentCount: 3, documentTarget: 5, nextExpiry: {ro: '28 apr. 2025', en: 'Apr 28, 2025', tone: 'warning'}},
  {id: 'tech-solutions', name: 'Tech Solutions SRL', registrationNumber: 'RO11223344', contactName: 'Radu Popa', category: 'software', status: 'compliant', documentCount: 4, documentTarget: 5, nextExpiry: {ro: '03 mai 2025', en: 'May 3, 2025', tone: 'warning'}},
  {id: 'build-more', name: 'Build & More SRL', registrationNumber: 'RO99887766', contactName: 'Ioana Dobre', category: 'materials', status: 'noncompliant', documentCount: 2, documentTarget: 5, nextExpiry: {ro: '10 feb. 2024', en: 'Feb 10, 2024', tone: 'danger'}},
  {id: 'logistics-expert', name: 'Logistics Expert', registrationNumber: 'RO55667788', contactName: 'Andrei Matei', category: 'logistics', status: 'compliant', documentCount: 5, documentTarget: 5, nextExpiry: {ro: '15 iun. 2025', en: 'Jun 15, 2025', tone: 'neutral'}},
  {id: 'green-energy', name: 'Green Energy SRL', registrationNumber: 'RO33445566', contactName: 'Maria Stan', category: 'energy', status: 'attention', documentCount: 3, documentTarget: 5, nextExpiry: {ro: '22 apr. 2025', en: 'Apr 22, 2025', tone: 'warning'}},
  {id: 'food-supplies', name: 'Food Supplies SRL', registrationNumber: 'RO77889900', contactName: 'Sorin Munteanu', category: 'food', status: 'compliant', documentCount: 4, documentTarget: 5, nextExpiry: {ro: '18 aug. 2025', en: 'Aug 18, 2025', tone: 'neutral'}},
  {id: 'medical-supplies', name: 'Medical Supplies', registrationNumber: 'RO44556677', contactName: 'Ana Tudor', category: 'medical', status: 'noncompliant', documentCount: 1, documentTarget: 5, nextExpiry: {ro: '02 feb. 2024', en: 'Feb 2, 2024', tone: 'danger'}},
  {id: 'alpha-construction', name: 'Alpha Construction SRL', registrationNumber: 'RO21436587', category: 'construction', status: 'compliant', documentCount: 5, documentTarget: 5, nextExpiry: {ro: '20 sep. 2025', en: 'Sep 20, 2025', tone: 'neutral'}},
  {id: 'nordic-software', name: 'Nordic Software SRL', registrationNumber: 'RO31245678', category: 'software', status: 'compliant', documentCount: 5, documentTarget: 5, nextExpiry: {ro: '06 oct. 2025', en: 'Oct 6, 2025', tone: 'neutral'}},
  {id: 'urban-logistics', name: 'Urban Logistics SRL', registrationNumber: 'RO42356789', category: 'logistics', status: 'compliant', documentCount: 5, documentTarget: 5, nextExpiry: {ro: '14 nov. 2025', en: 'Nov 14, 2025', tone: 'neutral'}},
  {id: 'eco-clean', name: 'Eco Clean Team SRL', registrationNumber: 'RO53467890', category: 'cleaning', status: 'attention', documentCount: 4, documentTarget: 5, nextExpiry: {ro: '09 dec. 2025', en: 'Dec 9, 2025', tone: 'warning'}},
  {id: 'terra-materials', name: 'Terra Materials SRL', registrationNumber: 'RO64578901', category: 'materials', status: 'attention', documentCount: 3, documentTarget: 5, nextExpiry: {ro: '30 mai 2025', en: 'May 30, 2025', tone: 'warning'}},
  {id: 'solar-partners', name: 'Solar Partners SRL', registrationNumber: 'RO75689012', category: 'energy', status: 'compliant', documentCount: 5, documentTarget: 5, nextExpiry: {ro: '11 dec. 2025', en: 'Dec 11, 2025', tone: 'neutral'}},
  {id: 'fresh-food', name: 'Fresh Food Distribution', registrationNumber: 'RO86790123', category: 'food', status: 'compliant', documentCount: 5, documentTarget: 5, nextExpiry: {ro: '07 ian. 2026', en: 'Jan 7, 2026', tone: 'neutral'}},
  {id: 'medica-plus', name: 'Medica Plus SRL', registrationNumber: 'RO97801234', category: 'medical', status: 'compliant', documentCount: 4, documentTarget: 5, nextExpiry: {ro: '19 feb. 2026', en: 'Feb 19, 2026', tone: 'neutral'}},
  {id: 'delta-construct', name: 'Delta Construct SRL', registrationNumber: 'RO18912345', category: 'construction', status: 'compliant', documentCount: 5, documentTarget: 5, nextExpiry: {ro: '04 mar. 2026', en: 'Mar 4, 2026', tone: 'neutral'}},
  {id: 'digital-works', name: 'Digital Works SRL', registrationNumber: 'RO29023456', category: 'software', status: 'compliant', documentCount: 5, documentTarget: 5, nextExpiry: {ro: '21 apr. 2026', en: 'Apr 21, 2026', tone: 'neutral'}},
  {id: 'rapid-cargo', name: 'Rapid Cargo SRL', registrationNumber: 'RO30134567', category: 'logistics', status: 'attention', documentCount: 3, documentTarget: 5, nextExpiry: {ro: '16 iun. 2025', en: 'Jun 16, 2025', tone: 'warning'}},
  {id: 'prime-clean', name: 'Prime Clean SRL', registrationNumber: 'RO41245679', category: 'cleaning', status: 'compliant', documentCount: 5, documentTarget: 5, nextExpiry: {ro: '03 iul. 2026', en: 'Jul 3, 2026', tone: 'neutral'}},
  {id: 'nova-energy', name: 'Nova Energy SRL', registrationNumber: 'RO52356780', category: 'energy', status: 'compliant', documentCount: 5, documentTarget: 5, nextExpiry: {ro: '29 aug. 2026', en: 'Aug 29, 2026', tone: 'neutral'}},
  {id: 'artisan-food', name: 'Artisan Food SRL', registrationNumber: 'RO63467891', category: 'food', status: 'compliant', documentCount: 4, documentTarget: 5, nextExpiry: {ro: '12 sep. 2026', en: 'Sep 12, 2026', tone: 'neutral'}},
  {id: 'clinic-equip', name: 'Clinic Equipment SRL', registrationNumber: 'RO74578902', category: 'medical', status: 'noncompliant', documentCount: 2, documentTarget: 5, nextExpiry: {ro: '17 ian. 2024', en: 'Jan 17, 2024', tone: 'danger'}},
  {id: 'steel-supply', name: 'Steel Supply SRL', registrationNumber: 'RO85689013', category: 'materials', status: 'compliant', documentCount: 5, documentTarget: 5, nextExpiry: {ro: '23 oct. 2026', en: 'Oct 23, 2026', tone: 'neutral'}}
];

export const vendorsListFixture: VendorsListViewModel = {
  user: {fullName: 'Andrei Popescu', initials: 'AP'},
  organization: {name: 'Demo Company SRL'},
  notificationCount: 3,
  vendors
};
